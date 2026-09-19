package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/handlers"
	"workstream-backend/internal/middleware"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

// ─── Test Helper: Create AuthService ──────────────────────────────────────────
func newTestAuthService() *services.AuthService {
	return services.NewAuthService(nil, "test-super-secret-key-at-least-32-chars-long", 24)
}

// ─── 1. Authentication Security Tests ─────────────────────────────────────────

func TestSecurity_MissingJWT(t *testing.T) {
	authService := newTestAuthService()
	r := gin.New()
	r.GET("/api/protected", middleware.RequireAuth(authService), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for missing JWT, got %d", w.Code)
	}
}

func TestSecurity_InvalidJWT(t *testing.T) {
	authService := newTestAuthService()
	r := gin.New()
	r.GET("/api/protected", middleware.RequireAuth(authService), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Malformed token
	req := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid.jwt.token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for invalid JWT, got %d", w.Code)
	}
}

func TestSecurity_ExpiredJWT(t *testing.T) {
	authService := newTestAuthService()
	// Generate an expired token (negative expiration)
	shortAuth := services.NewAuthService(nil, "test-super-secret-key-at-least-32-chars-long", -1)
	user := &models.User{
		ID:    "usr_test",
		Email: "test@example.com",
		Role:  "buyer",
	}
	expiredToken, err := shortAuth.GenerateToken(user)
	if err != nil {
		t.Fatalf("failed to generate expired token: %v", err)
	}

	r := gin.New()
	r.GET("/api/protected", middleware.RequireAuth(authService), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	req.Header.Set("Authorization", "Bearer "+expiredToken)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for expired JWT, got %d", w.Code)
	}
}

// ─── 2. Authorization & RBAC Tests ────────────────────────────────────────────

func TestSecurity_RBAC_RoleMismatch(t *testing.T) {
	authService := newTestAuthService()
	buyerUser := &models.User{
		ID:    "usr_buyer",
		Email: "buyer@example.com",
		Role:  "buyer",
	}
	buyerToken, _ := authService.GenerateToken(buyerUser)

	r := gin.New()
	// Only seller or admin allowed
	sellerGroup := r.Group("/api/seller-only", middleware.RequireAuth(authService), middleware.RequireRole("seller", "admin"))
	{
		sellerGroup.POST("/services", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"created": true})
		})
	}

	req := httptest.NewRequest(http.MethodPost, "/api/seller-only/services", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+buyerToken)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for buyer attempting seller route, got %d", w.Code)
	}
}

func TestSecurity_RBAC_AdminEndpoint(t *testing.T) {
	authService := newTestAuthService()
	sellerUser := &models.User{
		ID:    "usr_seller",
		Email: "seller@example.com",
		Role:  "seller",
	}
	sellerToken, _ := authService.GenerateToken(sellerUser)

	r := gin.New()
	adminGroup := r.Group("/api/admin", middleware.RequireAuth(authService), middleware.RequireRole("admin"))
	{
		adminGroup.GET("/analytics", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"analytics": "secret"})
		})
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admin/analytics", nil)
	req.Header.Set("Authorization", "Bearer "+sellerToken)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for non-admin accessing admin endpoint, got %d", w.Code)
	}
}

// ─── 3. IDOR Protection Tests ─────────────────────────────────────────────────

func TestSecurity_IDOR_ProjectMatching(t *testing.T) {
	authService := newTestAuthService()
	unauthorizedBuyer := &models.User{
		ID:    "usr_buyer_attacker",
		Email: "attacker@example.com",
		Role:  "buyer",
	}
	token, _ := authService.GenerateToken(unauthorizedBuyer)

	// Mock project repository that returns a project belonging to usr_buyer_victim
	fakeProjRepo := &fakeProjectRepoForIDOR{
		project: &models.Project{
			ID:      "prj_victim",
			BuyerID: "usr_buyer_victim",
			Title:   "Victim Private Project",
		},
	}

	matchingHandler := handlers.NewMatchingHandler(nil, fakeProjRepo)

	r := gin.New()
	r.GET("/api/projects/:id/matches", middleware.RequireAuth(authService), matchingHandler.GetProjectMatches)

	req := httptest.NewRequest(http.MethodGet, "/api/projects/prj_victim/matches", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden on IDOR project match attempt, got %d", w.Code)
	}
}

type fakeProjectRepoForIDOR struct {
	repositories.ProjectRepository
	project *models.Project
}

func (f *fakeProjectRepoForIDOR) GetByID(ctx context.Context, id string) (*models.Project, error) {
	if f.project != nil && f.project.ID == id {
		return f.project, nil
	}
	return nil, repositories.ErrProjectNotFound
}

// ─── 4. Input Validation Tests ────────────────────────────────────────────────

func TestSecurity_InputValidation_Reviews(t *testing.T) {
	r := gin.New()
	r.POST("/api/reviews", func(c *gin.Context) {
		var req models.CreateContractReviewRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"status": "ok"})
	})

	// Rating = 7 (exceeds max 5)
	badReview := `{"contract_id":"ctr_123","rating":7,"comment":"Great work on the project!"}`
	req := httptest.NewRequest(http.MethodPost, "/api/reviews", strings.NewReader(badReview))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for rating > 5, got %d", w.Code)
	}

	// Rating = 0 (below min 1)
	badReview2 := `{"contract_id":"ctr_123","rating":0,"comment":"Awful experience"}`
	req2 := httptest.NewRequest(http.MethodPost, "/api/reviews", strings.NewReader(badReview2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for rating < 1, got %d", w2.Code)
	}
}

// ─── 5. Financial Atomicity & State Protection Tests ──────────────────────────

func TestSecurity_Financial_DuplicateFundMilestone(t *testing.T) {
	fakePayments := &fakePaymentRepoForSecurity{}
	fakeMilestones := &fakeMilestoneRepoForSecurity{
		milestone: &models.Milestone{
			ID:         "mls_101",
			ContractID: "ctr_202",
			Amount:     250.00,
			Status:     models.MilestoneStatusPending,
		},
	}
	fakeContracts := &fakeContractRepoForSecurity{
		contract: &models.Contract{
			ID:           "ctr_202",
			BuyerID:      "usr_buyer_owner",
			FreelancerID: "usr_freelancer",
		},
	}

	paymentService := services.NewPaymentService(fakePayments, fakeMilestones, fakeContracts)

	// First fund call -> succeeds
	p1, err := paymentService.FundMilestone(context.Background(), "mls_101", "usr_buyer_owner", "buyer")
	if err != nil {
		t.Fatalf("initial fund should succeed, got %v", err)
	}
	if p1 == nil {
		t.Fatalf("expected payment object on fund")
	}

	// Second fund call for the same milestone -> rejected with conflict
	_, err2 := paymentService.FundMilestone(context.Background(), "mls_101", "usr_buyer_owner", "buyer")
	if err2 == nil {
		t.Fatalf("expected duplicate milestone funding to be rejected")
	}
}

func TestSecurity_Financial_MilestoneZeroAmount(t *testing.T) {
	fakePayments := &fakePaymentRepoForSecurity{}
	fakeMilestones := &fakeMilestoneRepoForSecurity{
		milestone: &models.Milestone{
			ID:         "mls_zero",
			ContractID: "ctr_202",
			Amount:     0.0, // zero amount
			Status:     models.MilestoneStatusPending,
		},
	}
	fakeContracts := &fakeContractRepoForSecurity{
		contract: &models.Contract{
			ID:           "ctr_202",
			BuyerID:      "usr_buyer_owner",
			FreelancerID: "usr_freelancer",
		},
	}

	paymentService := services.NewPaymentService(fakePayments, fakeMilestones, fakeContracts)
	_, err := paymentService.FundMilestone(context.Background(), "mls_zero", "usr_buyer_owner", "buyer")
	if err == nil {
		t.Fatalf("expected milestone funding with amount <= 0 to be rejected")
	}
}

func TestSecurity_Financial_ReleasePaymentStateConflict(t *testing.T) {
	fakePayments := &fakePaymentRepoForSecurity{
		payment: &models.Payment{
			ID:          "pay_already_released",
			MilestoneID: "mls_1",
			BuyerID:     "usr_buyer_owner",
			Status:      models.PaymentStatusReleased, // already released
		},
	}
	fakeMilestones := &fakeMilestoneRepoForSecurity{}
	fakeContracts := &fakeContractRepoForSecurity{}

	paymentService := services.NewPaymentService(fakePayments, fakeMilestones, fakeContracts)
	err := paymentService.ReleasePayment(context.Background(), "pay_already_released", "usr_buyer_owner", "buyer")
	if err == nil {
		t.Fatalf("expected double release of already-released payment to be rejected")
	}
}

// ─── 6. Phase 10 Search & Recommendation Security Tests ───────────────────────

func TestSecurity_Search_SQLInjectionAttempt(t *testing.T) {
	fakeSearch := &fakeSearchRepo{}
	searchService := services.NewSearchService(fakeSearch)
	searchHandler := handlers.NewSearchHandler(searchService)

	r := gin.New()
	r.GET("/api/search/services", searchHandler.SearchServices)

	// Query with SQL injection payload (properly URL-encoded for HTTP transport)
	sqlInjectionQuery := "/api/search/services?q=%27%20OR%201%3D1%3B%20DROP%20TABLE%20users%3B--"
	req := httptest.NewRequest(http.MethodGet, sqlInjectionQuery, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Must handle gracefully with 200 OK or 400 Bad Request, never 500 panic
	if w.Code != http.StatusOK && w.Code != http.StatusBadRequest {
		t.Fatalf("expected safe handling of SQL injection string, got status %d", w.Code)
	}
}

func TestSecurity_Recommendation_InvalidInteraction(t *testing.T) {
	fakeRec := &fakeRecRepo{}
	recService := services.NewRecommendationService(fakeRec)
	recHandler := handlers.NewRecommendationHandler(recService)

	r := gin.New()
	r.POST("/api/recommendations/events", recHandler.RecordInteraction)

	// Invalid interaction type
	badEvent := `{"interaction_type":"malicious_type_injection","target_type":"service","target_id":"srv_123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/recommendations/events", strings.NewReader(badEvent))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError && w.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid interaction type to be rejected, got %d", w.Code)
	}
}

// ─── 7. Health Check Readiness Test ───────────────────────────────────────────

type fakeHealthyDB struct{}

func (f *fakeHealthyDB) PingContext(ctx context.Context) error {
	return nil
}

type fakeFailingDB struct{}

func (f *fakeFailingDB) PingContext(ctx context.Context) error {
	return context.DeadlineExceeded
}

func TestSecurity_HealthCheck(t *testing.T) {
	// 1. Healthy database check
	h1 := handlers.NewHealthHandler(&fakeHealthyDB{})
	r1 := gin.New()
	r1.GET("/api/health", h1.CheckHealth)

	req1 := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w1 := httptest.NewRecorder()
	r1.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("expected health status 200, got %d", w1.Code)
	}
	var body1 map[string]interface{}
	_ = json.Unmarshal(w1.Body.Bytes(), &body1)
	if body1["status"] != "ok" || body1["database"] != "connected" {
		t.Errorf("expected status ok and database connected, got %+v", body1)
	}

	// 2. Degraded database check
	h2 := handlers.NewHealthHandler(&fakeFailingDB{})
	r2 := gin.New()
	r2.GET("/api/health", h2.CheckHealth)

	req2 := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w2 := httptest.NewRecorder()
	r2.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected health status 200 (degraded), got %d", w2.Code)
	}
	var body2 map[string]interface{}
	_ = json.Unmarshal(w2.Body.Bytes(), &body2)
	if body2["status"] != "degraded" || body2["database"] != "disconnected" {
		t.Errorf("expected status degraded and database disconnected, got %+v", body2)
	}
}

// ─── In-Memory Fakes for Financial Security Tests ─────────────────────────────

type fakePaymentRepoForSecurity struct {
	repositories.PaymentRepository
	payment  *models.Payment
	payments map[string]*models.Payment
}

func (f *fakePaymentRepoForSecurity) GetByMilestoneID(ctx context.Context, id string) (*models.Payment, error) {
	if f.payments != nil && f.payments[id] != nil {
		return f.payments[id], nil
	}
	return nil, repositories.ErrPaymentNotFound
}

func (f *fakePaymentRepoForSecurity) FundTx(ctx context.Context, p *models.Payment) error {
	if f.payments == nil {
		f.payments = make(map[string]*models.Payment)
	}
	if f.payments[p.MilestoneID] != nil {
		return repositories.ErrPaymentConflict
	}
	f.payments[p.MilestoneID] = p
	f.payment = p
	return nil
}

func (f *fakePaymentRepoForSecurity) GetByID(ctx context.Context, id string) (*models.Payment, error) {
	if f.payment != nil && (f.payment.ID == id || id == "") {
		return f.payment, nil
	}
	return nil, repositories.ErrPaymentNotFound
}

type fakeMilestoneRepoForSecurity struct {
	repositories.MilestoneRepository
	milestone *models.Milestone
}

func (f *fakeMilestoneRepoForSecurity) GetByID(ctx context.Context, id string) (*models.Milestone, error) {
	if f.milestone != nil && f.milestone.ID == id {
		return f.milestone, nil
	}
	return nil, repositories.ErrMilestoneNotFound
}

type fakeContractRepoForSecurity struct {
	repositories.ContractRepository
	contract *models.Contract
}

func (f *fakeContractRepoForSecurity) GetByID(ctx context.Context, id string) (*models.Contract, error) {
	if f.contract != nil && f.contract.ID == id {
		return f.contract, nil
	}
	return nil, repositories.ErrContractNotFound
}
