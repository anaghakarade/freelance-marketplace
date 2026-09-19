package models

import "time"

type ContractReview struct {
	ID         string    `json:"id"`
	ReviewerID string    `json:"reviewer_id"`
	RevieweeID string    `json:"reviewee_id"`
	ProjectID  string    `json:"project_id"`
	ContractID string    `json:"contract_id"`
	Rating     int       `json:"rating"`
	Comment    string    `json:"comment"`
	IsVerified bool      `json:"is_verified"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type CreateContractReviewRequest struct {
	ContractID string `json:"contract_id" binding:"required"`
	Rating     int    `json:"rating" binding:"required,min=1,max=5"`
	Comment    string `json:"comment" binding:"max=2000"`
}

type UpdateContractReviewRequest struct {
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Comment string `json:"comment" binding:"max=2000"`
}

type TrustProfile struct {
	AverageRating       float64     `json:"average_rating"`
	RatingCount         int         `json:"rating_count"`
	Distribution        map[int]int `json:"distribution"`
	CompletedProjects   int         `json:"completed_projects"`
	CompletionRate      *float64    `json:"completion_rate"`
	OnTimeDeliveryRate  *float64    `json:"on_time_delivery_rate"`
	RepeatClientRate    *float64    `json:"repeat_client_rate"`
	ResponseTimeMinutes *float64    `json:"response_time_minutes"`
	VerifiedReviewCount int         `json:"verified_review_count"`
	GrowthTier          string      `json:"growth_tier"`
}
