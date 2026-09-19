package models

import "time"

// Report target types
const (
	TargetTypeUser    = "user"
	TargetTypeService = "service"
	TargetTypeProject = "project"
	TargetTypeReview  = "review"
	TargetTypeMessage = "message"
)

// Report statuses
const (
	ReportStatusOpen        = "open"
	ReportStatusUnderReview = "under_review"
	ReportStatusResolved    = "resolved"
	ReportStatusDismissed   = "dismissed"
)

// Audit actions
const (
	AuditActionUserSuspended    = "USER_SUSPENDED"
	AuditActionUserReactivated  = "USER_REACTIVATED"
	AuditActionServiceApproved  = "SERVICE_APPROVED"
	AuditActionServiceRejected  = "SERVICE_REJECTED"
	AuditActionServiceSuspended = "SERVICE_SUSPENDED"
	AuditActionProjectSuspended = "PROJECT_SUSPENDED"
	AuditActionReportReviewed   = "REPORT_REVIEWED"
	AuditActionReportResolved   = "REPORT_RESOLVED"
	AuditActionReportDismissed  = "REPORT_DISMISSED"
)

// Report represents a flagged entity submitted by users
type Report struct {
	ID              string     `json:"id"`
	ReporterID      string     `json:"reporterId"`
	ReporterName    string     `json:"reporterName,omitempty"`
	ReporterEmail   string     `json:"reporterEmail,omitempty"`
	TargetType      string     `json:"targetType"`
	TargetID        string     `json:"targetId"`
	TargetTitle     string     `json:"targetTitle,omitempty"`
	Reason          string     `json:"reason"`
	Description     string     `json:"description"`
	Status          string     `json:"status"` // open, under_review, resolved, dismissed
	AssignedAdminID *string    `json:"assignedAdminId,omitempty"`
	AdminName       string     `json:"adminName,omitempty"`
	ResolutionNote  *string    `json:"resolutionNote,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	ResolvedAt      *time.Time `json:"resolvedAt,omitempty"`
}

// AuditLog represents an immutable governance record of administrative action
type AuditLog struct {
	ID         string                 `json:"id"`
	AdminID    string                 `json:"adminId"`
	AdminName  string                 `json:"adminName,omitempty"`
	AdminEmail string                 `json:"adminEmail,omitempty"`
	Action     string                 `json:"action"`
	EntityType string                 `json:"entityType"`
	EntityID   string                 `json:"entityId"`
	Metadata   map[string]interface{} `json:"metadata"`
	CreatedAt  time.Time              `json:"createdAt"`
}

// CreateReportRequest is submitted by authenticated users
type CreateReportRequest struct {
	TargetType  string `json:"targetType" binding:"required"`
	TargetID    string `json:"targetId" binding:"required"`
	Reason      string `json:"reason" binding:"required"`
	Description string `json:"description"`
}

// UpdateReportStatusRequest updates a report status
type UpdateReportStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// ResolveReportRequest closes a report with a resolution note
type ResolveReportRequest struct {
	Note string `json:"note"`
}

// SuspendReasonRequest holds optional or required reason for suspensions
type SuspendReasonRequest struct {
	Reason string `json:"reason"`
}

// RejectServiceRequest holds rejection note
type RejectServiceRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// AdminUserItem represents a user with relational counts for admin view
type AdminUserItem struct {
	User
	ServiceCount  int `json:"serviceCount"`
	ProjectCount  int `json:"projectCount"`
	ContractCount int `json:"contractCount"`
}

// AdminUsersResponse holds paginated users
type AdminUsersResponse struct {
	Users []*AdminUserItem `json:"users"`
	Total int              `json:"total"`
	Page  int              `json:"page"`
	Limit int              `json:"limit"`
}

// AdminServicesResponse holds paginated services
type AdminServicesResponse struct {
	Services []*Service `json:"services"`
	Total    int        `json:"total"`
	Page     int        `json:"page"`
	Limit    int        `json:"limit"`
}

// AdminProjectsResponse holds paginated projects
type AdminProjectsResponse struct {
	Projects []*Project `json:"projects"`
	Total    int        `json:"total"`
	Page     int        `json:"page"`
	Limit    int        `json:"limit"`
}

// AdminReportsResponse holds paginated reports
type AdminReportsResponse struct {
	Reports []*Report `json:"reports"`
	Total   int       `json:"total"`
	Page    int       `json:"page"`
	Limit   int       `json:"limit"`
}

// AdminAuditLogsResponse holds paginated audit logs
type AdminAuditLogsResponse struct {
	Logs  []*AuditLog `json:"logs"`
	Total int         `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

// AdminAnalytics represents comprehensive platform statistics
type AdminAnalytics struct {
	Users struct {
		Total     int `json:"total"`
		Active    int `json:"active"`
		Suspended int `json:"suspended"`
		Buyers    int `json:"buyers"`
		Sellers   int `json:"sellers"`
		Admins    int `json:"admins"`
	} `json:"users"`
	Marketplace struct {
		TotalServices     int `json:"totalServices"`
		PublishedServices int `json:"publishedServices"`
		PendingReview     int `json:"pendingReview"`
		RejectedServices  int `json:"rejectedServices"`
		SuspendedServices int `json:"suspendedServices"`
		TotalProjects     int `json:"totalProjects"`
		ActiveProjects    int `json:"activeProjects"`
		SuspendedProjects int `json:"suspendedProjects"`
	} `json:"marketplace"`
	Contracts struct {
		TotalContracts     int `json:"totalContracts"`
		ActiveContracts    int `json:"activeContracts"`
		CompletedContracts int `json:"completedContracts"`
		DisputedContracts  int `json:"disputedContracts"`
	} `json:"contracts"`
	Financial struct {
		TotalPayments    int     `json:"totalPayments"`
		ReleasedPayments float64 `json:"releasedPayments"`
		RefundedPayments float64 `json:"refundedPayments"`
		PlatformRevenue  float64 `json:"platformRevenue"`
	} `json:"financial"`
	Governance struct {
		OpenReports        int `json:"openReports"`
		UnderReviewReports int `json:"underReviewReports"`
		ResolvedReports    int `json:"resolvedReports"`
		DismissedReports   int `json:"dismissedReports"`
		TotalAuditLogs     int `json:"totalAuditLogs"`
	} `json:"governance"`
}
