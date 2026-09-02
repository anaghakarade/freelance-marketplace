package services

import (
	"context"
	"errors"
	"strings"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	ErrCategoryNotFound = errors.New("category not found")
)

// CategoryService defines business operations for categories
type CategoryService interface {
	GetAllCategories(ctx context.Context) ([]models.Category, error)
	GetCategoryBySlug(ctx context.Context, slug string) (*models.Category, error)
	GetSubcategoriesByCategorySlug(ctx context.Context, categorySlug string) ([]models.Subcategory, error)
}

type categoryService struct {
	repo repositories.CategoryRepository
}

// NewCategoryService creates a new CategoryService instance
func NewCategoryService(repo repositories.CategoryRepository) CategoryService {
	return &categoryService{repo: repo}
}

// GetAllCategories retrieves all active marketplace categories
func (s *categoryService) GetAllCategories(ctx context.Context) ([]models.Category, error) {
	return s.repo.GetAll(ctx)
}

// GetCategoryBySlug retrieves a category by its slug
func (s *categoryService) GetCategoryBySlug(ctx context.Context, slug string) (*models.Category, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, ErrCategoryNotFound
	}

	category, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, ErrCategoryNotFound
	}

	return category, nil
}

// GetSubcategoriesByCategorySlug retrieves subcategories for a given category slug
func (s *categoryService) GetSubcategoriesByCategorySlug(ctx context.Context, categorySlug string) ([]models.Subcategory, error) {
	categorySlug = strings.TrimSpace(categorySlug)
	if categorySlug == "" {
		return []models.Subcategory{}, nil
	}

	return s.repo.GetSubcategoriesByCategorySlug(ctx, categorySlug)
}
