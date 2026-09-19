package services

import (
	"context"
	"errors"
	"strings"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	ErrQueryTooLong     = errors.New("search query exceeds maximum length of 200 characters")
	ErrInvalidPriceRange = errors.New("min_price cannot be greater than max_price")
	ErrInvalidRating     = errors.New("rating must be between 0 and 5")
)

// SearchService defines business logic for multi-entity marketplace search
type SearchService interface {
	SearchServices(ctx context.Context, p models.ServiceSearchParams) (*models.ServiceSearchResponse, error)
	SearchFreelancers(ctx context.Context, p models.FreelancerSearchParams) (*models.FreelancerSearchResponse, error)
	SearchProjects(ctx context.Context, p models.ProjectSearchParams) (*models.ProjectsResponseData, error)
}

type searchService struct {
	repo repositories.SearchRepository
}

func NewSearchService(repo repositories.SearchRepository) SearchService {
	return &searchService{repo: repo}
}

func (s *searchService) SearchServices(ctx context.Context, p models.ServiceSearchParams) (*models.ServiceSearchResponse, error) {
	p.Query = strings.TrimSpace(p.Query)
	if len(p.Query) > 200 {
		return nil, ErrQueryTooLong
	}

	if p.MinPrice != nil && p.MaxPrice != nil && *p.MinPrice > *p.MaxPrice {
		return nil, ErrInvalidPriceRange
	}
	if p.MinPrice != nil && *p.MinPrice < 0 {
		zero := 0.0
		p.MinPrice = &zero
	}
	if p.MinRating != nil && (*p.MinRating < 0 || *p.MinRating > 5) {
		return nil, ErrInvalidRating
	}

	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}

	results, total, err := s.repo.SearchServices(ctx, p)
	if err != nil {
		return nil, err
	}

	return &models.ServiceSearchResponse{
		Services: results,
		Total:    total,
		Page:     p.Page,
		Limit:    p.Limit,
	}, nil
}

func (s *searchService) SearchFreelancers(ctx context.Context, p models.FreelancerSearchParams) (*models.FreelancerSearchResponse, error) {
	p.Query = strings.TrimSpace(p.Query)
	if len(p.Query) > 200 {
		return nil, ErrQueryTooLong
	}

	if p.MinPrice != nil && p.MaxPrice != nil && *p.MinPrice > *p.MaxPrice {
		return nil, ErrInvalidPriceRange
	}
	if p.MinRating != nil && (*p.MinRating < 0 || *p.MinRating > 5) {
		return nil, ErrInvalidRating
	}

	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}

	results, total, err := s.repo.SearchFreelancers(ctx, p)
	if err != nil {
		return nil, err
	}

	return &models.FreelancerSearchResponse{
		Freelancers: results,
		Total:       total,
		Page:        p.Page,
		Limit:       p.Limit,
	}, nil
}

func (s *searchService) SearchProjects(ctx context.Context, p models.ProjectSearchParams) (*models.ProjectsResponseData, error) {
	p.Query = strings.TrimSpace(p.Query)
	if len(p.Query) > 200 {
		return nil, ErrQueryTooLong
	}

	if p.MinBudget != nil && p.MaxBudget != nil && *p.MinBudget > *p.MaxBudget {
		return nil, ErrInvalidPriceRange
	}

	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}

	projects, total, err := s.repo.SearchProjects(ctx, p)
	if err != nil {
		return nil, err
	}

	return &models.ProjectsResponseData{
		Projects: projects,
		Total:    total,
		Limit:    p.Limit,
		Offset:   (p.Page - 1) * p.Limit,
	}, nil
}
