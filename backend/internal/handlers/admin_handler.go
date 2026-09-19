package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

// AdminHandler handles HTTP requests for admin governance, moderation, and reporting
type AdminHandler struct {
	adminService services.AdminService
}

// NewAdminHandler creates a new AdminHandler instance
func NewAdminHandler(adminService services.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

func getPagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return page, limit
}

// GetAnalytics returns platform aggregated statistics
func (h *AdminHandler) GetAnalytics(c *gin.Context) {
	stats, err := h.adminService.GetAnalytics(c.Request.Context())
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve analytics", err.Error())
		return
	}
	RespondSuccess(c, stats, "Platform analytics retrieved successfully")
}

// ListUsers returns paginated users with filters
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, limit := getPagination(c)
	search := c.Query("search")
	role := c.Query("role")
	status := c.Query("status")

	resp, err := h.adminService.ListUsers(c.Request.Context(), search, role, status, page, limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve users", err.Error())
		return
	}
	RespondSuccess(c, resp)
}

// GetUser returns a single user details
func (h *AdminHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	user, err := h.adminService.GetUserByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			RespondError(c, http.StatusNotFound, "User not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve user", err.Error())
		return
	}
	RespondSuccess(c, user)
}

// SuspendUser suspends an account
func (h *AdminHandler) SuspendUser(c *gin.Context) {
	adminID := c.GetString("user_id")
	userID := c.Param("id")

	var req models.SuspendReasonRequest
	_ = c.ShouldBindJSON(&req)
	reason := req.Reason
	if reason == "" {
		reason = "Account suspended by platform administration."
	}

	err := h.adminService.SuspendUser(c.Request.Context(), adminID, userID, reason)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			RespondError(c, http.StatusNotFound, "User not found")
			return
		}
		if errors.Is(err, services.ErrCannotModerateAdmin) {
			RespondError(c, http.StatusForbidden, "Cannot suspend an administrator account")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to suspend user", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"userId": userID, "status": "suspended"}, "User account suspended successfully")
}

// ReactivateUser reactivates an account
func (h *AdminHandler) ReactivateUser(c *gin.Context) {
	adminID := c.GetString("user_id")
	userID := c.Param("id")

	err := h.adminService.ReactivateUser(c.Request.Context(), adminID, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			RespondError(c, http.StatusNotFound, "User not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to reactivate user", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"userId": userID, "status": "active"}, "User account reactivated successfully")
}

// ListServices returns services for moderation
func (h *AdminHandler) ListServices(c *gin.Context) {
	page, limit := getPagination(c)
	search := c.Query("search")
	status := c.Query("status")

	resp, err := h.adminService.ListServices(c.Request.Context(), search, status, page, limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve services", err.Error())
		return
	}
	RespondSuccess(c, resp)
}

// GetService returns service details
func (h *AdminHandler) GetService(c *gin.Context) {
	id := c.Param("id")
	srv, err := h.adminService.GetServiceByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repositories.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve service", err.Error())
		return
	}
	RespondSuccess(c, srv)
}

// ApproveService approves a pending service
func (h *AdminHandler) ApproveService(c *gin.Context) {
	adminID := c.GetString("user_id")
	serviceID := c.Param("id")

	err := h.adminService.ApproveService(c.Request.Context(), adminID, serviceID)
	if err != nil {
		if errors.Is(err, repositories.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to approve service", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"serviceId": serviceID, "status": "published"}, "Service approved and published successfully")
}

// RejectService rejects a pending service
func (h *AdminHandler) RejectService(c *gin.Context) {
	adminID := c.GetString("user_id")
	serviceID := c.Param("id")

	var req models.RejectServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Reason is required to reject a service", err.Error())
		return
	}

	err := h.adminService.RejectService(c.Request.Context(), adminID, serviceID, req.Reason)
	if err != nil {
		if errors.Is(err, repositories.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to reject service", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"serviceId": serviceID, "status": "rejected"}, "Service rejected successfully")
}

// SuspendService suspends an active service
func (h *AdminHandler) SuspendService(c *gin.Context) {
	adminID := c.GetString("user_id")
	serviceID := c.Param("id")

	var req models.SuspendReasonRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Reason == "" {
		RespondError(c, http.StatusBadRequest, "Reason is required to suspend a service")
		return
	}

	err := h.adminService.SuspendService(c.Request.Context(), adminID, serviceID, req.Reason)
	if err != nil {
		if errors.Is(err, repositories.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to suspend service", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"serviceId": serviceID, "status": "suspended"}, "Service suspended successfully")
}

// ListProjects returns projects for administration
func (h *AdminHandler) ListProjects(c *gin.Context) {
	page, limit := getPagination(c)
	search := c.Query("search")
	status := c.Query("status")

	resp, err := h.adminService.ListProjects(c.Request.Context(), search, status, page, limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve projects", err.Error())
		return
	}
	RespondSuccess(c, resp)
}

// GetProject returns project details
func (h *AdminHandler) GetProject(c *gin.Context) {
	id := c.Param("id")
	prj, err := h.adminService.GetProjectByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repositories.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve project", err.Error())
		return
	}
	RespondSuccess(c, prj)
}

// SuspendProject suspends a project
func (h *AdminHandler) SuspendProject(c *gin.Context) {
	adminID := c.GetString("user_id")
	projectID := c.Param("id")

	var req models.SuspendReasonRequest
	_ = c.ShouldBindJSON(&req)
	reason := req.Reason
	if reason == "" {
		reason = "Project suspended by platform administration."
	}

	err := h.adminService.SuspendProject(c.Request.Context(), adminID, projectID, reason)
	if err != nil {
		if errors.Is(err, repositories.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to suspend project", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"projectId": projectID, "status": "suspended"}, "Project suspended successfully")
}

// ListReports lists reports
func (h *AdminHandler) ListReports(c *gin.Context) {
	page, limit := getPagination(c)
	status := c.Query("status")

	resp, err := h.adminService.ListReports(c.Request.Context(), status, page, limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve reports", err.Error())
		return
	}
	RespondSuccess(c, resp)
}

// GetReport returns a single report
func (h *AdminHandler) GetReport(c *gin.Context) {
	id := c.Param("id")
	rep, err := h.adminService.GetReportByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repositories.ErrReportNotFound) {
			RespondError(c, http.StatusNotFound, "Report not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve report", err.Error())
		return
	}
	RespondSuccess(c, rep)
}

// ReviewReport marks report as under review
func (h *AdminHandler) ReviewReport(c *gin.Context) {
	adminID := c.GetString("user_id")
	reportID := c.Param("id")

	err := h.adminService.ReviewReport(c.Request.Context(), adminID, reportID)
	if err != nil {
		if errors.Is(err, repositories.ErrReportNotFound) {
			RespondError(c, http.StatusNotFound, "Report not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to mark report under review", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"reportId": reportID, "status": "under_review"}, "Report marked under review")
}

// ResolveReport resolves a report
func (h *AdminHandler) ResolveReport(c *gin.Context) {
	adminID := c.GetString("user_id")
	reportID := c.Param("id")

	var req models.ResolveReportRequest
	_ = c.ShouldBindJSON(&req)
	note := req.Note
	if note == "" {
		note = "Resolved by moderator."
	}

	err := h.adminService.ResolveReport(c.Request.Context(), adminID, reportID, note)
	if err != nil {
		if errors.Is(err, repositories.ErrReportNotFound) {
			RespondError(c, http.StatusNotFound, "Report not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to resolve report", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"reportId": reportID, "status": "resolved"}, "Report resolved successfully")
}

// DismissReport dismisses a report
func (h *AdminHandler) DismissReport(c *gin.Context) {
	adminID := c.GetString("user_id")
	reportID := c.Param("id")

	var req models.ResolveReportRequest
	_ = c.ShouldBindJSON(&req)
	note := req.Note
	if note == "" {
		note = "Dismissed by moderator after review."
	}

	err := h.adminService.DismissReport(c.Request.Context(), adminID, reportID, note)
	if err != nil {
		if errors.Is(err, repositories.ErrReportNotFound) {
			RespondError(c, http.StatusNotFound, "Report not found")
			return
		}
		if errors.Is(err, services.ErrInvalidStateTransition) {
			RespondError(c, http.StatusConflict, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to dismiss report", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"reportId": reportID, "status": "dismissed"}, "Report dismissed successfully")
}

// ListAuditLogs returns paginated audit logs
func (h *AdminHandler) ListAuditLogs(c *gin.Context) {
	page, limit := getPagination(c)
	action := c.Query("action")
	entityType := c.Query("entityType")

	resp, err := h.adminService.ListAuditLogs(c.Request.Context(), action, entityType, page, limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve audit logs", err.Error())
		return
	}
	RespondSuccess(c, resp)
}

// CreateReport is called by any authenticated user (buyer, seller, admin)
func (h *AdminHandler) CreateReport(c *gin.Context) {
	reporterID := c.GetString("user_id")
	if reporterID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required to submit report")
		return
	}

	var req models.CreateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid report payload: targetType, targetId, and reason are required", err.Error())
		return
	}

	report, err := h.adminService.CreateReport(c.Request.Context(), reporterID, &req)
	if err != nil {
		if errors.Is(err, repositories.ErrInvalidReportTarget) {
			RespondError(c, http.StatusBadRequest, "Target entity does not exist or target type is invalid")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to submit report", err.Error())
		return
	}

	RespondCreated(c, report, "Report submitted successfully. Our moderation team will review it.")
}
