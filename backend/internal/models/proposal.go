package models

import "time"

// Proposal represents a freelancer's bid and proposal on a buyer project (Phase 5)
type Proposal struct {
	ID                string    `json:"id"`
	ProjectID         string    `json:"projectId"`
	FreelancerID      string    `json:"freelancerId"`
	CoverLetter       string    `json:"coverLetter"`
	BidAmount         float64   `json:"bidAmount"`
	DeliveryDays      int       `json:"deliveryDays"`
	EstimatedDuration string    `json:"estimatedDuration,omitempty"`
	Status            string    `json:"status"` // "pending", "shortlisted", "accepted", "rejected", "withdrawn"
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`

	// Enriched fields for buyer/freelancer views
	Freelancer     *User    `json:"freelancer,omitempty"`
	Project        *Project `json:"project,omitempty"`
	MatchScore     float64  `json:"matchScore,omitempty"`     // 0-100 calculated by WorkStream Match Engine
	MatchRationale string   `json:"matchRationale,omitempty"` // Explanation of match calculation
}

// CreateProposalRequest is the payload for POST /api/projects/:id/proposals
type CreateProposalRequest struct {
	CoverLetter       string  `json:"cover_letter" binding:"required"`
	BidAmount         float64 `json:"bid_amount" binding:"required"`
	DeliveryDays      int     `json:"delivery_days" binding:"required"`
	EstimatedDuration string  `json:"estimated_duration"`
}

// ProposalsResponseData is the envelope returned for proposal listings
type ProposalsResponseData struct {
	Proposals []Proposal `json:"proposals"`
	Total     int        `json:"total"`
}
