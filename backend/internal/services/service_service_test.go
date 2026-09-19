package services_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

// mockServiceRepository implements repositories.ServiceRepository for unit tests
type mockServiceRepository struct {
	getAllFunc            func(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error)
	getByIDFunc           func(ctx context.Context, id string) (*models.Service, error)
	getByIDWithStatusFunc func(ctx context.Context, id string) (*models.Service, error)
	getBySellerIDFunc     func(ctx context.Context, sellerID string, status string, limit int, offset int) ([]models.Service, int, error)
	createFunc            func(ctx context.Context, s *models.Service, packages []models.ServicePackage) (*models.Service, error)
	updateFunc            func(ctx context.Context, s *models.Service, packages []models.ServicePackage, updatePackages bool) (*models.Service, error)
	publishFunc           func(ctx context.Context, id string) error
	archiveFunc           func(ctx context.Context, id string) error
	deleteFunc            func(ctx context.Context, id string) error
	checkOwnershipFunc    func(ctx context.Context, serviceID string, sellerID string) (bool, *models.Service, error)
}

func (m *mockServiceRepository) GetAll(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error) {
	if m.getAllFunc != nil {
		return m.getAllFunc(ctx, f)
	}
	return nil, nil
}

func (m *mockServiceRepository) GetByID(ctx context.Context, id string) (*models.Service, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockServiceRepository) GetByIDWithStatus(ctx context.Context, id string) (*models.Service, error) {
	if m.getByIDWithStatusFunc != nil {
		return m.getByIDWithStatusFunc(ctx, id)
	}
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockServiceRepository) GetBySellerID(ctx context.Context, sellerID string, status string, limit int, offset int) ([]models.Service, int, error) {
	if m.getBySellerIDFunc != nil {
		return m.getBySellerIDFunc(ctx, sellerID, status, limit, offset)
	}
	return nil, 0, nil
}

func (m *mockServiceRepository) Create(ctx context.Context, s *models.Service, packages []models.ServicePackage) (*models.Service, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, s, packages)
	}
	return s, nil
}

func (m *mockServiceRepository) Update(ctx context.Context, s *models.Service, packages []models.ServicePackage, updatePackages bool) (*models.Service, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, s, packages, updatePackages)
	}
	return s, nil
}

func (m *mockServiceRepository) Publish(ctx context.Context, id string) error {
	if m.publishFunc != nil {
		return m.publishFunc(ctx, id)
	}
	return nil
}

func (m *mockServiceRepository) Archive(ctx context.Context, id string) error {
	if m.archiveFunc != nil {
		return m.archiveFunc(ctx, id)
	}
	return nil
}

func (m *mockServiceRepository) Delete(ctx context.Context, id string) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, id)
	}
	return nil
}

func (m *mockServiceRepository) CheckOwnership(ctx context.Context, serviceID string, sellerID string) (bool, *models.Service, error) {
	if m.checkOwnershipFunc != nil {
		return m.checkOwnershipFunc(ctx, serviceID, sellerID)
	}
	return false, nil, nil
}

func TestServiceService_GetAllServices(t *testing.T) {
	ctx := context.Background()
	mockServices := []models.Service{
		{
			ID:            "srv_1",
			Title:         "Landing Page Design",
			StartingPrice: 150,
			Rating:        4.9,
			CreatedAt:     time.Now(),
		},
		{
			ID:            "srv_2",
			Title:         "Mobile App Prototype",
			StartingPrice: 250,
			Rating:        5.0,
			CreatedAt:     time.Now(),
		},
	}

	repo := &mockServiceRepository{
		getAllFunc: func(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error) {
			if f.CategorySlug == "graphics-design" {
				return mockServices, nil
			}
			return []models.Service{}, nil
		},
	}

	svc := services.NewServiceService(repo, &mockCategoryRepository{})

	result, err := svc.GetAllServices(ctx, repositories.ServiceFilter{CategorySlug: "graphics-design"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 services, got %d", len(result))
	}
}

func TestServiceService_GetServiceByID(t *testing.T) {
	ctx := context.Background()
	mockService := &models.Service{
		ID:            "srv_1",
		Title:         "Landing Page Design",
		StartingPrice: 150,
		Rating:        4.9,
		CreatedAt:     time.Now(),
	}

	repo := &mockServiceRepository{
		getByIDFunc: func(ctx context.Context, id string) (*models.Service, error) {
			if id == "srv_1" || id == "1" {
				return mockService, nil
			}
			return nil, nil
		},
	}

	svc := services.NewServiceService(repo, &mockCategoryRepository{})

	s1, err := svc.GetServiceByID(ctx, "srv_1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s1.ID != "srv_1" {
		t.Errorf("expected ID srv_1, got %s", s1.ID)
	}

	_, err = svc.GetServiceByID(ctx, "nonexistent")
	if !errors.Is(err, services.ErrServiceNotFound) {
		t.Errorf("expected ErrServiceNotFound, got %v", err)
	}
}
