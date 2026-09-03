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
	getAllFunc  func(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error)
	getByIDFunc func(ctx context.Context, id string) (*models.Service, error)
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

	svc := services.NewServiceService(repo)

	// Test category filtering
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

	svc := services.NewServiceService(repo)

	// Test found by prefixed ID
	s1, err := svc.GetServiceByID(ctx, "srv_1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s1.ID != "srv_1" {
		t.Errorf("expected ID srv_1, got %s", s1.ID)
	}

	// Test found by numeric ID
	s2, err := svc.GetServiceByID(ctx, "1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s2.ID != "srv_1" {
		t.Errorf("expected ID srv_1, got %s", s2.ID)
	}

	// Test not found
	_, err = svc.GetServiceByID(ctx, "srv_nonexistent")
	if !errors.Is(err, services.ErrServiceNotFound) {
		t.Errorf("expected ErrServiceNotFound, got %v", err)
	}
}
