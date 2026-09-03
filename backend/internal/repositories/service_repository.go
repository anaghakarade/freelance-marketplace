package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

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
}

type serviceRepository struct {
	db *database.DBWrapper
}

// NewServiceRepository creates a new instance of ServiceRepository
func NewServiceRepository(db *database.DBWrapper) ServiceRepository {
	return &serviceRepository{db: db}
}

// GetAll retrieves a list of services with optional filters and pagination.
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
		       s.order_count, s.created_at, s.updated_at,
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

		if err := rows.Scan(
			&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
			&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
			&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryImagesJSON, &s.Description, &tagsJSON,
			&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
			&s.OrderCount, &s.CreatedAt, &s.UpdatedAt,
			&u.ID, &u.Name, &u.Email, &u.Role, &u.AccountType, &u.Avatar,
			&u.Title, &u.Location, &u.Rating, &u.ReviewsCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan service row: %w", err)
		}

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

// GetByID retrieves a single service by ID.
// Supports both "srv_1" string IDs and plain numeric strings like "1"
// by querying with OR across the id column.
func (r *serviceRepository) GetByID(ctx context.Context, id string) (*models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	// Build a flexible ID predicate: match exact ID or "srv_<id>"
	// This handles both /api/services/srv_1 and /api/services/1
	query := `
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images, s.description, s.tags,
		       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
		       s.order_count, s.created_at, s.updated_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.role, ''), COALESCE(u.account_type, ''), COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), COALESCE(u.rating, 0),
		       COALESCE(u.reviews_count, 0),
		       COALESCE(u.about, ''), COALESCE(u.skills, '[]'::jsonb)::text,
		       COALESCE(u.languages, '[]'::jsonb)::text,
		       COALESCE(u.completed_projects, 0), COALESCE(u.starting_price, 0)
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		WHERE s.id = $1 OR s.id = $2;
	`

	// Try both the raw id and prefixed form
	prefixed := "srv_" + id
	if strings.HasPrefix(id, "srv_") {
		prefixed = id
		// Strip prefix for the alternative lookup
		id = strings.TrimPrefix(id, "srv_")
	}

	var s models.Service
	var tagIDsJSON, galleryImagesJSON, tagsJSON []byte
	var u models.User
	var uSkillsJSON, uLangsJSON string

	err := r.db.QueryRowContext(ctx, query, id, prefixed).Scan(
		&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
		&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
		&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryImagesJSON, &s.Description, &tagsJSON,
		&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
		&s.OrderCount, &s.CreatedAt, &s.UpdatedAt,
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
		FROM reviews r
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
