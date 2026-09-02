package services

import (
	"context"
	"errors"
	"strings"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	ErrServiceNotFound = errors.New("service not found")
)

// ServiceService defines business logic methods for services and gigs
type ServiceService interface {
	GetAllServices(ctx context.Context, categorySlug, subcategorySlug string, limit, offset int) ([]models.Service, error)
	GetServiceByID(ctx context.Context, id string) (*models.Service, error)
}

type serviceService struct {
	repo repositories.ServiceRepository
}

// NewServiceService creates a new ServiceService instance
func NewServiceService(repo repositories.ServiceRepository) ServiceService {
	return &serviceService{repo: repo}
}

// GetAllServices retrieves published services matching optional category/subcategory filters
func (s *serviceService) GetAllServices(ctx context.Context, categorySlug, subcategorySlug string, limit, offset int) ([]models.Service, error) {
	categorySlug = strings.TrimSpace(categorySlug)
	subcategorySlug = strings.TrimSpace(subcategorySlug)
	return s.repo.GetAll(ctx, categorySlug, subcategorySlug, limit, offset)
}

// GetServiceByID retrieves a single service with its packages and seller info
func (s *serviceService) GetServiceByID(ctx context.Context, id string) (*models.Service, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, ErrServiceNotFound
	}

	service, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if service == nil {
		return nil, ErrServiceNotFound
	}

	return service, nil
}
