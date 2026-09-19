package models

import "time"

// Project represents a buyer-posted freelance project (Phase 5)
type Project struct {
	ID                 string       `json:"id"`
	BuyerID            string       `json:"buyerId"`
	Title              string       `json:"title"`
	Description        string       `json:"description"`
	CategoryID         string       `json:"categoryId"`
	CategorySlug       string       `json:"categorySlug,omitempty"`
	CategoryName       string       `json:"categoryName,omitempty"`
	SubcategoryID      *string      `json:"subcategoryId,omitempty"`
	SubcategorySlug    string       `json:"subcategorySlug,omitempty"`
	SubcategoryName    string       `json:"subcategoryName,omitempty"`
	Skills             []string     `json:"skills"`
	BudgetType         string       `json:"budgetType"` // "fixed" or "hourly"
	BudgetMin          *float64     `json:"budgetMin,omitempty"`
	BudgetMax          *float64     `json:"budgetMax,omitempty"`
	FixedBudget        *float64     `json:"fixedBudget,omitempty"`
	ExperienceLevel    string       `json:"experienceLevel"`   // "entry", "intermediate", "expert"
	EstimatedDuration  string       `json:"estimatedDuration"` // e.g. "Less than 1 month", "1 to 3 months"
	Status             string       `json:"status"`            // "open", "in_progress", "completed", "cancelled", "closed"
	Visibility         string       `json:"visibility"`        // "public", "private"
	ProposalCount      int          `json:"proposalCount"`
	SelectedProposalID *string      `json:"selectedProposalId,omitempty"`
	CreatedAt          time.Time    `json:"createdAt"`
	UpdatedAt          time.Time    `json:"updatedAt"`
	CompletedAt        *time.Time   `json:"completedAt,omitempty"`
	Buyer              *User        `json:"buyer,omitempty"`
	HasApplied         bool         `json:"hasApplied,omitempty"` // populated for authenticated freelancer viewing project
}

// ProjectFilters holds query parameters for project discovery
type ProjectFilters struct {
	Category        string   // category slug or id
	Subcategory     string   // subcategory slug or id
	ExperienceLevel string   // "entry", "intermediate", "expert"
	BudgetType      string   // "fixed", "hourly"
	MinBudget       *float64
	MaxBudget       *float64
	Search          string
	Skills          []string
	Sort            string // "newest", "budget_high", "budget_low", "proposals"
	Limit           int
	Offset          int
}

// CreateProjectRequest is the payload for POST /api/projects
type CreateProjectRequest struct {
	Title             string   `json:"title" binding:"required"`
	Description       string   `json:"description" binding:"required"`
	CategoryID        string   `json:"category_id" binding:"required"`
	SubcategoryID     *string  `json:"subcategory_id"`
	Skills            []string `json:"skills"`
	SkillsString      string   `json:"skills_string"`
	BudgetType        string   `json:"budget_type"` // default "fixed"
	BudgetMin         *float64 `json:"budget_min"`
	BudgetMax         *float64 `json:"budget_max"`
	FixedBudget       *float64 `json:"fixed_budget"`
	ExperienceLevel   string   `json:"experience_level"`   // default "intermediate"
	EstimatedDuration string   `json:"estimated_duration"` // default "1 to 3 months"
}

// UpdateProjectRequest is the payload for PUT /api/projects/:id
type UpdateProjectRequest struct {
	Title             *string  `json:"title"`
	Description       *string  `json:"description"`
	CategoryID        *string  `json:"category_id"`
	SubcategoryID     *string  `json:"subcategory_id"`
	Skills            []string `json:"skills"`
	BudgetType        *string  `json:"budget_type"`
	BudgetMin         *float64 `json:"budget_min"`
	BudgetMax         *float64 `json:"budget_max"`
	FixedBudget       *float64 `json:"fixed_budget"`
	ExperienceLevel   *string  `json:"experience_level"`
	EstimatedDuration *string  `json:"estimated_duration"`
}

// UpdateProjectStatusRequest is the payload for PATCH /api/projects/:id/status
type UpdateProjectStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// ProjectsResponseData is the envelope returned for project listings
type ProjectsResponseData struct {
	Projects []Project `json:"projects"`
	Total    int       `json:"total"`
	Limit    int       `json:"limit"`
	Offset   int       `json:"offset"`
}
