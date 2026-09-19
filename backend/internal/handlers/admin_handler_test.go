package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/handlers"
	"workstream-backend/internal/middleware"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ─── In-Memory Mocks for Testing ───────────────────────────────────────────

type fakeAdminRepo struct {
	mu       sync.RWMutex
	users    map[string]*models.AdminUserItem
	services map[string]*models.Service
	projects map[string]*models.Project
}

func newFakeAdminRepo() *fakeAdminRepo {
	return &fakeAdminRepo{
		users: map[string]*models.AdminUserItem{
			"usr_admin": {
				User: models.User{
					ID:       "usr_admin",
					Name:     "Admin User",
					Email:    "admin@workstream.io",
					Role:     "admin",
					Status:   "active",
					IsActive: true,
				},
			},
			"usr_buyer": {
				User: models.User{
					ID:       "usr_buyer",
					Name:     "Buyer User",
					Email:    "buyer@workstream.io",
					Role:     "buyer",
					Status:   "active",
					IsActive: true,
				},
			},
			"usr_seller": {
				User: models.User{
					ID:       "usr_seller",
					Name:     "Seller User",
					Email:    "seller@workstream.io",
					Role:     "seller",
					Status:   "active",
					IsActive: true,
				},
			},
		},
		services: map[string]*models.Service{
			"srv_pending": {
				ID:       "srv_pending",
				Title:    "Pending Service",
				SellerID: "usr_seller",
				Status:   "pending_review",
			},
			"srv_published": {
				ID:       "srv_published",
				Title:    "Published Service",
				SellerID: "usr_seller",
				Status:   "published",
			},
		},
		projects: map[string]*models.Project{
			"prj_open": {
				ID:      "prj_open",
				Title:   "Open Project",
				BuyerID: "usr_buyer",
				Status:  "open",
			},
		},
	}
}

func (f *fakeAdminRepo) ListUsers(_ context.Context, search, role, status string, limit, offset int) ([]*models.AdminUserItem, int, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	var res []*models.AdminUserItem
	for _, u := range f.users {
		if role != "" && role != "all" && u.Role != role {
			continue
		}
		if status != "" && status != "all" && u.Status != status {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(u.Name), strings.ToLower(search)) {
			continue
		}
		res = append(res, u)
	}
	return res, len(res), nil
}

func (f *fakeAdminRepo) GetUserByID(_ context.Context, id string) (*models.AdminUserItem, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	u, ok := f.users[id]
	if !ok {
		return nil, repositories.ErrUserNotFound
	}
	return u, nil
}

func (f *fakeAdminRepo) UpdateUserStatus(_ context.Context, id string, status string, isActive bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[id]
	if !ok {
		return repositories.ErrUserNotFound
	}
	u.Status = status
	u.IsActive = isActive
	return nil
}

func (f *fakeAdminRepo) ListServices(_ context.Context, search, status string, limit, offset int) ([]*models.Service, int, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	var res []*models.Service
	for _, s := range f.services {
		if status != "" && status != "all" && s.Status != status {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(s.Title), strings.ToLower(search)) {
			continue
		}
		res = append(res, s)
	}
	return res, len(res), nil
}

func (f *fakeAdminRepo) GetServiceByID(_ context.Context, id string) (*models.Service, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	s, ok := f.services[id]
	if !ok {
		return nil, repositories.ErrServiceNotFound
	}
	return s, nil
}

func (f *fakeAdminRepo) UpdateServiceStatus(_ context.Context, id string, status string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.services[id]
	if !ok {
		return repositories.ErrServiceNotFound
	}
	s.Status = status
	return nil
}

func (f *fakeAdminRepo) ListProjects(_ context.Context, search, status string, limit, offset int) ([]*models.Project, int, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	var res []*models.Project
	for _, p := range f.projects {
		if status != "" && status != "all" && p.Status != status {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(p.Title), strings.ToLower(search)) {
			continue
		}
		res = append(res, p)
	}
	return res, len(res), nil
}

func (f *fakeAdminRepo) GetProjectByID(_ context.Context, id string) (*models.Project, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	p, ok := f.projects[id]
	if !ok {
		return nil, repositories.ErrProjectNotFound
	}
	return p, nil
}

func (f *fakeAdminRepo) UpdateProjectStatus(_ context.Context, id string, status string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	p, ok := f.projects[id]
	if !ok {
		return repositories.ErrProjectNotFound
	}
	p.Status = status
	return nil
}

func (f *fakeAdminRepo) GetAnalytics(_ context.Context) (*models.AdminAnalytics, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	var stats models.AdminAnalytics
	stats.Users.Total = len(f.users)
	stats.Marketplace.TotalServices = len(f.services)
	stats.Marketplace.TotalProjects = len(f.projects)
	return &stats, nil
}

type fakeReportRepo struct {
	mu      sync.RWMutex
	reports map[string]*models.Report
}

func newFakeReportRepo() *fakeReportRepo {
	return &fakeReportRepo{
		reports: map[string]*models.Report{
			"rep_1": {
				ID:          "rep_1",
				ReporterID:  "usr_buyer",
				TargetType:  "service",
				TargetID:    "srv_published",
				Reason:      "Misleading description",
				Description: "The service does not match the title.",
				Status:      models.ReportStatusOpen,
				CreatedAt:   time.Now().UTC(),
				UpdatedAt:   time.Now().UTC(),
			},
		},
	}
}

func (r *fakeReportRepo) VerifyTargetExists(_ context.Context, targetType, targetID string) (bool, string, error) {
	if targetType == "service" && targetID == "srv_published" {
		return true, "Published Service", nil
	}
	if targetType == "user" && (targetID == "usr_buyer" || targetID == "usr_seller") {
		return true, "User Account", nil
	}
	return false, "", nil
}

func (r *fakeReportRepo) CreateReport(_ context.Context, report *models.Report) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if report.ID == "" {
		report.ID = fmt.Sprintf("rep_%d", time.Now().UnixNano())
	}
	r.reports[report.ID] = report
	return nil
}

func (r *fakeReportRepo) GetReportByID(_ context.Context, id string) (*models.Report, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	rep, ok := r.reports[id]
	if !ok {
		return nil, repositories.ErrReportNotFound
	}
	return rep, nil
}

func (r *fakeReportRepo) ListReports(_ context.Context, status string, limit, offset int) ([]*models.Report, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var res []*models.Report
	for _, rep := range r.reports {
		if status != "" && status != "all" && rep.Status != status {
			continue
		}
		res = append(res, rep)
	}
	return res, len(res), nil
}

func (r *fakeReportRepo) UpdateReportStatus(_ context.Context, id string, status string, adminID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	rep, ok := r.reports[id]
	if !ok {
		return repositories.ErrReportNotFound
	}
	if rep.Status == models.ReportStatusResolved || rep.Status == models.ReportStatusDismissed {
		return repositories.ErrInvalidStatusChange
	}
	rep.Status = status
	rep.AssignedAdminID = &adminID
	return nil
}

func (r *fakeReportRepo) ResolveReport(_ context.Context, id string, note string, adminID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	rep, ok := r.reports[id]
	if !ok {
		return repositories.ErrReportNotFound
	}
	if rep.Status == models.ReportStatusResolved || rep.Status == models.ReportStatusDismissed {
		return repositories.ErrInvalidStatusChange
	}
	rep.Status = models.ReportStatusResolved
	rep.ResolutionNote = &note
	rep.AssignedAdminID = &adminID
	now := time.Now().UTC()
	rep.ResolvedAt = &now
	return nil
}

func (r *fakeReportRepo) DismissReport(_ context.Context, id string, note string, adminID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	rep, ok := r.reports[id]
	if !ok {
		return repositories.ErrReportNotFound
	}
	if rep.Status == models.ReportStatusResolved || rep.Status == models.ReportStatusDismissed {
		return repositories.ErrInvalidStatusChange
	}
	rep.Status = models.ReportStatusDismissed
	rep.ResolutionNote = &note
	rep.AssignedAdminID = &adminID
	now := time.Now().UTC()
	rep.ResolvedAt = &now
	return nil
}

type fakeAuditRepo struct {
	mu   sync.RWMutex
	logs []*models.AuditLog
}

func (a *fakeAuditRepo) CreateAuditLog(_ context.Context, log *models.AuditLog) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.logs = append(a.logs, log)
	return nil
}

func (a *fakeAuditRepo) ListAuditLogs(_ context.Context, action, entityType string, limit, offset int) ([]*models.AuditLog, int, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.logs, len(a.logs), nil
}

type fakeCommRepo struct {
	notifications []models.Notification
}

func (c *fakeCommRepo) CreateNotification(_ context.Context, n *models.Notification) error {
	c.notifications = append(c.notifications, *n)
	return nil
}
func (c *fakeCommRepo) Notifications(context.Context, string, int, bool) ([]models.Notification, int, error) {
	return nil, 0, nil
}
func (c *fakeCommRepo) MarkNotificationRead(context.Context, string, string) error { return nil }
func (c *fakeCommRepo) MarkAllRead(context.Context, string) error                  { return nil }
func (c *fakeCommRepo) CreateOrGetConversation(context.Context, string, string, string, string) (*models.Conversation, error) {
	return nil, nil
}
func (c *fakeCommRepo) Conversations(context.Context, string) ([]models.Conversation, error) {
	return nil, nil
}
func (c *fakeCommRepo) Conversation(context.Context, string, string) (*models.Conversation, error) {
	return nil, nil
}
func (c *fakeCommRepo) Messages(context.Context, string, string, int) ([]models.Message, error) {
	return nil, nil
}
func (c *fakeCommRepo) SendMessage(context.Context, *models.Message) error               { return nil }
func (c *fakeCommRepo) MarkConversationRead(context.Context, string, string) error      { return nil }
func (c *fakeCommRepo) RecordActivity(context.Context, *models.ActivityEvent) error     { return nil }
func (c *fakeCommRepo) Activity(context.Context, string, string, int) ([]models.ActivityEvent, error) {
	return nil, nil
}

// ─── Setup Test Engine ─────────────────────────────────────────────────────

type testSuite struct {
	router       *gin.Engine
	authService  *services.AuthService
	adminRepo    *fakeAdminRepo
	reportRepo   *fakeReportRepo
	auditRepo    *fakeAuditRepo
	commRepo     *fakeCommRepo
	adminToken   string
	buyerToken   string
	sellerToken  string
}

func setupAdminTest() *testSuite {
	adminRepo := newFakeAdminRepo()
	reportRepo := newFakeReportRepo()
	auditRepo := &fakeAuditRepo{}
	commRepo := &fakeCommRepo{}

	adminService := services.NewAdminService(adminRepo, reportRepo, auditRepo, commRepo)
	adminHandler := handlers.NewAdminHandler(adminService)

	jwtSecret := "super-secure-test-jwt-secret-phase9"
	authService := services.NewAuthService(nil, jwtSecret, 24)

	adminToken, _ := authService.GenerateToken(&models.User{ID: "usr_admin", Email: "admin@workstream.io", Role: "admin"})
	buyerToken, _ := authService.GenerateToken(&models.User{ID: "usr_buyer", Email: "buyer@workstream.io", Role: "buyer"})
	sellerToken, _ := authService.GenerateToken(&models.User{ID: "usr_seller", Email: "seller@workstream.io", Role: "seller"})

	r := gin.New()
	api := r.Group("/api")
	{
		api.POST("/reports", middleware.RequireAuth(authService), adminHandler.CreateReport)

		admin := api.Group("/admin", middleware.RequireAuth(authService), middleware.RequireRole("admin"))
		{
			admin.GET("/analytics", adminHandler.GetAnalytics)
			admin.GET("/users", adminHandler.ListUsers)
			admin.GET("/users/:id", adminHandler.GetUser)
			admin.PATCH("/users/:id/suspend", adminHandler.SuspendUser)
			admin.PATCH("/users/:id/reactivate", adminHandler.ReactivateUser)

			admin.GET("/services", adminHandler.ListServices)
			admin.GET("/services/:id", adminHandler.GetService)
			admin.PATCH("/services/:id/approve", adminHandler.ApproveService)
			admin.PATCH("/services/:id/reject", adminHandler.RejectService)
			admin.PATCH("/services/:id/suspend", adminHandler.SuspendService)

			admin.GET("/projects", adminHandler.ListProjects)
			admin.GET("/projects/:id", adminHandler.GetProject)
			admin.PATCH("/projects/:id/suspend", adminHandler.SuspendProject)

			admin.GET("/reports", adminHandler.ListReports)
			admin.GET("/reports/:id", adminHandler.GetReport)
			admin.PATCH("/reports/:id/review", adminHandler.ReviewReport)
			admin.PATCH("/reports/:id/resolve", adminHandler.ResolveReport)
			admin.PATCH("/reports/:id/dismiss", adminHandler.DismissReport)

			admin.GET("/audit-logs", adminHandler.ListAuditLogs)
		}
	}

	return &testSuite{
		router:      r,
		authService: authService,
		adminRepo:   adminRepo,
		reportRepo:  reportRepo,
		auditRepo:   auditRepo,
		commRepo:    commRepo,
		adminToken:  adminToken,
		buyerToken:  buyerToken,
		sellerToken: sellerToken,
	}
}

func doRequest(r *gin.Engine, method, path, token string, body interface{}) *httptest.ResponseRecorder {
	var jsonBytes []byte
	if body != nil {
		jsonBytes, _ = json.Marshal(body)
	}
	req, _ := http.NewRequest(method, path, bytes.NewReader(jsonBytes))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ─── Verification Tests ───────────────────────────────────────────────────

func TestAdminAccessControl(t *testing.T) {
	ts := setupAdminTest()

	// 1. Admin can access admin APIs
	wAdmin := doRequest(ts.router, "GET", "/api/admin/analytics", ts.adminToken, nil)
	if wAdmin.Code != http.StatusOK {
		t.Fatalf("Admin expected 200 on /api/admin/analytics, got %d", wAdmin.Code)
	}

	// 2. Buyer cannot access admin APIs
	wBuyer := doRequest(ts.router, "GET", "/api/admin/analytics", ts.buyerToken, nil)
	if wBuyer.Code != http.StatusForbidden {
		t.Fatalf("Buyer expected 403 on /api/admin/analytics, got %d", wBuyer.Code)
	}

	// 3. Seller cannot access admin APIs
	wSeller := doRequest(ts.router, "GET", "/api/admin/analytics", ts.sellerToken, nil)
	if wSeller.Code != http.StatusForbidden {
		t.Fatalf("Seller expected 403 on /api/admin/analytics, got %d", wSeller.Code)
	}

	// 4. Missing JWT returns 401
	wAnon := doRequest(ts.router, "GET", "/api/admin/analytics", "", nil)
	if wAnon.Code != http.StatusUnauthorized {
		t.Fatalf("Anonymous expected 401 on /api/admin/analytics, got %d", wAnon.Code)
	}
}

func TestUserSuspensionAndReactivation(t *testing.T) {
	ts := setupAdminTest()

	// 5. Admin can suspend user
	wSuspend := doRequest(ts.router, "PATCH", "/api/admin/users/usr_seller/suspend", ts.adminToken, map[string]string{
		"reason": "Terms of Service violation",
	})
	if wSuspend.Code != http.StatusOK {
		t.Fatalf("Expected 200 on user suspend, got %d: %s", wSuspend.Code, wSuspend.Body.String())
	}
	user, _ := ts.adminRepo.GetUserByID(context.Background(), "usr_seller")
	if user.Status != "suspended" || user.IsActive != false {
		t.Fatalf("Expected user to be suspended, got status %s, isActive %v", user.Status, user.IsActive)
	}

	// 6. Admin can reactivate user
	wReactivate := doRequest(ts.router, "PATCH", "/api/admin/users/usr_seller/reactivate", ts.adminToken, nil)
	if wReactivate.Code != http.StatusOK {
		t.Fatalf("Expected 200 on user reactivate, got %d: %s", wReactivate.Code, wReactivate.Body.String())
	}
	user, _ = ts.adminRepo.GetUserByID(context.Background(), "usr_seller")
	if user.Status != "active" || user.IsActive != true {
		t.Fatalf("Expected user to be active, got status %s, isActive %v", user.Status, user.IsActive)
	}

	// Admin account cannot be suspended
	wAdminSuspend := doRequest(ts.router, "PATCH", "/api/admin/users/usr_admin/suspend", ts.adminToken, map[string]string{"reason": "test"})
	if wAdminSuspend.Code != http.StatusForbidden {
		t.Fatalf("Expected 403 when trying to suspend admin, got %d", wAdminSuspend.Code)
	}
}

func TestServiceModeration(t *testing.T) {
	ts := setupAdminTest()

	// 7. Admin can approve service (pending_review -> published)
	wApprove := doRequest(ts.router, "PATCH", "/api/admin/services/srv_pending/approve", ts.adminToken, nil)
	if wApprove.Code != http.StatusOK {
		t.Fatalf("Expected 200 on service approve, got %d: %s", wApprove.Code, wApprove.Body.String())
	}
	srv, _ := ts.adminRepo.GetServiceByID(context.Background(), "srv_pending")
	if srv.Status != "published" {
		t.Fatalf("Expected service to be published, got %s", srv.Status)
	}

	// 8. Admin can reject service with reason
	ts.adminRepo.services["srv_to_reject"] = &models.Service{
		ID:       "srv_to_reject",
		Title:    "Reject Me",
		SellerID: "usr_seller",
		Status:   "pending_review",
	}
	wReject := doRequest(ts.router, "PATCH", "/api/admin/services/srv_to_reject/reject", ts.adminToken, map[string]string{
		"reason": "Violates copyright policy",
	})
	if wReject.Code != http.StatusOK {
		t.Fatalf("Expected 200 on service reject, got %d: %s", wReject.Code, wReject.Body.String())
	}
	srv, _ = ts.adminRepo.GetServiceByID(context.Background(), "srv_to_reject")
	if srv.Status != "rejected" {
		t.Fatalf("Expected service to be rejected, got %s", srv.Status)
	}

	// 9. Admin can suspend service
	wSuspend := doRequest(ts.router, "PATCH", "/api/admin/services/srv_published/suspend", ts.adminToken, map[string]string{
		"reason": "Investigation underway",
	})
	if wSuspend.Code != http.StatusOK {
		t.Fatalf("Expected 200 on service suspend, got %d: %s", wSuspend.Code, wSuspend.Body.String())
	}
	srv, _ = ts.adminRepo.GetServiceByID(context.Background(), "srv_published")
	if srv.Status != "suspended" {
		t.Fatalf("Expected service to be suspended, got %s", srv.Status)
	}
}

func TestProjectSuspension(t *testing.T) {
	ts := setupAdminTest()

	// 10. Admin can suspend project
	wSuspend := doRequest(ts.router, "PATCH", "/api/admin/projects/prj_open/suspend", ts.adminToken, map[string]string{
		"reason": "Scam or suspicious budget",
	})
	if wSuspend.Code != http.StatusOK {
		t.Fatalf("Expected 200 on project suspend, got %d: %s", wSuspend.Code, wSuspend.Body.String())
	}
	prj, _ := ts.adminRepo.GetProjectByID(context.Background(), "prj_open")
	if prj.Status != "suspended" {
		t.Fatalf("Expected project to be suspended, got %s", prj.Status)
	}
}

func TestReportSubmissionAndModeration(t *testing.T) {
	ts := setupAdminTest()

	// 11. Authenticated user can create report
	wCreate := doRequest(ts.router, "POST", "/api/reports", ts.buyerToken, map[string]string{
		"targetType":  "service",
		"targetId":    "srv_published",
		"reason":      "Misleading gig description",
		"description": "Seller claimed 24hr delivery but told in chat 2 weeks.",
	})
	if wCreate.Code != http.StatusCreated {
		t.Fatalf("Expected 201 on report creation, got %d: %s", wCreate.Code, wCreate.Body.String())
	}

	// 12. Invalid report target is rejected
	wInvalidTarget := doRequest(ts.router, "POST", "/api/reports", ts.buyerToken, map[string]string{
		"targetType":  "service",
		"targetId":    "non_existent_srv",
		"reason":      "Spam",
		"description": "Fake item",
	})
	if wInvalidTarget.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 for non-existent target, got %d: %s", wInvalidTarget.Code, wInvalidTarget.Body.String())
	}

	// 13. Non-admin cannot manage reports
	wManageBuyer := doRequest(ts.router, "PATCH", "/api/admin/reports/rep_1/resolve", ts.buyerToken, map[string]string{
		"note": "Resolved by buyer",
	})
	if wManageBuyer.Code != http.StatusForbidden {
		t.Fatalf("Expected 403 when buyer attempts to resolve report, got %d", wManageBuyer.Code)
	}

	// 14. Admin can mark report under review
	wReview := doRequest(ts.router, "PATCH", "/api/admin/reports/rep_1/review", ts.adminToken, nil)
	if wReview.Code != http.StatusOK {
		t.Fatalf("Expected 200 on report review, got %d: %s", wReview.Code, wReview.Body.String())
	}
	rep, _ := ts.reportRepo.GetReportByID(context.Background(), "rep_1")
	if rep.Status != models.ReportStatusUnderReview {
		t.Fatalf("Expected report status to be under_review, got %s", rep.Status)
	}

	// 15. Admin can resolve report
	wResolve := doRequest(ts.router, "PATCH", "/api/admin/reports/rep_1/resolve", ts.adminToken, map[string]string{
		"note": "Warning issued to seller.",
	})
	if wResolve.Code != http.StatusOK {
		t.Fatalf("Expected 200 on report resolve, got %d: %s", wResolve.Code, wResolve.Body.String())
	}
	rep, _ = ts.reportRepo.GetReportByID(context.Background(), "rep_1")
	if rep.Status != models.ReportStatusResolved {
		t.Fatalf("Expected report status to be resolved, got %s", rep.Status)
	}

	// 16. Admin can dismiss report (create a second report and dismiss it)
	_ = ts.reportRepo.CreateReport(context.Background(), &models.Report{
		ID:         "rep_dismiss_me",
		ReporterID: "usr_buyer",
		TargetType: "service",
		TargetID:   "srv_published",
		Reason:     "Spam",
		Status:     models.ReportStatusOpen,
	})
	wDismiss := doRequest(ts.router, "PATCH", "/api/admin/reports/rep_dismiss_me/dismiss", ts.adminToken, map[string]string{
		"note": "No violation found.",
	})
	if wDismiss.Code != http.StatusOK {
		t.Fatalf("Expected 200 on report dismiss, got %d: %s", wDismiss.Code, wDismiss.Body.String())
	}
	rep, _ = ts.reportRepo.GetReportByID(context.Background(), "rep_dismiss_me")
	if rep.Status != models.ReportStatusDismissed {
		t.Fatalf("Expected report status to be dismissed, got %s", rep.Status)
	}
}

func TestAuditLogAndAnalytics(t *testing.T) {
	ts := setupAdminTest()

	// Perform an admin action (suspend user)
	_ = doRequest(ts.router, "PATCH", "/api/admin/users/usr_buyer/suspend", ts.adminToken, map[string]string{
		"reason": "Test audit trigger",
	})

	// 17. Audit log is generated
	wAudit := doRequest(ts.router, "GET", "/api/admin/audit-logs", ts.adminToken, nil)
	if wAudit.Code != http.StatusOK {
		t.Fatalf("Expected 200 on audit logs, got %d", wAudit.Code)
	}
	if len(ts.auditRepo.logs) == 0 {
		t.Fatalf("Expected audit logs to be generated, got 0")
	}
	found := false
	for _, l := range ts.auditRepo.logs {
		if l.Action == models.AuditActionUserSuspended && l.EntityID == "usr_buyer" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("Expected USER_SUSPENDED audit log for usr_buyer")
	}

	// 18. Analytics returns valid aggregate data
	wAnalytics := doRequest(ts.router, "GET", "/api/admin/analytics", ts.adminToken, nil)
	if wAnalytics.Code != http.StatusOK {
		t.Fatalf("Expected 200 on analytics, got %d", wAnalytics.Code)
	}
	var res models.APIResponse
	_ = json.Unmarshal(wAnalytics.Body.Bytes(), &res)
	if !res.Success {
		t.Fatalf("Expected API response success=true")
	}

	// 19. Invalid state transitions are rejected
	// Trying to approve an already published service should return 409 Conflict
	wInvalidApprove := doRequest(ts.router, "PATCH", "/api/admin/services/srv_published/approve", ts.adminToken, nil)
	if wInvalidApprove.Code != http.StatusConflict {
		t.Fatalf("Expected 409 on approving published service, got %d", wInvalidApprove.Code)
	}

	// Trying to resolve an already resolved report should return 409 Conflict
	_ = ts.reportRepo.ResolveReport(context.Background(), "rep_1", "done", "usr_admin")
	wInvalidReport := doRequest(ts.router, "PATCH", "/api/admin/reports/rep_1/resolve", ts.adminToken, map[string]string{"note": "again"})
	if wInvalidReport.Code != http.StatusConflict {
		t.Fatalf("Expected 409 on resolving closed report, got %d", wInvalidReport.Code)
	}
}
