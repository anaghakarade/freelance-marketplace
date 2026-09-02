package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	ErrDatabaseUnavailable = errors.New("database connection is not available")
)

// CategoryRepository defines data access methods for categories and subcategories
type CategoryRepository interface {
	GetAll(ctx context.Context) ([]models.Category, error)
	GetBySlug(ctx context.Context, slug string) (*models.Category, error)
	GetSubcategoriesByCategorySlug(ctx context.Context, categorySlug string) ([]models.Subcategory, error)
}

type categoryRepository struct {
	db *database.DBWrapper
}

// NewCategoryRepository creates a new instance of CategoryRepository
func NewCategoryRepository(db *database.DBWrapper) CategoryRepository {
	return &categoryRepository{db: db}
}

// GetAll retrieves all active categories ordered by sort_order
func (r *categoryRepository) GetAll(ctx context.Context) ([]models.Category, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT id, name, slug, COALESCE(icon_name, ''), COALESCE(description, ''), 
		       COALESCE(image, ''), is_active, sort_order, created_at, updated_at
		FROM categories
		WHERE is_active = TRUE
		ORDER BY sort_order ASC, name ASC;
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var cat models.Category
		if err := rows.Scan(
			&cat.ID,
			&cat.Name,
			&cat.Slug,
			&cat.IconName,
			&cat.Description,
			&cat.Image,
			&cat.IsActive,
			&cat.SortOrder,
			&cat.CreatedAt,
			&cat.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan category row: %w", err)
		}
		categories = append(categories, cat)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return categories, nil
}

// GetBySlug retrieves a single category by slug along with its subcategories
func (r *categoryRepository) GetBySlug(ctx context.Context, slug string) (*models.Category, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT id, name, slug, COALESCE(icon_name, ''), COALESCE(description, ''), 
		       COALESCE(image, ''), is_active, sort_order, created_at, updated_at
		FROM categories
		WHERE slug = $1 AND is_active = TRUE;
	`

	var cat models.Category
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&cat.ID,
		&cat.Name,
		&cat.Slug,
		&cat.IconName,
		&cat.Description,
		&cat.Image,
		&cat.IsActive,
		&cat.SortOrder,
		&cat.CreatedAt,
		&cat.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to query category by slug: %w", err)
	}

	// Fetch associated subcategories
	subcategories, err := r.GetSubcategoriesByCategorySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	cat.Subcategories = subcategories

	return &cat, nil
}

// GetSubcategoriesByCategorySlug retrieves subcategories belonging to a category
func (r *categoryRepository) GetSubcategoriesByCategorySlug(ctx context.Context, categorySlug string) ([]models.Subcategory, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT id, category_id, category_slug, name, slug, COALESCE(description, ''), 
		       sort_order, is_active, created_at, updated_at
		FROM subcategories
		WHERE category_slug = $1 AND is_active = TRUE
		ORDER BY sort_order ASC, name ASC;
	`

	rows, err := r.db.QueryContext(ctx, query, categorySlug)
	if err != nil {
		return nil, fmt.Errorf("failed to query subcategories: %w", err)
	}
	defer rows.Close()

	var subcategories []models.Subcategory
	for rows.Next() {
		var sub models.Subcategory
		if err := rows.Scan(
			&sub.ID,
			&sub.CategoryID,
			&sub.CategorySlug,
			&sub.Name,
			&sub.Slug,
			&sub.Description,
			&sub.SortOrder,
			&sub.IsActive,
			&sub.CreatedAt,
			&sub.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan subcategory row: %w", err)
		}
		subcategories = append(subcategories, sub)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return subcategories, nil
}
