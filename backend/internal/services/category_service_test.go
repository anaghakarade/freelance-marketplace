package services_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

// mockCategoryRepository implements repositories.CategoryRepository for unit tests
type mockCategoryRepository struct {
	getAllFunc                         func(ctx context.Context) ([]models.Category, error)
	getBySlugFunc                      func(ctx context.Context, slug string) (*models.Category, error)
	getSubcategoriesByCategorySlugFunc func(ctx context.Context, categorySlug string) ([]models.Subcategory, error)
}

func (m *mockCategoryRepository) GetAll(ctx context.Context) ([]models.Category, error) {
	if m.getAllFunc != nil {
		return m.getAllFunc(ctx)
	}
	return nil, nil
}

func (m *mockCategoryRepository) GetBySlug(ctx context.Context, slug string) (*models.Category, error) {
	if m.getBySlugFunc != nil {
		return m.getBySlugFunc(ctx, slug)
	}
	return nil, nil
}

func (m *mockCategoryRepository) GetSubcategoriesByCategorySlug(ctx context.Context, categorySlug string) ([]models.Subcategory, error) {
	if m.getSubcategoriesByCategorySlugFunc != nil {
		return m.getSubcategoriesByCategorySlugFunc(ctx, categorySlug)
	}
	return nil, nil
}

func TestCategoryService_GetAllCategories(t *testing.T) {
	ctx := context.Background()
	mockCategories := []models.Category{
		{
			ID:        "cat_1",
			Name:      "Graphics & Design",
			Slug:      "graphics-design",
			IsActive:  true,
			SortOrder: 1,
			CreatedAt: time.Now(),
		},
		{
			ID:        "cat_2",
			Name:      "Programming & Tech",
			Slug:      "programming-tech",
			IsActive:  true,
			SortOrder: 2,
			CreatedAt: time.Now(),
		},
	}

	repo := &mockCategoryRepository{
		getAllFunc: func(ctx context.Context) ([]models.Category, error) {
			return mockCategories, nil
		},
	}

	svc := services.NewCategoryService(repo)
	res, err := svc.GetAllCategories(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res) != 2 {
		t.Errorf("expected 2 categories, got %d", len(res))
	}
}

func TestCategoryService_GetCategoryBySlug(t *testing.T) {
	ctx := context.Background()
	mockCat := &models.Category{
		ID:        "cat_2",
		Name:      "Programming & Tech",
		Slug:      "programming-tech",
		IsActive:  true,
		SortOrder: 2,
		CreatedAt: time.Now(),
	}

	repo := &mockCategoryRepository{
		getBySlugFunc: func(ctx context.Context, slug string) (*models.Category, error) {
			if slug == "programming-tech" {
				return mockCat, nil
			}
			return nil, nil
		},
	}

	svc := services.NewCategoryService(repo)

	cat, err := svc.GetCategoryBySlug(ctx, "programming-tech")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cat.Slug != "programming-tech" {
		t.Errorf("expected slug programming-tech, got %s", cat.Slug)
	}

	// Not found
	_, err = svc.GetCategoryBySlug(ctx, "nonexistent")
	if !errors.Is(err, services.ErrCategoryNotFound) {
		t.Errorf("expected ErrCategoryNotFound, got %v", err)
	}
}

func TestCategoryService_GetSubcategoriesByCategorySlug(t *testing.T) {
	ctx := context.Background()
	mockSubs := []models.Subcategory{
		{
			ID:           "sub_1",
			CategoryID:   "cat_2",
			CategorySlug: "programming-tech",
			Name:         "Website Development",
			Slug:         "website-development",
			IsActive:     true,
			SortOrder:    1,
		},
	}

	repo := &mockCategoryRepository{
		getSubcategoriesByCategorySlugFunc: func(ctx context.Context, categorySlug string) ([]models.Subcategory, error) {
			if categorySlug == "programming-tech" {
				return mockSubs, nil
			}
			return []models.Subcategory{}, nil
		},
	}

	svc := services.NewCategoryService(repo)

	subs, err := svc.GetSubcategoriesByCategorySlug(ctx, "programming-tech")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(subs) != 1 {
		t.Errorf("expected 1 subcategory, got %d", len(subs))
	}
}
