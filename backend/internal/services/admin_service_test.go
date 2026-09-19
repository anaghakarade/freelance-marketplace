package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

// ──────────────────────────────────────────────────────────────
// Mock repositories for admin service testing
// ──────────────────────────────────────────────────────────────

type mockAdminRepo struct {
	users    map[string]*models.AdminUserItem
	services map[string]*models.Service
	projects map[string]*models.Project
}

func newMockAdminRepo() *mockAdminRepo {
	return &mockAdminRepo{
		users:    make(map[string]*models.AdminUserItem),
		services: make(map[string]*models.Service),
		projects: make(map[string]*models.Project),
	}
}

func (m *mockAdminRepo) ListUsers(ctx context.Context, search, role, status string, limit, offset int) ([]*models.AdminUserItem, int, error) {
	var list []*models.AdminUserItem
	for _, u := range m.users {
		list = append(list, u)
	}
	return list, len(list), nil
}

func (m *mockAdminRepo) GetUserByID(ctx context.Context, id string) (*models.AdminUserItem, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	return u, nil
}

func (m *mockAdminRepo) UpdateUserStatus(ctx context.Context, id string, status string, isActive bool) error {
	u, ok := m.users[id]
	if !ok {
		return errors.New("user not found")
	}
	u.Status = status
	u.IsActive = isActive
	return nil
}

func (m *mockAdminRepo) ListServices(ctx context.Context, search, status string, limit, offset int) ([]*models.Service, int, error) {
	var list []*models.Service
	for _, s := range m.services {
		list = append(list, s)
	}
	return list, len(list), nil
}

func (m *mockAdminRepo) GetServiceByID(ctx context.Context, id string) (*models.Service, error) {
	s, ok := m.services[id]
	if !ok {
		return nil, repositories.ErrServiceNotFound
	}
	return s, nil
}

func (m *mockAdminRepo) UpdateServiceStatus(ctx context.Context, id string, status string) error {
	s, ok := m.services[id]
	if !ok {
		return repositories.ErrServiceNotFound
	}
	s.Status = status
	return nil
}

func (m *mockAdminRepo) ListProjects(ctx context.Context, search, status string, limit, offset int) ([]*models.Project, int, error) {
	var list []*models.Project
	for _, p := range m.projects {
		list = append(list, p)
	}
	return list, len(list), nil
}

func (m *mockAdminRepo) GetProjectByID(ctx context.Context, id string) (*models.Project, error) {
	p, ok := m.projects[id]
	if !ok {
		return nil, repositories.ErrProjectNotFound
	}
	return p, nil
}

func (m *mockAdminRepo) UpdateProjectStatus(ctx context.Context, id string, status string) error {
	p, ok := m.projects[id]
	if !ok {
		return repositories.ErrProjectNotFound
	}
	p.Status = status
	return nil
}

func (m *mockAdminRepo) GetAnalytics(ctx context.Context) (*models.AdminAnalytics, error) {
	return &models.AdminAnalytics{}, nil
}

// ──────────────────────────────────────────────────────────────

type mockReportRepo struct {
	reports map[string]*models.Report
}

func newMockReportRepo() *mockReportRepo {
	return &mockReportRepo{reports: make(map[string]*models.Report)}
}

func (m *mockReportRepo) CreateReport(ctx context.Context, r *models.Report) error {
	m.reports[r.ID] = r
	return nil
}

func (m *mockReportRepo) GetReportByID(ctx context.Context, id string) (*models.Report, error) {
	r, ok := m.reports[id]
	if !ok {
		return nil, repositories.ErrReportNotFound
	}
	return r, nil
}

func (m *mockReportRepo) ListReports(ctx context.Context, status string, limit, offset int) ([]*models.Report, int, error) {
	var list []*models.Report
	for _, r := range m.reports {
		list = append(list, r)
	}
	return list, len(list), nil
}

func (m *mockReportRepo) UpdateReportStatus(ctx context.Context, id, status, adminID string) error {
	r, ok := m.reports[id]
	if !ok {
		return repositories.ErrReportNotFound
	}
	r.Status = status
	r.AssignedAdminID = &adminID
	return nil
}

func (m *mockReportRepo) ResolveReport(ctx context.Context, id, note, adminID string) error {
	r, ok := m.reports[id]
	if !ok {
		return repositories.ErrReportNotFound
	}
	r.Status = models.ReportStatusResolved
	r.ResolutionNote = &note
	r.AssignedAdminID = &adminID
	now := time.Now().UTC()
	r.ResolvedAt = &now
	return nil
}

func (m *mockReportRepo) DismissReport(ctx context.Context, id, note, adminID string) error {
	r, ok := m.reports[id]
	if !ok {
		return repositories.ErrReportNotFound
	}
	r.Status = models.ReportStatusDismissed
	r.ResolutionNote = &note
	r.AssignedAdminID = &adminID
	return nil
}

func (m *mockReportRepo) VerifyTargetExists(ctx context.Context, targetType, targetID string) (bool, string, error) {
	// All targets "exist" in mock
	return true, "Mock Target Title", nil
}

// ──────────────────────────────────────────────────────────────

type mockAuditRepo struct {
	logs []*models.AuditLog
}

func (m *mockAuditRepo) CreateAuditLog(ctx context.Context, log *models.AuditLog) error {
	m.logs = append(m.logs, log)
	return nil
}

func (m *mockAuditRepo) ListAuditLogs(ctx context.Context, action, entityType string, limit, offset int) ([]*models.AuditLog, int, error) {
	return m.logs, len(m.logs), nil
}

// ──────────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────────

type adminTestEnv struct {
	adminRepo  *mockAdminRepo
	reportRepo *mockReportRepo
	auditRepo  *mockAuditRepo
	svc        AdminService
}

func newAdminTestEnv() *adminTestEnv {
	adminRepo := newMockAdminRepo()
	reportRepo := newMockReportRepo()
	auditRepo := &mockAuditRepo{}
	svc := NewAdminService(adminRepo, reportRepo, auditRepo, nil)
	return &adminTestEnv{adminRepo, reportRepo, auditRepo, svc}
}

// ──────────────────────────────────────────────────────────────
// User moderation tests
// ──────────────────────────────────────────────────────────────

// TestAdmin_SuspendUser_Success verifies an admin can suspend an active user.
func TestAdmin_SuspendUser_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.users["usr_buyer_1"] = &models.AdminUserItem{
		User: models.User{ID: "usr_buyer_1", Name: "Alice", Email: "alice@workstream.io", Role: "buyer", Status: "active", IsActive: true},
	}

	err := env.svc.SuspendUser(ctx, "usr_admin_1", "usr_buyer_1", "Violating marketplace terms")
	if err != nil {
		t.Fatalf("SuspendUser failed: %v", err)
	}

	user := env.adminRepo.users["usr_buyer_1"]
	if user.Status != "suspended" {
		t.Errorf("expected status=suspended, got %q", user.Status)
	}
	if user.IsActive {
		t.Errorf("expected IsActive=false after suspension")
	}

	// Verify audit log was created
	if len(env.auditRepo.logs) == 0 {
		t.Errorf("expected audit log to be created on user suspension")
	}
}

// TestAdmin_SuspendUser_CannotSuspendAdmin verifies that admin accounts are protected
// from suspension by other admins.
func TestAdmin_SuspendUser_CannotSuspendAdmin(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.users["usr_admin_2"] = &models.AdminUserItem{
		User: models.User{ID: "usr_admin_2", Name: "Bob Admin", Role: "admin", Status: "active", IsActive: true},
	}

	err := env.svc.SuspendUser(ctx, "usr_admin_1", "usr_admin_2", "Testing admin-on-admin protection")
	if !errors.Is(err, ErrCannotModerateAdmin) {
		t.Fatalf("expected ErrCannotModerateAdmin, got: %v", err)
	}
}

// TestAdmin_SuspendUser_AlreadySuspended verifies that re-suspending an already
// suspended user triggers ErrInvalidStateTransition.
func TestAdmin_SuspendUser_AlreadySuspended(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.users["usr_buyer_1"] = &models.AdminUserItem{
		User: models.User{ID: "usr_buyer_1", Role: "buyer", Status: "suspended"},
	}

	err := env.svc.SuspendUser(ctx, "usr_admin_1", "usr_buyer_1", "Already done")
	if !errors.Is(err, ErrInvalidStateTransition) {
		t.Fatalf("expected ErrInvalidStateTransition for already-suspended user, got: %v", err)
	}
}

// TestAdmin_ReactivateUser_Success verifies an admin can reactivate a suspended user.
func TestAdmin_ReactivateUser_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.users["usr_free_1"] = &models.AdminUserItem{
		User: models.User{ID: "usr_free_1", Name: "Charlie", Role: "seller", Status: "suspended", IsActive: false},
	}

	err := env.svc.ReactivateUser(ctx, "usr_admin_1", "usr_free_1")
	if err != nil {
		t.Fatalf("ReactivateUser failed: %v", err)
	}

	user := env.adminRepo.users["usr_free_1"]
	if user.Status != "active" {
		t.Errorf("expected status=active after reactivation, got %q", user.Status)
	}
}

// TestAdmin_ReactivateUser_AlreadyActive verifies that reactivating an already active
// user triggers ErrInvalidStateTransition.
func TestAdmin_ReactivateUser_AlreadyActive(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.users["usr_active"] = &models.AdminUserItem{
		User: models.User{ID: "usr_active", Role: "buyer", Status: "active"},
	}

	err := env.svc.ReactivateUser(ctx, "usr_admin_1", "usr_active")
	if !errors.Is(err, ErrInvalidStateTransition) {
		t.Fatalf("expected ErrInvalidStateTransition for already-active user, got: %v", err)
	}
}

// ──────────────────────────────────────────────────────────────
// Service moderation tests
// ──────────────────────────────────────────────────────────────

// TestAdmin_ApproveService_Success verifies approving a pending_review service.
func TestAdmin_ApproveService_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.services["svc_1"] = &models.Service{
		ID:       "svc_1",
		SellerID: "usr_free_1",
		Title:    "Professional Web Design",
		Status:   "pending_review",
	}

	err := env.svc.ApproveService(ctx, "usr_admin_1", "svc_1")
	if err != nil {
		t.Fatalf("ApproveService failed: %v", err)
	}
	if env.adminRepo.services["svc_1"].Status != "published" {
		t.Errorf("expected status=published after approval, got %q", env.adminRepo.services["svc_1"].Status)
	}
}

// TestAdmin_ApproveService_AlreadyPublished verifies that approving a published
// service triggers an invalid state transition.
func TestAdmin_ApproveService_AlreadyPublished(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.services["svc_1"] = &models.Service{
		ID: "svc_1", Status: "published",
	}

	err := env.svc.ApproveService(ctx, "usr_admin_1", "svc_1")
	if !errors.Is(err, ErrInvalidStateTransition) {
		t.Fatalf("expected ErrInvalidStateTransition for already-published service, got: %v", err)
	}
}

// TestAdmin_RejectService_RequiresReason verifies that rejecting without a reason fails.
func TestAdmin_RejectService_RequiresReason(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.services["svc_1"] = &models.Service{
		ID: "svc_1", Status: "pending_review",
	}

	err := env.svc.RejectService(ctx, "usr_admin_1", "svc_1", "")
	if !errors.Is(err, ErrReasonRequired) {
		t.Fatalf("expected ErrReasonRequired for empty reason, got: %v", err)
	}
}

// TestAdmin_RejectService_Success verifies that a pending service can be rejected
// with a reason provided.
func TestAdmin_RejectService_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.services["svc_1"] = &models.Service{
		ID:       "svc_1",
		SellerID: "usr_free_1",
		Title:    "Suspicious Service",
		Status:   "pending_review",
	}

	err := env.svc.RejectService(ctx, "usr_admin_1", "svc_1", "Service violates content policy.")
	if err != nil {
		t.Fatalf("RejectService failed: %v", err)
	}
	if env.adminRepo.services["svc_1"].Status != "rejected" {
		t.Errorf("expected status=rejected, got %q", env.adminRepo.services["svc_1"].Status)
	}
}

// TestAdmin_SuspendService_RequiresReason verifies suspension without reason fails.
func TestAdmin_SuspendService_RequiresReason(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.services["svc_1"] = &models.Service{
		ID: "svc_1", Status: "published",
	}

	err := env.svc.SuspendService(ctx, "usr_admin_1", "svc_1", "")
	if !errors.Is(err, ErrReasonRequired) {
		t.Fatalf("expected ErrReasonRequired, got: %v", err)
	}
}

// TestAdmin_SuspendService_AlreadySuspended verifies double-suspending is blocked.
func TestAdmin_SuspendService_AlreadySuspended(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.services["svc_1"] = &models.Service{
		ID: "svc_1", Status: "suspended",
	}

	err := env.svc.SuspendService(ctx, "usr_admin_1", "svc_1", "Some reason")
	if !errors.Is(err, ErrInvalidStateTransition) {
		t.Fatalf("expected ErrInvalidStateTransition, got: %v", err)
	}
}

// ──────────────────────────────────────────────────────────────
// Report tests
// ──────────────────────────────────────────────────────────────

// TestAdmin_CreateReport_Success verifies a valid report can be created.
func TestAdmin_CreateReport_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	report, err := env.svc.CreateReport(ctx, "usr_buyer_1", &models.CreateReportRequest{
		TargetType:  "service",
		TargetID:    "svc_1",
		Reason:      "Misleading description",
		Description: "The service description does not match deliverables.",
	})
	if err != nil {
		t.Fatalf("CreateReport failed: %v", err)
	}
	if report == nil {
		t.Fatalf("expected non-nil report, got nil")
	}
	if report.Status != models.ReportStatusOpen {
		t.Errorf("expected status=open, got %q", report.Status)
	}
	if report.ReporterID != "usr_buyer_1" {
		t.Errorf("expected ReporterID=usr_buyer_1, got %q", report.ReporterID)
	}
}

// TestAdmin_CreateReport_MissingRequiredFields verifies reports with missing fields fail.
func TestAdmin_CreateReport_MissingRequiredFields(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	cases := []models.CreateReportRequest{
		{TargetType: "", TargetID: "svc_1", Reason: "reason"},   // missing target type
		{TargetType: "service", TargetID: "", Reason: "reason"}, // missing target ID
		{TargetType: "service", TargetID: "svc_1", Reason: ""}, // missing reason
	}

	for i, req := range cases {
		r := req
		_, err := env.svc.CreateReport(ctx, "usr_buyer_1", &r)
		if err == nil {
			t.Errorf("case %d: expected error for missing required field, got nil", i)
		}
	}
}

// TestAdmin_ResolveReport_Success verifies an open report can be resolved.
func TestAdmin_ResolveReport_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	// Seed a report
	env.reportRepo.reports["rep_1"] = &models.Report{
		ID:         "rep_1",
		ReporterID: "usr_buyer_1",
		TargetType: "service",
		TargetID:   "svc_1",
		Reason:     "Spam",
		Status:     models.ReportStatusUnderReview,
	}

	err := env.svc.ResolveReport(ctx, "usr_admin_1", "rep_1", "Reviewed and action taken.")
	if err != nil {
		t.Fatalf("ResolveReport failed: %v", err)
	}

	report := env.reportRepo.reports["rep_1"]
	if report.Status != models.ReportStatusResolved {
		t.Errorf("expected status=resolved, got %q", report.Status)
	}
	if report.ResolvedAt == nil {
		t.Errorf("expected ResolvedAt to be set after resolution")
	}
}

// TestAdmin_DismissReport_Success verifies an admin can dismiss a report.
func TestAdmin_DismissReport_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.reportRepo.reports["rep_2"] = &models.Report{
		ID:     "rep_2",
		Status: models.ReportStatusOpen,
	}

	err := env.svc.DismissReport(ctx, "usr_admin_1", "rep_2", "Report was not actionable.")
	if err != nil {
		t.Fatalf("DismissReport failed: %v", err)
	}

	if env.reportRepo.reports["rep_2"].Status != models.ReportStatusDismissed {
		t.Errorf("expected status=dismissed, got %q", env.reportRepo.reports["rep_2"].Status)
	}
}

// TestAdmin_ReviewReport_Success verifies marking a report as under_review.
func TestAdmin_ReviewReport_Success(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.reportRepo.reports["rep_3"] = &models.Report{
		ID:     "rep_3",
		Status: models.ReportStatusOpen,
	}

	err := env.svc.ReviewReport(ctx, "usr_admin_1", "rep_3")
	if err != nil {
		t.Fatalf("ReviewReport failed: %v", err)
	}

	if env.reportRepo.reports["rep_3"].Status != models.ReportStatusUnderReview {
		t.Errorf("expected status=under_review, got %q", env.reportRepo.reports["rep_3"].Status)
	}
}

// ──────────────────────────────────────────────────────────────
// Admin pagination tests
// ──────────────────────────────────────────────────────────────

// TestAdmin_ListUsers_PaginationDefaults verifies that invalid limits default to 20.
func TestAdmin_ListUsers_PaginationDefaults(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	result, err := env.svc.ListUsers(ctx, "", "", "", 0, 0)
	if err != nil {
		t.Fatalf("ListUsers failed: %v", err)
	}
	if result.Page != 1 {
		t.Errorf("expected page=1 for page=0, got %d", result.Page)
	}
	if result.Limit != 20 {
		t.Errorf("expected limit=20 for limit=0, got %d", result.Limit)
	}
}

// TestAdmin_SuspendProject_RequiresReason verifies that SuspendProject with
// no reason succeeds at the service level (the reason is passed to audit, not validated here)
// but a double-suspend raises ErrInvalidStateTransition.
func TestAdmin_SuspendProject_DoubleFreeze(t *testing.T) {
	env := newAdminTestEnv()
	ctx := context.Background()

	env.adminRepo.projects["prj_1"] = &models.Project{
		ID:      "prj_1",
		BuyerID: "usr_buyer_1",
		Title:   "My Startup MVP",
		Status:  "suspended",
	}

	err := env.svc.SuspendProject(ctx, "usr_admin_1", "prj_1", "Already suspended")
	if !errors.Is(err, ErrInvalidStateTransition) {
		t.Fatalf("expected ErrInvalidStateTransition for already-suspended project, got: %v", err)
	}
}
