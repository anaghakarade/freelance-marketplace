package models

import (
	"time"
)

// Contract status constants
const (
	ContractStatusDraft     = "draft"
	ContractStatusActive    = "active"
	ContractStatusCompleted = "completed"
	ContractStatusCancelled = "cancelled"
	ContractStatusDisputed  = "disputed"
)

// Milestone status constants
const (
	MilestoneStatusPending           = "pending"
	MilestoneStatusInProgress        = "in_progress"
	MilestoneStatusSubmitted         = "submitted"
	MilestoneStatusApproved          = "approved"
	MilestoneStatusRevisionRequested = "revision_requested"
	MilestoneStatusCancelled         = "cancelled"
)

// Milestone submission status constants
const (
	SubmissionStatusSubmitted         = "submitted"
	SubmissionStatusApproved          = "approved"
	SubmissionStatusRevisionRequested = "revision_requested"
)

// Contract represents an active or completed contract between a buyer and freelancer
type Contract struct {
	ID              string            `json:"id"`
	ProjectID       string            `json:"projectId"`
	ProposalID      string            `json:"proposalId"`
	BuyerID         string            `json:"buyerId"`
	FreelancerID    string            `json:"freelancerId"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	AgreedBudget    float64           `json:"agreedBudget"`
	Currency        string            `json:"currency"`
	StartDate       time.Time         `json:"startDate"`
	ExpectedEndDate *time.Time        `json:"expectedEndDate,omitempty"`
	Status          string            `json:"status"`
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
	CompletedAt     *time.Time        `json:"completedAt,omitempty"`
	Buyer           *User             `json:"buyer,omitempty"`
	Freelancer      *User             `json:"freelancer,omitempty"`
	Project         *Project          `json:"project,omitempty"`
	Milestones      []Milestone       `json:"milestones,omitempty"`
	Progress        *ContractProgress `json:"progress,omitempty"`
}

// ContractProgress contains dynamic calculated statistics for a contract
type ContractProgress struct {
	TotalMilestones             int     `json:"totalMilestones"`
	ApprovedMilestones          int     `json:"approvedMilestones"`
	PendingMilestones           int     `json:"pendingMilestones"`
	InProgressMilestones        int     `json:"inProgressMilestones"`
	SubmittedMilestones         int     `json:"submittedMilestones"`
	RevisionRequestedMilestones int     `json:"revisionRequestedMilestones"`
	ProgressPercentage          int     `json:"progressPercentage"`
	TotalAmount                 float64 `json:"totalAmount"`
	ApprovedAmount              float64 `json:"approvedAmount"`
}

// Milestone represents an incremental deliverable step within a contract
type Milestone struct {
	ID             string                `json:"id"`
	ContractID     string                `json:"contractId"`
	Title          string                `json:"title"`
	Description    string                `json:"description"`
	SequenceNumber int                   `json:"sequenceNumber"`
	Amount         float64               `json:"amount"`
	Currency       string                `json:"currency"`
	DueDate        *time.Time            `json:"dueDate,omitempty"`
	Status         string                `json:"status"`
	CreatedAt      time.Time             `json:"createdAt"`
	UpdatedAt      time.Time             `json:"updatedAt"`
	CompletedAt    *time.Time            `json:"completedAt,omitempty"`
	Submissions    []MilestoneSubmission `json:"submissions,omitempty"`
}

// MilestoneSubmission represents a work delivery submission for a milestone
type MilestoneSubmission struct {
	ID            string     `json:"id"`
	MilestoneID   string     `json:"milestoneId"`
	SubmittedBy   string     `json:"submittedBy"`
	Message       string     `json:"message"`
	AttachmentURL *string    `json:"attachmentUrl,omitempty"`
	Status        string     `json:"status"`
	ReviewMessage *string    `json:"reviewMessage,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	ReviewedAt    *time.Time `json:"reviewedAt,omitempty"`
	Submitter     *User      `json:"submitter,omitempty"`
}

// Request DTOs

// CreateMilestoneRequest defines inputs to add a milestone to a contract
type CreateMilestoneRequest struct {
	Title       string     `json:"title" binding:"required,min=3,max=200"`
	Description string     `json:"description"`
	Amount      float64    `json:"amount" binding:"gte=0"`
	Currency    string     `json:"currency"`
	DueDate     *time.Time `json:"dueDate"`
}

// UpdateMilestoneRequest defines inputs to edit a pending milestone
type UpdateMilestoneRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	Amount      *float64   `json:"amount,omitempty"`
	DueDate     *time.Time `json:"dueDate,omitempty"`
}

// MilestoneSubmissionRequest defines inputs when a freelancer submits milestone work
type MilestoneSubmissionRequest struct {
	Message       string  `json:"message"`
	AttachmentURL *string `json:"attachmentUrl"`
}

// MilestoneReviewRequest defines inputs when a buyer reviews/requests revisions for a submission
type MilestoneReviewRequest struct {
	Message string `json:"message" binding:"required,min=5"`
}

// Response Wrappers

// ContractsResponseData is the payload for listing contracts
type ContractsResponseData struct {
	Contracts []Contract `json:"contracts"`
	Total     int        `json:"total"`
}

// MilestonesResponseData is the payload for listing milestones for a contract
type MilestonesResponseData struct {
	Milestones []Milestone       `json:"milestones"`
	Progress   *ContractProgress `json:"progress"`
}
