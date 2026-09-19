package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	ErrInvalidStateTransition = errors.New("invalid state transition for entity")
	ErrCannotModerateAdmin     = errors.New("cannot suspend or moderate an administrator account")
	ErrReasonRequired          = errors.New("a moderation reason or note is required")
)

// AdminService provides business logic for administration, moderation, reports, and auditing
type AdminService interface {
	GetAnalytics(ctx context.Context) (*models.AdminAnalytics, error)

	ListUsers(ctx context.Context, search, role, status string, page, limit int) (*models.AdminUsersResponse, error)
	GetUserByID(ctx context.Context, id string) (*models.AdminUserItem, error)
	SuspendUser(ctx context.Context, adminID, userID, reason string) error
	ReactivateUser(ctx context.Context, adminID, userID string) error

	ListServices(ctx context.Context, search, status string, page, limit int) (*models.AdminServicesResponse, error)
	GetServiceByID(ctx context.Context, id string) (*models.Service, error)
	ApproveService(ctx context.Context, adminID, serviceID string) error
	RejectService(ctx context.Context, adminID, serviceID, reason string) error
	SuspendService(ctx context.Context, adminID, serviceID, reason string) error

	ListProjects(ctx context.Context, search, status string, page, limit int) (*models.AdminProjectsResponse, error)
	GetProjectByID(ctx context.Context, id string) (*models.Project, error)
	SuspendProject(ctx context.Context, adminID, projectID, reason string) error

	CreateReport(ctx context.Context, reporterID string, req *models.CreateReportRequest) (*models.Report, error)
	ListReports(ctx context.Context, status string, page, limit int) (*models.AdminReportsResponse, error)
	GetReportByID(ctx context.Context, id string) (*models.Report, error)
	ReviewReport(ctx context.Context, adminID, reportID string) error
	ResolveReport(ctx context.Context, adminID, reportID, note string) error
	DismissReport(ctx context.Context, adminID, reportID, note string) error

	ListAuditLogs(ctx context.Context, action, entityType string, page, limit int) (*models.AdminAuditLogsResponse, error)
}

type adminService struct {
	adminRepo         repositories.AdminRepository
	reportRepo        repositories.ReportRepository
	auditRepo         repositories.AuditRepository
	communicationRepo repositories.CommunicationRepository
}

// NewAdminService creates an AdminService instance
func NewAdminService(
	adminRepo repositories.AdminRepository,
	reportRepo repositories.ReportRepository,
	auditRepo repositories.AuditRepository,
	communicationRepo repositories.CommunicationRepository,
) AdminService {
	return &adminService{
		adminRepo:         adminRepo,
		reportRepo:        reportRepo,
		auditRepo:         auditRepo,
		communicationRepo: communicationRepo,
	}
}

func (s *adminService) sendNotification(ctx context.Context, userID, notifType, title, message, entityType, entityID string) {
	if s.communicationRepo == nil || userID == "" {
		return
	}
	notif := &models.Notification{
		ID:         fmt.Sprintf("notif_%d", time.Now().UnixNano()),
		UserID:     userID,
		Type:       notifType,
		Title:      title,
		Message:    message,
		EntityType: entityType,
		EntityID:   entityID,
		CreatedAt:  time.Now().UTC(),
	}
	_ = s.communicationRepo.CreateNotification(ctx, notif)
}

func (s *adminService) createAudit(ctx context.Context, adminID, action, entityType, entityID string, meta map[string]interface{}) error {
	if s.auditRepo == nil {
		return nil
	}
	log := &models.AuditLog{
		ID:         fmt.Sprintf("aud_%d", time.Now().UnixNano()),
		AdminID:    adminID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Metadata:   meta,
		CreatedAt:  time.Now().UTC(),
	}
	return s.auditRepo.CreateAuditLog(ctx, log)
}

// GetAnalytics returns aggregated stats
func (s *adminService) GetAnalytics(ctx context.Context) (*models.AdminAnalytics, error) {
	return s.adminRepo.GetAnalytics(ctx)
}

// ListUsers retrieves paginated user list
func (s *adminService) ListUsers(ctx context.Context, search, role, status string, page, limit int) (*models.AdminUsersResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	users, total, err := s.adminRepo.ListUsers(ctx, search, role, status, limit, offset)
	if err != nil {
		return nil, err
	}

	return &models.AdminUsersResponse{
		Users: users,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// GetUserByID retrieves single user
func (s *adminService) GetUserByID(ctx context.Context, id string) (*models.AdminUserItem, error) {
	return s.adminRepo.GetUserByID(ctx, id)
}

// SuspendUser suspends an account
func (s *adminService) SuspendUser(ctx context.Context, adminID, userID, reason string) error {
	user, err := s.adminRepo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.Role == "admin" {
		return ErrCannotModerateAdmin
	}

	if user.Status == "suspended" {
		return fmt.Errorf("%w: user is already suspended", ErrInvalidStateTransition)
	}

	if err := s.adminRepo.UpdateUserStatus(ctx, userID, "suspended", false); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionUserSuspended, "user", userID, map[string]interface{}{
		"target_user_name":  user.Name,
		"target_user_email": user.Email,
		"target_user_role":  user.Role,
		"reason":            reason,
	})

	s.sendNotification(ctx, userID, "account_suspended", "Account Suspended",
		fmt.Sprintf("Your WorkStream account has been suspended by an administrator. Reason: %s", reason),
		"user", userID)

	return nil
}

// ReactivateUser reactivates a suspended or inactive account
func (s *adminService) ReactivateUser(ctx context.Context, adminID, userID string) error {
	user, err := s.adminRepo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.Status == "active" {
		return fmt.Errorf("%w: user is already active", ErrInvalidStateTransition)
	}

	if err := s.adminRepo.UpdateUserStatus(ctx, userID, "active", true); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionUserReactivated, "user", userID, map[string]interface{}{
		"target_user_name":  user.Name,
		"target_user_email": user.Email,
		"target_user_role":  user.Role,
	})

	s.sendNotification(ctx, userID, "account_reactivated", "Account Reactivated",
		"Your WorkStream account has been reactivated. Welcome back!",
		"user", userID)

	return nil
}

// ListServices retrieves services for moderation queue
func (s *adminService) ListServices(ctx context.Context, search, status string, page, limit int) (*models.AdminServicesResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	services, total, err := s.adminRepo.ListServices(ctx, search, status, limit, offset)
	if err != nil {
		return nil, err
	}

	return &models.AdminServicesResponse{
		Services: services,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}

// GetServiceByID returns a single service
func (s *adminService) GetServiceByID(ctx context.Context, id string) (*models.Service, error) {
	return s.adminRepo.GetServiceByID(ctx, id)
}

// ApproveService publishes a pending_review service
func (s *adminService) ApproveService(ctx context.Context, adminID, serviceID string) error {
	srv, err := s.adminRepo.GetServiceByID(ctx, serviceID)
	if err != nil {
		return err
	}

	if srv.Status != "pending_review" && srv.Status != "draft" {
		return fmt.Errorf("%w: only pending_review or draft services can be approved (current: %s)", ErrInvalidStateTransition, srv.Status)
	}

	if err := s.adminRepo.UpdateServiceStatus(ctx, serviceID, "published"); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionServiceApproved, "service", serviceID, map[string]interface{}{
		"title":     srv.Title,
		"seller_id": srv.SellerID,
	})

	s.sendNotification(ctx, srv.SellerID, "service_approved", "Service Listing Approved",
		fmt.Sprintf("Your service listing %q has been approved and published to the marketplace.", srv.Title),
		"service", serviceID)

	return nil
}

// RejectService rejects a pending service with required reason
func (s *adminService) RejectService(ctx context.Context, adminID, serviceID, reason string) error {
	if reason == "" {
		return ErrReasonRequired
	}

	srv, err := s.adminRepo.GetServiceByID(ctx, serviceID)
	if err != nil {
		return err
	}

	if srv.Status != "pending_review" && srv.Status != "draft" {
		return fmt.Errorf("%w: only pending_review or draft services can be rejected (current: %s)", ErrInvalidStateTransition, srv.Status)
	}

	if err := s.adminRepo.UpdateServiceStatus(ctx, serviceID, "rejected"); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionServiceRejected, "service", serviceID, map[string]interface{}{
		"title":     srv.Title,
		"seller_id": srv.SellerID,
		"reason":    reason,
	})

	s.sendNotification(ctx, srv.SellerID, "service_rejected", "Service Listing Rejected",
		fmt.Sprintf("Your service listing %q was rejected. Reason: %s", srv.Title, reason),
		"service", serviceID)

	return nil
}

// SuspendService suspends an active published service with required reason
func (s *adminService) SuspendService(ctx context.Context, adminID, serviceID, reason string) error {
	if reason == "" {
		return ErrReasonRequired
	}

	srv, err := s.adminRepo.GetServiceByID(ctx, serviceID)
	if err != nil {
		return err
	}

	if srv.Status == "suspended" {
		return fmt.Errorf("%w: service is already suspended", ErrInvalidStateTransition)
	}

	if err := s.adminRepo.UpdateServiceStatus(ctx, serviceID, "suspended"); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionServiceSuspended, "service", serviceID, map[string]interface{}{
		"title":     srv.Title,
		"seller_id": srv.SellerID,
		"reason":    reason,
	})

	s.sendNotification(ctx, srv.SellerID, "service_suspended", "Service Listing Suspended",
		fmt.Sprintf("Your service listing %q was suspended. Reason: %s", srv.Title, reason),
		"service", serviceID)

	return nil
}

// ListProjects retrieves paginated projects
func (s *adminService) ListProjects(ctx context.Context, search, status string, page, limit int) (*models.AdminProjectsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	projects, total, err := s.adminRepo.ListProjects(ctx, search, status, limit, offset)
	if err != nil {
		return nil, err
	}

	return &models.AdminProjectsResponse{
		Projects: projects,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}

// GetProjectByID retrieves single project
func (s *adminService) GetProjectByID(ctx context.Context, id string) (*models.Project, error) {
	return s.adminRepo.GetProjectByID(ctx, id)
}

// SuspendProject suspends a project listing
func (s *adminService) SuspendProject(ctx context.Context, adminID, projectID, reason string) error {
	prj, err := s.adminRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		return err
	}

	if prj.Status == "suspended" {
		return fmt.Errorf("%w: project is already suspended", ErrInvalidStateTransition)
	}

	if err := s.adminRepo.UpdateProjectStatus(ctx, projectID, "suspended"); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionProjectSuspended, "project", projectID, map[string]interface{}{
		"title":    prj.Title,
		"buyer_id": prj.BuyerID,
		"reason":   reason,
	})

	s.sendNotification(ctx, prj.BuyerID, "project_suspended", "Project Suspended",
		fmt.Sprintf("Your project posting %q has been suspended by administration. Reason: %s", prj.Title, reason),
		"project", projectID)

	return nil
}

// CreateReport submits a report by an authenticated user after validating target existence
func (s *adminService) CreateReport(ctx context.Context, reporterID string, req *models.CreateReportRequest) (*models.Report, error) {
	if req.TargetType == "" || req.TargetID == "" || req.Reason == "" {
		return nil, errors.New("targetType, targetId, and reason are required")
	}

	// Verify target exists
	exists, targetTitle, err := s.reportRepo.VerifyTargetExists(ctx, req.TargetType, req.TargetID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, repositories.ErrInvalidReportTarget
	}

	report := &models.Report{
		ID:          fmt.Sprintf("rep_%d", time.Now().UnixNano()),
		ReporterID:  reporterID,
		TargetType:  req.TargetType,
		TargetID:    req.TargetID,
		TargetTitle: targetTitle,
		Reason:      req.Reason,
		Description: req.Description,
		Status:      models.ReportStatusOpen,
	}

	if err := s.reportRepo.CreateReport(ctx, report); err != nil {
		return nil, err
	}

	return report, nil
}

// ListReports retrieves reports filtered by status
func (s *adminService) ListReports(ctx context.Context, status string, page, limit int) (*models.AdminReportsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	reports, total, err := s.reportRepo.ListReports(ctx, status, limit, offset)
	if err != nil {
		return nil, err
	}

	return &models.AdminReportsResponse{
		Reports: reports,
		Total:   total,
		Page:    page,
		Limit:   limit,
	}, nil
}

// GetReportByID returns a report with reporter info
func (s *adminService) GetReportByID(ctx context.Context, id string) (*models.Report, error) {
	return s.reportRepo.GetReportByID(ctx, id)
}

// ReviewReport marks report as under review
func (s *adminService) ReviewReport(ctx context.Context, adminID, reportID string) error {
	rep, err := s.reportRepo.GetReportByID(ctx, reportID)
	if err != nil {
		return err
	}

	if rep.Status != models.ReportStatusOpen {
		return fmt.Errorf("%w: only open reports can be marked under review (current: %s)", ErrInvalidStateTransition, rep.Status)
	}

	if err := s.reportRepo.UpdateReportStatus(ctx, reportID, models.ReportStatusUnderReview, adminID); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionReportReviewed, "report", reportID, map[string]interface{}{
		"target_type": rep.TargetType,
		"target_id":   rep.TargetID,
	})

	return nil
}

// ResolveReport resolves a report with a resolution note
func (s *adminService) ResolveReport(ctx context.Context, adminID, reportID, note string) error {
	rep, err := s.reportRepo.GetReportByID(ctx, reportID)
	if err != nil {
		return err
	}

	if rep.Status == models.ReportStatusResolved || rep.Status == models.ReportStatusDismissed {
		return fmt.Errorf("%w: report is already closed", ErrInvalidStateTransition)
	}

	if err := s.reportRepo.ResolveReport(ctx, reportID, note, adminID); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionReportResolved, "report", reportID, map[string]interface{}{
		"target_type":     rep.TargetType,
		"target_id":       rep.TargetID,
		"resolution_note": note,
	})

	s.sendNotification(ctx, rep.ReporterID, "report_resolved", "Report Resolved",
		fmt.Sprintf("Your report regarding %s %s has been resolved by our moderation team.", rep.TargetType, rep.TargetID),
		"report", reportID)

	return nil
}

// DismissReport dismisses a report with an admin note
func (s *adminService) DismissReport(ctx context.Context, adminID, reportID, note string) error {
	rep, err := s.reportRepo.GetReportByID(ctx, reportID)
	if err != nil {
		return err
	}

	if rep.Status == models.ReportStatusResolved || rep.Status == models.ReportStatusDismissed {
		return fmt.Errorf("%w: report is already closed", ErrInvalidStateTransition)
	}

	if err := s.reportRepo.DismissReport(ctx, reportID, note, adminID); err != nil {
		return err
	}

	_ = s.createAudit(ctx, adminID, models.AuditActionReportDismissed, "report", reportID, map[string]interface{}{
		"target_type":    rep.TargetType,
		"target_id":      rep.TargetID,
		"dismissal_note": note,
	})

	s.sendNotification(ctx, rep.ReporterID, "report_dismissed", "Report Dismissed",
		fmt.Sprintf("Your report regarding %s %s has been reviewed and dismissed.", rep.TargetType, rep.TargetID),
		"report", reportID)

	return nil
}

// ListAuditLogs retrieves paginated audit logs
func (s *adminService) ListAuditLogs(ctx context.Context, action, entityType string, page, limit int) (*models.AdminAuditLogsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	logs, total, err := s.auditRepo.ListAuditLogs(ctx, action, entityType, limit, offset)
	if err != nil {
		return nil, err
	}

	return &models.AdminAuditLogsResponse{
		Logs:  logs,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}
