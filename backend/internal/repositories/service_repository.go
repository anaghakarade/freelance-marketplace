package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

// ServiceFilter holds all supported query filters for services
type ServiceFilter struct {
	CategorySlug      string
	SubcategorySlug   string
	TrendingGroupSlug string
	IsFeatured        *bool
	IsTrending        *bool
	MinRating         *float64
	MinPrice          *float64
	MaxPrice          *float64
	Search            string
	SortBy            string // "rating", "price", "price_desc", "newest", "orders"
	Limit             int
	Offset            int
}

// ServiceRepository defines database operations for services and packages
type ServiceRepository interface {
	GetAll(ctx context.Context, f ServiceFilter) ([]models.Service, error)
	GetByID(ctx context.Context, id string) (*models.Service, error)
	GetByIDWithStatus(ctx context.Context, id string) (*models.Service, error)
	GetBySellerID(ctx context.Context, sellerID string, status string, limit int, offset int) ([]models.Service, int, error)
	Create(ctx context.Context, s *models.Service, packages []models.ServicePackage) (*models.Service, error)
	Update(ctx context.Context, s *models.Service, packages []models.ServicePackage, updatePackages bool) (*models.Service, error)
	Publish(ctx context.Context, id string) error
	Archive(ctx context.Context, id string) error
	Delete(ctx context.Context, id string) error
	CheckOwnership(ctx context.Context, serviceID string, sellerID string) (bool, *models.Service, error)
}

type serviceRepository struct {
	db *database.DBWrapper
}

// NewServiceRepository creates a new instance of ServiceRepository
func NewServiceRepository(db *database.DBWrapper) ServiceRepository {
	return &serviceRepository{db: db}
}

// GetAll retrieves a list of services with optional filters and pagination.
// Public marketplace queries strictly require status = 'published'.
// All SQL is parameterized — no unsafe string concatenation.
func (r *serviceRepository) GetAll(ctx context.Context, f ServiceFilter) ([]models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 20
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	// Build WHERE clauses dynamically using parameterized placeholders
	where := []string{"s.status = 'published'"}
	args := []interface{}{}
	idx := 1

	if f.CategorySlug != "" {
		where = append(where, fmt.Sprintf("s.category_slug = $%d", idx))
		args = append(args, f.CategorySlug)
		idx++
	}
	if f.SubcategorySlug != "" {
		where = append(where, fmt.Sprintf("s.subcategory_slug = $%d", idx))
		args = append(args, f.SubcategorySlug)
		idx++
	}
	if f.TrendingGroupSlug != "" {
		where = append(where, fmt.Sprintf("s.id IN (SELECT tgs.service_id FROM trending_group_services tgs JOIN trending_groups tg ON tgs.trending_group_id = tg.id WHERE tg.slug = $%d)", idx))
		args = append(args, f.TrendingGroupSlug)
		idx++
	}
	if f.IsFeatured != nil {
		where = append(where, fmt.Sprintf("s.is_featured = $%d", idx))
		args = append(args, *f.IsFeatured)
		idx++
	}
	if f.IsTrending != nil {
		where = append(where, fmt.Sprintf("s.is_trending = $%d", idx))
		args = append(args, *f.IsTrending)
		idx++
	}
	if f.MinRating != nil {
		where = append(where, fmt.Sprintf("s.rating >= $%d", idx))
		args = append(args, *f.MinRating)
		idx++
	}
	if f.MaxPrice != nil {
		where = append(where, fmt.Sprintf("s.starting_price <= $%d", idx))
		args = append(args, *f.MaxPrice)
		idx++
	}
	if f.MinPrice != nil {
		where = append(where, fmt.Sprintf("s.starting_price >= $%d", idx))
		args = append(args, *f.MinPrice)
		idx++
	}
	if f.Search != "" {
		// Safe full-text search across title, description, tags using ILIKE
		where = append(where, fmt.Sprintf(
			"(s.title ILIKE $%d OR s.description ILIKE $%d OR s.tags::text ILIKE $%d)",
			idx, idx, idx,
		))
		args = append(args, "%"+f.Search+"%")
		idx++
	}

	// ORDER BY
	orderBy := "s.is_featured DESC, s.rating DESC, s.created_at DESC"
	switch strings.ToLower(f.SortBy) {
	case "rating":
		orderBy = "s.rating DESC, s.review_count DESC"
	case "price":
		orderBy = "s.starting_price ASC"
	case "price_desc":
		orderBy = "s.starting_price DESC"
	case "newest":
		orderBy = "s.created_at DESC"
	case "orders":
		orderBy = "s.order_count DESC"
	}

	whereSQL := strings.Join(where, " AND ")

	query := fmt.Sprintf(`
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images, s.description, s.tags,
		       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
		       s.order_count, s.created_at, s.updated_at, s.published_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.role, ''), COALESCE(u.account_type, ''), COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), COALESCE(u.rating, 0),
		       COALESCE(u.reviews_count, 0)
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d;
	`, whereSQL, orderBy, idx, idx+1)

	args = append(args, f.Limit, f.Offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query services: %w", err)
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		var tagIDsJSON, galleryImagesJSON, tagsJSON []byte
		var u models.User
		var pubAt sql.NullTime

		if err := rows.Scan(
			&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
			&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
			&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryImagesJSON, &s.Description, &tagsJSON,
			&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
			&s.OrderCount, &s.CreatedAt, &s.UpdatedAt, &pubAt,
			&u.ID, &u.Name, &u.Email, &u.Role, &u.AccountType, &u.Avatar,
			&u.Title, &u.Location, &u.Rating, &u.ReviewsCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan service row: %w", err)
		}

		if pubAt.Valid {
			s.PublishedAt = &pubAt.Time
		}
		s.ImageURL = s.CoverImage

		_ = json.Unmarshal(tagIDsJSON, &s.TagIDs)
		_ = json.Unmarshal(galleryImagesJSON, &s.GalleryImages)
		_ = json.Unmarshal(tagsJSON, &s.Tags)
		if u.ID != "" {
			s.Seller = &u
		}

		services = append(services, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return services, nil
}

// GetByID retrieves a single published service by ID
func (r *serviceRepository) GetByID(ctx context.Context, id string) (*models.Service, error) {
	return r.getByIDInternal(ctx, id, true)
}

// GetByIDWithStatus retrieves a single service regardless of status (for seller/admin ownership checks)
func (r *serviceRepository) GetByIDWithStatus(ctx context.Context, id string) (*models.Service, error) {
	return r.getByIDInternal(ctx, id, false)
}

func (r *serviceRepository) getByIDInternal(ctx context.Context, id string, publishedOnly bool) (*models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images, s.description, s.tags,
		       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
		       s.order_count, s.created_at, s.updated_at, s.published_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.role, ''), COALESCE(u.account_type, ''), COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), COALESCE(u.rating, 0),
		       COALESCE(u.reviews_count, 0),
		       COALESCE(u.about, ''), COALESCE(u.skills, '[]'::jsonb)::text,
		       COALESCE(u.languages, '[]'::jsonb)::text,
		       COALESCE(u.completed_projects, 0), COALESCE(u.starting_price, 0)
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		WHERE (s.id = $1 OR s.id = $2)
	`

	if publishedOnly {
		query += " AND s.status = 'published'"
	}

	prefixed := "srv_" + id
	if strings.HasPrefix(id, "srv_") {
		prefixed = id
		id = strings.TrimPrefix(id, "srv_")
	}

	var s models.Service
	var tagIDsJSON, galleryImagesJSON, tagsJSON []byte
	var u models.User
	var uSkillsJSON, uLangsJSON string
	var pubAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id, prefixed).Scan(
		&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
		&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
		&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryImagesJSON, &s.Description, &tagsJSON,
		&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
		&s.OrderCount, &s.CreatedAt, &s.UpdatedAt, &pubAt,
		&u.ID, &u.Name, &u.Email, &u.Role, &u.AccountType, &u.Avatar,
		&u.Title, &u.Location, &u.Rating, &u.ReviewsCount,
		&u.About, &uSkillsJSON, &uLangsJSON,
		&u.CompletedProjects, &u.StartingPrice,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // not found
		}
		return nil, fmt.Errorf("failed to query service by id: %w", err)
	}

	if pubAt.Valid {
		s.PublishedAt = &pubAt.Time
	}
	s.ImageURL = s.CoverImage

	_ = json.Unmarshal(tagIDsJSON, &s.TagIDs)
	_ = json.Unmarshal(galleryImagesJSON, &s.GalleryImages)
	_ = json.Unmarshal(tagsJSON, &s.Tags)
	_ = json.Unmarshal([]byte(uSkillsJSON), &u.Skills)
	_ = json.Unmarshal([]byte(uLangsJSON), &u.Languages)
	if u.ID != "" {
		s.Seller = &u
	}

	// Fetch associated packages
	pkgQuery := `
		SELECT id, service_id, tier, name, title, COALESCE(description, ''),
		       price, delivery_time, revisions, features, created_at, updated_at
		FROM service_packages
		WHERE service_id = $1
		ORDER BY CASE tier WHEN 'basic' THEN 1 WHEN 'standard' THEN 2 WHEN 'premium' THEN 3 ELSE 4 END;
	`
	pkgRows, err := r.db.QueryContext(ctx, pkgQuery, s.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to query service packages: %w", err)
	}
	defer pkgRows.Close()

	packages := make(map[string]models.ServicePackage)
	for pkgRows.Next() {
		var p models.ServicePackage
		var featuresJSON []byte
		if err := pkgRows.Scan(
			&p.ID, &p.ServiceID, &p.Tier, &p.Name, &p.Title, &p.Description,
			&p.Price, &p.DeliveryTime, &p.Revisions, &featuresJSON, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan service package row: %w", err)
		}
		_ = json.Unmarshal(featuresJSON, &p.Features)
		packages[p.Tier] = p
	}
	s.Packages = packages

	// Fetch associated reviews
	revQuery := `
		SELECT r.id, r.service_id, r.order_id, r.user_id, r.rating, COALESCE(r.comment, ''), r.created_at, r.updated_at,
		       COALESCE(u.name, ''), COALESCE(u.avatar, ''), COALESCE(u.location, '')
		FROM service_reviews r
		LEFT JOIN users u ON r.user_id = u.id
		WHERE r.service_id = $1
		ORDER BY r.created_at DESC;
	`
	revRows, err := r.db.QueryContext(ctx, revQuery, s.ID)
	if err == nil {
		defer revRows.Close()
		var reviews []models.Review
		for revRows.Next() {
			var rev models.Review
			var revUserName, revUserAvatar, revUserLocation string
			if err := revRows.Scan(
				&rev.ID, &rev.ServiceID, &rev.OrderID, &rev.UserID, &rev.Rating, &rev.Comment, &rev.CreatedAt, &rev.UpdatedAt,
				&revUserName, &revUserAvatar, &revUserLocation,
			); err == nil {
				rev.User = &models.User{
					ID:       rev.UserID,
					Name:     revUserName,
					Avatar:   revUserAvatar,
					Location: revUserLocation,
				}
				reviews = append(reviews, rev)
			}
		}
		s.Reviews = reviews
	}

	return &s, nil
}

// GetBySellerID retrieves all services created by a specific seller with optional status filter
func (r *serviceRepository) GetBySellerID(ctx context.Context, sellerID string, status string, limit int, offset int) ([]models.Service, int, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, 0, ErrDatabaseUnavailable
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	where := []string{"s.seller_id = $1"}
	args := []interface{}{sellerID}
	idx := 2

	if status != "" && status != "all" {
		where = append(where, fmt.Sprintf("s.status = $%d", idx))
		args = append(args, status)
		idx++
	}

	whereSQL := strings.Join(where, " AND ")

	// 1. Total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM services s WHERE %s;", whereSQL)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count seller services: %w", err)
	}

	// 2. Fetch services list
	query := fmt.Sprintf(`
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images, s.description, s.tags,
		       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
		       s.order_count, s.created_at, s.updated_at, s.published_at
		FROM services s
		WHERE %s
		ORDER BY s.created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereSQL, idx, idx+1)

	queryArgs := append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query seller services: %w", err)
	}
	defer rows.Close()

	var services []models.Service
	var serviceIDs []string

	for rows.Next() {
		var s models.Service
		var tagIDsJSON, galleryImagesJSON, tagsJSON []byte
		var pubAt sql.NullTime

		if err := rows.Scan(
			&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
			&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
			&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryImagesJSON, &s.Description, &tagsJSON,
			&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
			&s.OrderCount, &s.CreatedAt, &s.UpdatedAt, &pubAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan seller service row: %w", err)
		}

		if pubAt.Valid {
			s.PublishedAt = &pubAt.Time
		}
		s.ImageURL = s.CoverImage

		_ = json.Unmarshal(tagIDsJSON, &s.TagIDs)
		_ = json.Unmarshal(galleryImagesJSON, &s.GalleryImages)
		_ = json.Unmarshal(tagsJSON, &s.Tags)
		s.Packages = make(map[string]models.ServicePackage)

		services = append(services, s)
		serviceIDs = append(serviceIDs, s.ID)
	}

	// 3. Batch load packages for all retrieved services
	if len(serviceIDs) > 0 {
		placeholders := make([]string, len(serviceIDs))
		pkgArgs := make([]interface{}, len(serviceIDs))
		for i, sid := range serviceIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			pkgArgs[i] = sid
		}

		pkgQuery := fmt.Sprintf(`
			SELECT id, service_id, tier, name, title, COALESCE(description, ''),
			       price, delivery_time, revisions, features, created_at, updated_at
			FROM service_packages
			WHERE service_id IN (%s)
			ORDER BY CASE tier WHEN 'basic' THEN 1 WHEN 'standard' THEN 2 WHEN 'premium' THEN 3 ELSE 4 END;
		`, strings.Join(placeholders, ","))

		pkgRows, err := r.db.QueryContext(ctx, pkgQuery, pkgArgs...)
		if err == nil {
			defer pkgRows.Close()
			for pkgRows.Next() {
				var p models.ServicePackage
				var featJSON []byte
				if err := pkgRows.Scan(
					&p.ID, &p.ServiceID, &p.Tier, &p.Name, &p.Title, &p.Description,
					&p.Price, &p.DeliveryTime, &p.Revisions, &featJSON, &p.CreatedAt, &p.UpdatedAt,
				); err == nil {
					_ = json.Unmarshal(featJSON, &p.Features)
					for i := range services {
						if services[i].ID == p.ServiceID {
							services[i].Packages[p.Tier] = p
							break
						}
					}
				}
			}
		}
	}

	return services, total, nil
}

// Create inserts a new service and its packages inside a single database transaction
func (r *serviceRepository) Create(ctx context.Context, s *models.Service, packages []models.ServicePackage) (*models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now

	if s.Status == "published" && s.PublishedAt == nil {
		s.PublishedAt = &now
	}

	tagIDsJSON, _ := json.Marshal(s.TagIDs)
	galleryImagesJSON, _ := json.Marshal(s.GalleryImages)
	tagsJSON, _ := json.Marshal(s.Tags)

	var pubAt *time.Time
	if s.Status == "published" && s.PublishedAt != nil {
		pubAt = s.PublishedAt
	}

	serviceInsertSQL := `
		INSERT INTO services (
			id, title, slug, seller_id, category_id, category_slug,
			subcategory_id, subcategory_slug, tag_ids, status, is_featured,
			is_trending, views_count, cover_image, gallery_images, description,
			tags, starting_price, currency, delivery_days, rating, review_count,
			order_count, created_at, updated_at, published_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16,
			$17, $18, $19, $20, $21, $22,
			$23, $24, $25, $26
		);
	`

	_, err = tx.ExecContext(ctx, serviceInsertSQL,
		s.ID, s.Title, s.Slug, s.SellerID, s.CategoryID, s.CategorySlug,
		s.SubcategoryID, s.SubcategorySlug, tagIDsJSON, s.Status, s.IsFeatured,
		s.IsTrending, s.ViewsCount, s.CoverImage, galleryImagesJSON, s.Description,
		tagsJSON, s.StartingPrice, s.Currency, s.DeliveryDays, s.Rating, s.ReviewCount,
		s.OrderCount, s.CreatedAt, s.UpdatedAt, pubAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert service: %w", err)
	}

	// Insert packages
	pkgInsertSQL := `
		INSERT INTO service_packages (
			id, service_id, tier, name, title, description,
			price, delivery_time, revisions, features, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12
		);
	`

	pkgMap := make(map[string]models.ServicePackage)
	for _, p := range packages {
		featJSON, _ := json.Marshal(p.Features)
		p.ServiceID = s.ID
		p.CreatedAt = now
		p.UpdatedAt = now

		_, err = tx.ExecContext(ctx, pkgInsertSQL,
			p.ID, p.ServiceID, p.Tier, p.Name, p.Title, p.Description,
			p.Price, p.DeliveryTime, p.Revisions, featJSON, p.CreatedAt, p.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to insert package tier '%s': %w", p.Tier, err)
		}
		pkgMap[p.Tier] = p
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit service creation transaction: %w", err)
	}

	s.Packages = pkgMap
	s.ImageURL = s.CoverImage
	return s, nil
}

// Update updates a service and conditionally replaces its packages inside a database transaction
func (r *serviceRepository) Update(ctx context.Context, s *models.Service, packages []models.ServicePackage, updatePackages bool) (*models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	s.UpdatedAt = now

	tagIDsJSON, _ := json.Marshal(s.TagIDs)
	galleryImagesJSON, _ := json.Marshal(s.GalleryImages)
	tagsJSON, _ := json.Marshal(s.Tags)

	var pubAt *time.Time
	if s.Status == "published" {
		if s.PublishedAt == nil {
			s.PublishedAt = &now
		}
		pubAt = s.PublishedAt
	}

	serviceUpdateSQL := `
		UPDATE services SET
			title = $1,
			slug = $2,
			category_id = $3,
			category_slug = $4,
			subcategory_id = $5,
			subcategory_slug = $6,
			tag_ids = $7,
			status = $8,
			cover_image = $9,
			gallery_images = $10,
			description = $11,
			tags = $12,
			starting_price = $13,
			delivery_days = $14,
			updated_at = $15,
			published_at = $16
		WHERE id = $17;
	`

	_, err = tx.ExecContext(ctx, serviceUpdateSQL,
		s.Title, s.Slug, s.CategoryID, s.CategorySlug,
		s.SubcategoryID, s.SubcategorySlug, tagIDsJSON, s.Status,
		s.CoverImage, galleryImagesJSON, s.Description, tagsJSON,
		s.StartingPrice, s.DeliveryDays, s.UpdatedAt, pubAt, s.ID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update service: %w", err)
	}

	// If updating packages, delete existing and re-insert
	if updatePackages && len(packages) > 0 {
		_, err = tx.ExecContext(ctx, "DELETE FROM service_packages WHERE service_id = $1;", s.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to clear existing packages: %w", err)
		}

		pkgInsertSQL := `
			INSERT INTO service_packages (
				id, service_id, tier, name, title, description,
				price, delivery_time, revisions, features, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, $6,
				$7, $8, $9, $10, $11, $12
			);
		`

		pkgMap := make(map[string]models.ServicePackage)
		for _, p := range packages {
			featJSON, _ := json.Marshal(p.Features)
			p.ServiceID = s.ID
			p.CreatedAt = now
			p.UpdatedAt = now

			_, err = tx.ExecContext(ctx, pkgInsertSQL,
				p.ID, p.ServiceID, p.Tier, p.Name, p.Title, p.Description,
				p.Price, p.DeliveryTime, p.Revisions, featJSON, p.CreatedAt, p.UpdatedAt,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to replace package tier '%s': %w", p.Tier, err)
			}
			pkgMap[p.Tier] = p
		}
		s.Packages = pkgMap
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit service update transaction: %w", err)
	}

	s.ImageURL = s.CoverImage
	return s, nil
}

// Publish updates service status to 'published' and records published_at
func (r *serviceRepository) Publish(ctx context.Context, id string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	now := time.Now().UTC()
	query := `
		UPDATE services
		SET status = 'published',
		    published_at = COALESCE(published_at, $1),
		    updated_at = $1
		WHERE id = $2;
	`
	res, err := r.db.ExecContext(ctx, query, now, id)
	if err != nil {
		return fmt.Errorf("failed to publish service: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Archive updates service status to 'archived'
func (r *serviceRepository) Archive(ctx context.Context, id string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	now := time.Now().UTC()
	query := `
		UPDATE services
		SET status = 'archived',
		    updated_at = $1
		WHERE id = $2;
	`
	res, err := r.db.ExecContext(ctx, query, now, id)
	if err != nil {
		return fmt.Errorf("failed to archive service: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete permanently deletes a draft service and cascade deletes its packages
func (r *serviceRepository) Delete(ctx context.Context, id string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	res, err := r.db.ExecContext(ctx, "DELETE FROM services WHERE id = $1;", id)
	if err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// CheckOwnership verifies whether a service exists and belongs to the given seller ID
func (r *serviceRepository) CheckOwnership(ctx context.Context, serviceID string, sellerID string) (bool, *models.Service, error) {
	service, err := r.GetByIDWithStatus(ctx, serviceID)
	if err != nil {
		return false, nil, err
	}
	if service == nil {
		return false, nil, nil
	}

	isOwner := service.SellerID == sellerID
	return isOwner, service, nil
}
