package models

import "time"

// ServiceSearchParams holds query parameters for advanced service search
type ServiceSearchParams struct {
	Query           string   `form:"q" json:"q"`
	Category        string   `form:"category" json:"category"`
	Subcategory     string   `form:"subcategory" json:"subcategory"`
	MinPrice        *float64 `form:"min_price" json:"minPrice"`
	MaxPrice        *float64 `form:"max_price" json:"maxPrice"`
	MinRating       *float64 `form:"rating" json:"minRating"`
	MaxDeliveryTime *int     `form:"delivery_time" json:"maxDeliveryTime"`
	Tier            string   `form:"tier" json:"tier"`
	Status          string   `form:"status" json:"status"`
	Sort            string   `form:"sort" json:"sort"` // "relevance", "rating", "price_asc", "price_desc", "newest", "orders"
	Page            int      `form:"page" json:"page"`
	Limit           int      `form:"limit" json:"limit"`
}

// ServiceSearchResult wraps a service with search relevance score and matched highlights
type ServiceSearchResult struct {
	Service        Service  `json:"service"`
	RelevanceScore float64  `json:"relevanceScore"`
	Highlights     []string `json:"highlights,omitempty"`
}

// ServiceSearchResponse is the response envelope for service search
type ServiceSearchResponse struct {
	Services []ServiceSearchResult `json:"services"`
	Total    int                   `json:"total"`
	Page     int                   `json:"page"`
	Limit    int                   `json:"limit"`
}

// FreelancerSearchParams holds query filters for advanced talent discovery
type FreelancerSearchParams struct {
	Query         string   `form:"q" json:"q"`
	Category      string   `form:"category" json:"category"`
	Skill         string   `form:"skill" json:"skill"`
	Tier          string   `form:"tier" json:"tier"`
	MinRating     *float64 `form:"min_rating" json:"minRating"`
	MinCompleted  *int     `form:"min_completed" json:"minCompleted"`
	MinPrice      *float64 `form:"min_price" json:"minPrice"`
	MaxPrice      *float64 `form:"max_price" json:"maxPrice"`
	Sort          string   `form:"sort" json:"sort"` // "relevance", "rating", "completed", "price_asc", "newest"
	Page          int      `form:"page" json:"page"`
	Limit         int      `form:"limit" json:"limit"`
}

// ProjectSearchParams holds query filters for searching open projects
type ProjectSearchParams struct {
	Query           string   `form:"q" json:"q"`
	Category        string   `form:"category" json:"category"`
	Skill           string   `form:"skill" json:"skill"`
	MinBudget       *float64 `form:"min_budget" json:"minBudget"`
	MaxBudget       *float64 `form:"max_budget" json:"maxBudget"`
	ExperienceLevel string   `form:"experience_level" json:"experienceLevel"`
	BudgetType      string   `form:"budget_type" json:"budgetType"`
	Sort            string   `form:"sort" json:"sort"`
	Page            int      `form:"page" json:"page"`
	Limit           int      `form:"limit" json:"limit"`
}

// MatchBreakdown details individual score components (0-100 each)
type MatchBreakdown struct {
	SkillMatch float64 `json:"skillMatch"`
	Trust      float64 `json:"trust"`
	Rating     float64 `json:"rating"`
	Experience float64 `json:"experience"`
	Budget     float64 `json:"budget"`
}

// ProjectFreelancerMatch is a candidate freelancer scored for a project
type ProjectFreelancerMatch struct {
	Freelancer    FreelancerSearchResult `json:"freelancer"`
	MatchScore    int                    `json:"matchScore"` // 0 - 100
	Breakdown     MatchBreakdown         `json:"breakdown"`
	Reasons       []string               `json:"reasons"`
	MatchedSkills []string               `json:"matchedSkills"`
	MissingSkills []string               `json:"missingSkills"`
}

// ProjectMatchesResponse is the envelope returned for project talent matching
type ProjectMatchesResponse struct {
	ProjectID   string                   `json:"projectId"`
	ProjectName string                   `json:"projectName"`
	Matches     []ProjectFreelancerMatch `json:"matches"`
	Total       int                      `json:"total"`
	Page        int                      `json:"page"`
	Limit       int                      `json:"limit"`
}

// UserInteractionEvent represents a behavioral signal recorded for personalized recommendations
type UserInteractionEvent struct {
	ID              string                 `json:"id"`
	UserID          string                 `json:"userId"`
	InteractionType string                 `json:"interactionType"` // 'view_service', 'search', 'favorite', 'hire'
	TargetType      string                 `json:"targetType"`      // 'service', 'category', 'freelancer', 'project'
	TargetID        string                 `json:"targetId"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt       time.Time              `json:"createdAt"`
}

// RecordInteractionRequest is the payload for POST /api/recommendations/events
type RecordInteractionRequest struct {
	InteractionType string                 `json:"interactionType" binding:"required"`
	TargetType      string                 `json:"targetType" binding:"required"`
	TargetID        string                 `json:"targetId" binding:"required"`
	Metadata        map[string]interface{} `json:"metadata"`
}
