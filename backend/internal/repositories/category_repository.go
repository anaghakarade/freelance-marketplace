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
	GetByID(ctx context.Context, id string) (*models.Category, error)
	GetSubcategoriesByCategorySlug(ctx context.Context, categorySlug string) ([]models.Subcategory, error)
	GetSubcategoryByID(ctx context.Context, subcategoryID string) (*models.Subcategory, error)
	ValidateCategoryAndSubcategory(ctx context.Context, categoryIDOrSlug, subcategoryIDOrSlug string) (*models.Category, *models.Subcategory, error)
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

// GetByID retrieves a single category by ID (or slug fallback)
func (r *categoryRepository) GetByID(ctx context.Context, id string) (*models.Category, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT id, name, slug, COALESCE(icon_name, ''), COALESCE(description, ''), 
		       COALESCE(image, ''), is_active, sort_order, created_at, updated_at
		FROM categories
		WHERE (id = $1 OR slug = $1) AND is_active = TRUE;
	`

	var cat models.Category
	err := r.db.QueryRowContext(ctx, query, id).Scan(
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
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query category by id: %w", err)
	}

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

// GetSubcategoryByID retrieves a subcategory by ID or slug
func (r *categoryRepository) GetSubcategoryByID(ctx context.Context, subcategoryID string) (*models.Subcategory, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT id, category_id, category_slug, name, slug, COALESCE(description, ''), 
		       sort_order, is_active, created_at, updated_at
		FROM subcategories
		WHERE (id = $1 OR slug = $1) AND is_active = TRUE;
	`

	var sub models.Subcategory
	err := r.db.QueryRowContext(ctx, query, subcategoryID).Scan(
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
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query subcategory by id: %w", err)
	}

	return &sub, nil
}

// ValidateCategoryAndSubcategory verifies that both exist and that the subcategory belongs to the category
func (r *categoryRepository) ValidateCategoryAndSubcategory(ctx context.Context, categoryIDOrSlug, subcategoryIDOrSlug string) (*models.Category, *models.Subcategory, error) {
	cat, err := r.GetByID(ctx, categoryIDOrSlug)
	if err != nil {
		return nil, nil, err
	}
	if cat == nil {
		return nil, nil, fmt.Errorf("category '%s' not found", categoryIDOrSlug)
	}

	sub, err := r.GetSubcategoryByID(ctx, subcategoryIDOrSlug)
	if err != nil {
		return nil, nil, err
	}
	if sub == nil {
		return nil, nil, fmt.Errorf("subcategory '%s' not found", subcategoryIDOrSlug)
	}

	if sub.CategoryID != cat.ID && sub.CategorySlug != cat.Slug {
		return nil, nil, fmt.Errorf("subcategory '%s' does not belong to category '%s'", sub.Name, cat.Name)
	}

	return cat, sub, nil
}
