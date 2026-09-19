package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/handlers"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

// ─── Fake Search Repository ────────────────────────────────────────────────
type fakeSearchRepo struct {
	services []models.Service
	projects []models.Project
}

func (f *fakeSearchRepo) SearchServices(ctx context.Context, p models.ServiceSearchParams) ([]models.ServiceSearchResult, int, error) {
	var results []models.ServiceSearchResult
	for _, s := range f.services {
		if p.Category != "" && s.CategorySlug != p.Category {
			continue
		}
		if p.MinPrice != nil && s.StartingPrice < *p.MinPrice {
			continue
		}
		if p.MaxPrice != nil && s.StartingPrice > *p.MaxPrice {
			continue
		}
		if p.MinRating != nil && s.Rating < *p.MinRating {
			continue
		}
		results = append(results, models.ServiceSearchResult{
			Service:        s,
			RelevanceScore: 85.0,
			Highlights:     []string{"Matched title"},
		})
	}
	return results, len(results), nil
}

func (f *fakeSearchRepo) SearchFreelancers(ctx context.Context, p models.FreelancerSearchParams) ([]models.FreelancerSearchResult, int, error) {
	return []models.FreelancerSearchResult{
		{
			User: models.User{
				ID:     "u_1",
				Name:   "Sarah Developer",
				Skills: []string{"React", "TypeScript"},
			},
			AverageRating: 4.9,
			RatingCount:   15,
			GrowthTier:    "Top Performer",
			MatchScore:    92.0,
		},
	}, 1, nil
}

func (f *fakeSearchRepo) SearchProjects(ctx context.Context, p models.ProjectSearchParams) ([]models.Project, int, error) {
	return f.projects, len(f.projects), nil
}

// ─── Fake Recommendation Repository ─────────────────────────────────────────
type fakeRecRepo struct {
	services []models.Service
}

func (f *fakeRecRepo) GetPersonalizedServices(ctx context.Context, userID string, limit int) ([]models.Service, error) {
	return f.services, nil
}

func (f *fakeRecRepo) RecordInteraction(ctx context.Context, event models.UserInteractionEvent) error {
	return nil
}

// ─── Fake Project Repository ────────────────────────────────────────────────
type fakeProjRepo struct {
	project *models.Project
}

func (f *fakeProjRepo) GetByID(ctx context.Context, id string) (*models.Project, error) {
	if f.project != nil && f.project.ID == id {
		return f.project, nil
	}
	return nil, repositories.ErrProjectNotFound
}

func (f *fakeProjRepo) GetAll(ctx context.Context, filters models.ProjectFilters) ([]models.Project, int, error) {
	return nil, 0, nil
}
func (f *fakeProjRepo) GetByBuyerID(ctx context.Context, buyerID string) ([]models.Project, error) {
	if f.project != nil {
		return []models.Project{*f.project}, nil
	}
	return nil, nil
}
func (f *fakeProjRepo) Create(ctx context.Context, project *models.Project) error {
	return nil
}
func (f *fakeProjRepo) Update(ctx context.Context, id string, project *models.Project) error {
	return nil
}
func (f *fakeProjRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	return nil
}
func (f *fakeProjRepo) Delete(ctx context.Context, id string) error {
	return nil
}
func (f *fakeProjRepo) CheckOwnership(ctx context.Context, projectID, buyerID string) (bool, *models.Project, error) {
	return true, f.project, nil
}
func (f *fakeProjRepo) IncrementProposalCount(ctx context.Context, projectID string) error {
	return nil
}
func (f *fakeProjRepo) DecrementProposalCount(ctx context.Context, projectID string) error {
	return nil
}

// ─── Fake Matching Service ──────────────────────────────────────────────────
type fakeMatchService struct{}

func (f *fakeMatchService) ScoreFreelancer(project *models.Project, candidate models.FreelancerSearchResult) models.ProjectFreelancerMatch {
	return models.ProjectFreelancerMatch{
		Freelancer: candidate,
		MatchScore: 94,
		Breakdown: models.MatchBreakdown{
			SkillMatch: 100,
			Trust:      90,
			Rating:     95,
			Experience: 90,
			Budget:     100,
		},
		Reasons: []string{"Full match on all required skills (React, TypeScript)"},
	}
}

func (f *fakeMatchService) GetMatchesForProject(ctx context.Context, project *models.Project, page, limit int) (*models.ProjectMatchesResponse, error) {
	match := f.ScoreFreelancer(project, models.FreelancerSearchResult{
		User: models.User{
			ID:     "usr_fl_1",
			Name:   "Alex Coder",
			Skills: []string{"React", "TypeScript"},
		},
		AverageRating: 4.9,
		GrowthTier:    "Top Performer",
	})
	return &models.ProjectMatchesResponse{
		ProjectID:   project.ID,
		ProjectName: project.Title,
		Matches:     []models.ProjectFreelancerMatch{match},
		Total:       1,
		Page:        page,
		Limit:       limit,
	}, nil
}

// ─── Tests ──────────────────────────────────────────────────────────────────

func TestSearchServicesEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	sampleServices := []models.Service{
		{ID: "srv_1", Title: "React Web Development", StartingPrice: 500, Rating: 4.9, CategorySlug: "programming-tech", Status: "published"},
		{ID: "srv_2", Title: "Logo & Brand Design", StartingPrice: 200, Rating: 4.5, CategorySlug: "graphics-design", Status: "published"},
		{ID: "srv_3", Title: "Enterprise Go Backend", StartingPrice: 1500, Rating: 5.0, CategorySlug: "programming-tech", Status: "published"},
	}

	searchRepo := &fakeSearchRepo{services: sampleServices}
	searchSvc := services.NewSearchService(searchRepo)
	searchHandler := handlers.NewSearchHandler(searchSvc)

	r := gin.New()
	r.GET("/api/search/services", searchHandler.SearchServices)

	// 1. Basic search
	req := httptest.NewRequest(http.MethodGet, "/api/search/services?category=programming-tech", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Success bool                         `json:"success"`
		Data    models.ServiceSearchResponse `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Data.Total != 2 {
		t.Errorf("expected 2 services in programming-tech, got %d", resp.Data.Total)
	}

	// 2. Price filter: min_price=1000
	reqPrice := httptest.NewRequest(http.MethodGet, "/api/search/services?category=programming-tech&min_price=1000", nil)
	wPrice := httptest.NewRecorder()
	r.ServeHTTP(wPrice, reqPrice)

	var respPrice struct {
		Success bool                         `json:"success"`
		Data    models.ServiceSearchResponse `json:"data"`
	}
	_ = json.Unmarshal(wPrice.Body.Bytes(), &respPrice)
	if respPrice.Data.Total != 1 {
		t.Errorf("expected 1 service with min_price=1000, got %d", respPrice.Data.Total)
	}

	// 3. Validation: min_price > max_price -> 400 Bad Request
	reqInvalid := httptest.NewRequest(http.MethodGet, "/api/search/services?min_price=500&max_price=200", nil)
	wInvalid := httptest.NewRecorder()
	r.ServeHTTP(wInvalid, reqInvalid)
	if wInvalid.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for min_price > max_price, got %d", wInvalid.Code)
	}
}

func TestProjectMatchingAuthorization(t *testing.T) {
	gin.SetMode(gin.TestMode)

	project := &models.Project{
		ID:      "proj_owner_1",
		BuyerID: "usr_buyer_alice",
		Title:   "Mobile App React Native",
		Skills:  []string{"React", "TypeScript"},
	}

	projRepo := &fakeProjRepo{project: project}
	matchingSvc := &fakeMatchService{}
	matchingHandler := handlers.NewMatchingHandler(matchingSvc, projRepo)

	r := gin.New()

	// Inject custom auth context for testing
	r.GET("/api/projects/:id/matches", func(c *gin.Context) {
		role := c.GetHeader("X-Test-Role")
		userID := c.GetHeader("X-Test-User")
		c.Set("role", role)
		c.Set("user_id", userID)
		matchingHandler.GetProjectMatches(c)
	})

	// 1. Authorized Buyer (Alice owns project) -> 200 OK
	reqAuth := httptest.NewRequest(http.MethodGet, "/api/projects/proj_owner_1/matches", nil)
	reqAuth.Header.Set("X-Test-Role", "buyer")
	reqAuth.Header.Set("X-Test-User", "usr_buyer_alice")
	wAuth := httptest.NewRecorder()
	r.ServeHTTP(wAuth, reqAuth)

	if wAuth.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for project owner, got %d: %s", wAuth.Code, wAuth.Body.String())
	}

	var matchResp struct {
		Success bool                          `json:"success"`
		Data    models.ProjectMatchesResponse `json:"data"`
	}
	_ = json.Unmarshal(wAuth.Body.Bytes(), &matchResp)
	if matchResp.Data.Total != 1 || matchResp.Data.Matches[0].MatchScore != 94 {
		t.Errorf("unexpected match response: %+v", matchResp.Data)
	}

	// 2. Unauthorized Buyer (Bob doesn't own project) -> 403 Forbidden
	reqUnauth := httptest.NewRequest(http.MethodGet, "/api/projects/proj_owner_1/matches", nil)
	reqUnauth.Header.Set("X-Test-Role", "buyer")
	reqUnauth.Header.Set("X-Test-User", "usr_buyer_bob")
	wUnauth := httptest.NewRecorder()
	r.ServeHTTP(wUnauth, reqUnauth)

	if wUnauth.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for different buyer, got %d", wUnauth.Code)
	}

	// 3. Admin can access any project matches -> 200 OK
	reqAdmin := httptest.NewRequest(http.MethodGet, "/api/projects/proj_owner_1/matches", nil)
	reqAdmin.Header.Set("X-Test-Role", "admin")
	reqAdmin.Header.Set("X-Test-User", "usr_admin_charlie")
	wAdmin := httptest.NewRecorder()
	r.ServeHTTP(wAdmin, reqAdmin)

	if wAdmin.Code != http.StatusOK {
		t.Errorf("expected 200 OK for admin, got %d", wAdmin.Code)
	}
}

func TestRecommendationsEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	sampleServices := []models.Service{
		{ID: "srv_rec_1", Title: "Recommended AI Service", Rating: 5.0, IsFeatured: true},
	}

	recRepo := &fakeRecRepo{services: sampleServices}
	recSvc := services.NewRecommendationService(recRepo)
	recHandler := handlers.NewRecommendationHandler(recSvc)

	r := gin.New()
	r.GET("/api/recommendations/services", recHandler.GetRecommendedServices)

	req := httptest.NewRequest(http.MethodGet, "/api/recommendations/services?limit=4", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Services []models.Service `json:"services"`
			Limit    int              `json:"limit"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if len(resp.Data.Services) != 1 {
		t.Errorf("expected 1 service, got %d", len(resp.Data.Services))
	}
}

var _ = time.Now
