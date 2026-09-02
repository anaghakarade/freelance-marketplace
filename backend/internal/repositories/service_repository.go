package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

// ServiceRepository defines database operations for services and packages
type ServiceRepository interface {
	GetAll(ctx context.Context, categorySlug, subcategorySlug string, limit, offset int) ([]models.Service, error)
	GetByID(ctx context.Context, id string) (*models.Service, error)
}

type serviceRepository struct {
	db *database.DBWrapper
}

// NewServiceRepository creates a new instance of ServiceRepository
func NewServiceRepository(db *database.DBWrapper) ServiceRepository {
	return &serviceRepository{db: db}
}

// GetAll retrieves a list of services with optional category/subcategory filters and pagination
func (r *serviceRepository) GetAll(ctx context.Context, categorySlug, subcategorySlug string, limit, offset int) ([]models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, s.cover_image, s.gallery_images, s.description, s.tags,
		       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
		       s.order_count, s.created_at, s.updated_at,
		       u.id, u.name, u.email, u.role, u.account_type, COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), u.rating, u.reviews_count
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		WHERE s.status = 'published'
	`

	args := []interface{}{}
	argIdx := 1

	if categorySlug != "" {
		query += fmt.Sprintf(" AND s.category_slug = $%d", argIdx)
		args = append(args, categorySlug)
		argIdx++
	}

	if subcategorySlug != "" {
		query += fmt.Sprintf(" AND s.subcategory_slug = $%d", argIdx)
		args = append(args, subcategorySlug)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY s.is_featured DESC, s.rating DESC, s.created_at DESC LIMIT $%d OFFSET $%d;", argIdx, argIdx+1)
	args = append(args, limit, offset)

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
			&s.IsTrending, &s.CoverImage, &galleryImagesJSON, &s.Description, &tagsJSON,
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

// GetByID retrieves a single service by ID including its packages and seller details
func (r *serviceRepository) GetByID(ctx context.Context, id string) (*models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, s.cover_image, s.gallery_images, s.description, s.tags,
		       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
		       s.order_count, s.created_at, s.updated_at,
		       u.id, u.name, u.email, u.role, u.account_type, COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), u.rating, u.reviews_count,
		       COALESCE(u.about, ''), u.skills, u.languages, u.completed_projects, u.starting_price
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		WHERE s.id = $1;
	`

	var s models.Service
	var tagIDsJSON, galleryImagesJSON, tagsJSON []byte
	var u models.User
	var uSkillsJSON, uLangsJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
		&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
		&s.IsTrending, &s.CoverImage, &galleryImagesJSON, &s.Description, &tagsJSON,
		&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
		&s.OrderCount, &s.CreatedAt, &s.UpdatedAt,
		&u.ID, &u.Name, &u.Email, &u.Role, &u.AccountType, &u.Avatar,
		&u.Title, &u.Location, &u.Rating, &u.ReviewsCount,
		&u.About, &uSkillsJSON, &uLangsJSON, &u.CompletedProjects, &u.StartingPrice,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to query service by id: %w", err)
	}

	_ = json.Unmarshal(tagIDsJSON, &s.TagIDs)
	_ = json.Unmarshal(galleryImagesJSON, &s.GalleryImages)
	_ = json.Unmarshal(tagsJSON, &s.Tags)
	_ = json.Unmarshal(uSkillsJSON, &u.Skills)
	_ = json.Unmarshal(uLangsJSON, &u.Languages)
	if u.ID != "" {
		s.Seller = &u
	}

	// Fetch associated packages
	pkgQuery := `
		SELECT id, service_id, tier, name, title, COALESCE(description, ''), 
		       price, delivery_time, revisions, features, created_at, updated_at
		FROM service_packages
		WHERE service_id = $1;
	`
	pkgRows, err := r.db.QueryContext(ctx, pkgQuery, id)
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
	return &s, nil
}
