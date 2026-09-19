package services

import (
	"context"
	"errors"
	"strings"
	"testing"

	"workstream-backend/internal/models"
)

// ──────────────────────────────────────────────────────────────
// Mock search repository
// ──────────────────────────────────────────────────────────────

type mockSearchRepo struct {
	services    []models.ServiceSearchResult
	freelancers []models.FreelancerSearchResult
	projects    []models.Project
}

func (m *mockSearchRepo) SearchServices(ctx context.Context, p models.ServiceSearchParams) ([]models.ServiceSearchResult, int, error) {
	return m.services, len(m.services), nil
}

func (m *mockSearchRepo) SearchFreelancers(ctx context.Context, p models.FreelancerSearchParams) ([]models.FreelancerSearchResult, int, error) {
	return m.freelancers, len(m.freelancers), nil
}

func (m *mockSearchRepo) SearchProjects(ctx context.Context, p models.ProjectSearchParams) ([]models.Project, int, error) {
	return m.projects, len(m.projects), nil
}

func newTestSearchService(repo *mockSearchRepo) SearchService {
	return NewSearchService(repo)
}

// ──────────────────────────────────────────────────────────────
// SearchServices tests
// ──────────────────────────────────────────────────────────────

// TestSearch_SearchServices_QueryTooLong verifies that a query > 200 chars is rejected.
func TestSearch_SearchServices_QueryTooLong(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	longQuery := strings.Repeat("a", 201)
	_, err := svc.SearchServices(ctx, models.ServiceSearchParams{Query: longQuery, Page: 1, Limit: 20})
	if !errors.Is(err, ErrQueryTooLong) {
		t.Fatalf("expected ErrQueryTooLong, got: %v", err)
	}
}

// TestSearch_SearchServices_ExactMaxQueryLength verifies a 200-char query is accepted.
func TestSearch_SearchServices_ExactMaxQueryLength(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	exactQuery := strings.Repeat("x", 200)
	_, err := svc.SearchServices(ctx, models.ServiceSearchParams{Query: exactQuery, Page: 1, Limit: 20})
	if err != nil {
		t.Fatalf("200-char query should be accepted, got error: %v", err)
	}
}

// TestSearch_SearchServices_InvalidPriceRange verifies min_price > max_price is rejected.
func TestSearch_SearchServices_InvalidPriceRange(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	minP, maxP := 500.0, 100.0 // inverted
	_, err := svc.SearchServices(ctx, models.ServiceSearchParams{
		Query: "web design", MinPrice: &minP, MaxPrice: &maxP, Page: 1, Limit: 20,
	})
	if !errors.Is(err, ErrInvalidPriceRange) {
		t.Fatalf("expected ErrInvalidPriceRange, got: %v", err)
	}
}

// TestSearch_SearchServices_NegativeMinPriceClamped verifies negative min_price is
// clamped to 0 (not an error).
func TestSearch_SearchServices_NegativeMinPriceClamped(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{services: []models.ServiceSearchResult{{}}})
	ctx := context.Background()

	minP := -50.0
	_, err := svc.SearchServices(ctx, models.ServiceSearchParams{
		Query: "logo", MinPrice: &minP, Page: 1, Limit: 20,
	})
	if err != nil {
		t.Fatalf("negative min_price should be clamped to 0, got error: %v", err)
	}
}

// TestSearch_SearchServices_InvalidRating verifies out-of-range ratings are rejected.
func TestSearch_SearchServices_InvalidRating(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	invalidRatings := []float64{-1.0, 5.1, 10.0, -0.01}
	for _, r := range invalidRatings {
		rating := r
		_, err := svc.SearchServices(ctx, models.ServiceSearchParams{
			Query: "web", MinRating: &rating, Page: 1, Limit: 20,
		})
		if !errors.Is(err, ErrInvalidRating) {
			t.Errorf("rating=%.2f: expected ErrInvalidRating, got: %v", r, err)
		}
	}
}

// TestSearch_SearchServices_ValidRatingBoundaries verifies 0 and 5 are valid rating bounds.
func TestSearch_SearchServices_ValidRatingBoundaries(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	validRatings := []float64{0.0, 1.0, 2.5, 4.9, 5.0}
	for _, r := range validRatings {
		rating := r
		_, err := svc.SearchServices(ctx, models.ServiceSearchParams{
			Query: "logo", MinRating: &rating, Page: 1, Limit: 20,
		})
		if err != nil {
			t.Errorf("valid rating %.1f should be accepted, got: %v", r, err)
		}
	}
}

// TestSearch_SearchServices_PaginationDefaults verifies page and limit defaults.
func TestSearch_SearchServices_PaginationDefaults(t *testing.T) {
	repo := &mockSearchRepo{}
	svc := newTestSearchService(repo)
	ctx := context.Background()

	// page=0 → clamped to 1, limit=0 → clamped to 20
	result, err := svc.SearchServices(ctx, models.ServiceSearchParams{Page: 0, Limit: 0})
	if err != nil {
		t.Fatalf("SearchServices failed: %v", err)
	}
	if result.Page != 1 {
		t.Errorf("expected page=1 for page=0 input, got %d", result.Page)
	}
	if result.Limit != 20 {
		t.Errorf("expected limit=20 for limit=0 input, got %d", result.Limit)
	}
}

// TestSearch_SearchServices_MaxLimitClamped verifies limit > 100 is clamped to 20.
func TestSearch_SearchServices_MaxLimitClamped(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	result, err := svc.SearchServices(ctx, models.ServiceSearchParams{Page: 1, Limit: 999})
	if err != nil {
		t.Fatalf("SearchServices failed: %v", err)
	}
	if result.Limit != 20 {
		t.Errorf("expected limit=20 for limit=999, got %d", result.Limit)
	}
}

// TestSearch_SearchServices_ValidQuery verifies a normal search succeeds.
func TestSearch_SearchServices_ValidQuery(t *testing.T) {
	services := []models.ServiceSearchResult{
		{Service: models.Service{ID: "svc_1"}, RelevanceScore: 0.9},
		{Service: models.Service{ID: "svc_2"}, RelevanceScore: 0.7},
	}
	svc := newTestSearchService(&mockSearchRepo{services: services})
	ctx := context.Background()

	result, err := svc.SearchServices(ctx, models.ServiceSearchParams{
		Query: "react developer", Page: 1, Limit: 20,
	})
	if err != nil {
		t.Fatalf("SearchServices failed: %v", err)
	}
	if result.Total != 2 {
		t.Errorf("expected Total=2, got %d", result.Total)
	}
	if len(result.Services) != 2 {
		t.Errorf("expected 2 services, got %d", len(result.Services))
	}
}

// ──────────────────────────────────────────────────────────────
// SearchFreelancers tests
// ──────────────────────────────────────────────────────────────

// TestSearch_SearchFreelancers_QueryTooLong verifies query length enforcement.
func TestSearch_SearchFreelancers_QueryTooLong(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	_, err := svc.SearchFreelancers(ctx, models.FreelancerSearchParams{
		Query: strings.Repeat("b", 201),
	})
	if !errors.Is(err, ErrQueryTooLong) {
		t.Fatalf("expected ErrQueryTooLong, got: %v", err)
	}
}

// TestSearch_SearchFreelancers_InvalidPriceRange verifies inverted price range is rejected.
func TestSearch_SearchFreelancers_InvalidPriceRange(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	minP, maxP := 800.0, 200.0
	_, err := svc.SearchFreelancers(ctx, models.FreelancerSearchParams{
		MinPrice: &minP, MaxPrice: &maxP,
	})
	if !errors.Is(err, ErrInvalidPriceRange) {
		t.Fatalf("expected ErrInvalidPriceRange, got: %v", err)
	}
}

// TestSearch_SearchFreelancers_InvalidRating verifies out-of-range rating is rejected.
func TestSearch_SearchFreelancers_InvalidRating(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	invalidRating := 6.0
	_, err := svc.SearchFreelancers(ctx, models.FreelancerSearchParams{
		MinRating: &invalidRating,
	})
	if !errors.Is(err, ErrInvalidRating) {
		t.Fatalf("expected ErrInvalidRating, got: %v", err)
	}
}

// TestSearch_SearchFreelancers_PaginationDefaults verifies defaults are applied.
func TestSearch_SearchFreelancers_PaginationDefaults(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	result, err := svc.SearchFreelancers(ctx, models.FreelancerSearchParams{Page: -1, Limit: 0})
	if err != nil {
		t.Fatalf("SearchFreelancers failed: %v", err)
	}
	if result.Page != 1 {
		t.Errorf("expected page=1, got %d", result.Page)
	}
	if result.Limit != 20 {
		t.Errorf("expected limit=20, got %d", result.Limit)
	}
}

// ──────────────────────────────────────────────────────────────
// SearchProjects tests
// ──────────────────────────────────────────────────────────────

// TestSearch_SearchProjects_QueryTooLong verifies query length enforcement for projects.
func TestSearch_SearchProjects_QueryTooLong(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	_, err := svc.SearchProjects(ctx, models.ProjectSearchParams{
		Query: strings.Repeat("c", 201),
	})
	if !errors.Is(err, ErrQueryTooLong) {
		t.Fatalf("expected ErrQueryTooLong, got: %v", err)
	}
}

// TestSearch_SearchProjects_InvalidBudgetRange verifies min > max budget is rejected.
func TestSearch_SearchProjects_InvalidBudgetRange(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	minB, maxB := 10000.0, 500.0
	_, err := svc.SearchProjects(ctx, models.ProjectSearchParams{
		MinBudget: &minB, MaxBudget: &maxB,
	})
	if !errors.Is(err, ErrInvalidPriceRange) {
		t.Fatalf("expected ErrInvalidPriceRange, got: %v", err)
	}
}

// TestSearch_SearchProjects_ValidBudgetRange verifies equal min/max budget is accepted.
func TestSearch_SearchProjects_ValidBudgetRange(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	budget := 1000.0
	_, err := svc.SearchProjects(ctx, models.ProjectSearchParams{
		MinBudget: &budget, MaxBudget: &budget,
	})
	if err != nil {
		t.Fatalf("equal min/max budget should be valid, got: %v", err)
	}
}

// TestSearch_SearchProjects_OffsetCalculation verifies the offset is correctly computed
// from page and limit values.
func TestSearch_SearchProjects_OffsetCalculation(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	// page=3, limit=10 → offset = (3-1)*10 = 20
	result, err := svc.SearchProjects(ctx, models.ProjectSearchParams{Page: 3, Limit: 10})
	if err != nil {
		t.Fatalf("SearchProjects failed: %v", err)
	}
	if result.Offset != 20 {
		t.Errorf("expected Offset=20 for page=3,limit=10, got %d", result.Offset)
	}
	if result.Limit != 10 {
		t.Errorf("expected Limit=10, got %d", result.Limit)
	}
}

// TestSearch_SearchProjects_PaginationDefaults verifies defaults for invalid inputs.
func TestSearch_SearchProjects_PaginationDefaults(t *testing.T) {
	svc := newTestSearchService(&mockSearchRepo{})
	ctx := context.Background()

	result, err := svc.SearchProjects(ctx, models.ProjectSearchParams{Page: 0, Limit: 0})
	if err != nil {
		t.Fatalf("SearchProjects failed: %v", err)
	}
	if result.Limit != 20 {
		t.Errorf("expected limit=20 for limit=0, got %d", result.Limit)
	}
}
