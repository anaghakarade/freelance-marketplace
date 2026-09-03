package services

import (
	"context"
	"errors"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

// ErrServiceNotFound is returned when a service does not exist
var ErrServiceNotFound = errors.New("service not found")

// ServiceService handles business logic for marketplace services
type ServiceService interface {
	GetAllServices(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error)
	GetServiceByID(ctx context.Context, id string) (*models.Service, error)
}

type serviceService struct {
	repo repositories.ServiceRepository
}

// NewServiceService creates a new ServiceService
func NewServiceService(repo repositories.ServiceRepository) ServiceService {
	return &serviceService{repo: repo}
}

// GetAllServices returns a filtered list of published services
func (s *serviceService) GetAllServices(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error) {
	return s.repo.GetAll(ctx, f)
}

// GetServiceByID returns a single service by ID (supports srv_1 or 1 formats)
func (s *serviceService) GetServiceByID(ctx context.Context, id string) (*models.Service, error) {
	service, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if service == nil {
		return nil, ErrServiceNotFound
	}
	return service, nil
}
