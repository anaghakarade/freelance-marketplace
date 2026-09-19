package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync/atomic"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	idCounter uint64

	ErrProjectNotFound        = repositories.ErrProjectNotFound
	ErrProjectNotOpen         = repositories.ErrProjectNotOpen
	ErrProposalNotFound       = repositories.ErrProposalNotFound
	ErrCannotBidOwnProject    = errors.New("you cannot submit a proposal to your own project")
	ErrDuplicateProposal      = errors.New("you have already submitted a proposal for this project")
	ErrProposalAlreadyDecided = errors.New("proposal has already been decided")
)

// ProjectService defines business logic for projects and proposals
type ProjectService interface {
	// Project methods
	GetAllProjects(ctx context.Context, filters models.ProjectFilters, currentUserID string) ([]models.Project, int, error)
	GetProjectByID(ctx context.Context, id string, currentUserID string) (*models.Project, error)
	GetMyProjects(ctx context.Context, buyerID string) ([]models.Project, error)
	CreateProject(ctx context.Context, buyerID string, req models.CreateProjectRequest) (*models.Project, error)
	UpdateProject(ctx context.Context, id string, requesterID string, isAdmin bool, req models.UpdateProjectRequest) (*models.Project, error)
	UpdateProjectStatus(ctx context.Context, id string, requesterID string, isAdmin bool, status string) error
	DeleteProject(ctx context.Context, id string, requesterID string, isAdmin bool) error

	// Proposal methods
	SubmitProposal(ctx context.Context, projectID string, freelancerID string, req models.CreateProposalRequest) (*models.Proposal, error)
	GetMyProposals(ctx context.Context, freelancerID string) ([]models.Proposal, error)
	GetProjectProposals(ctx context.Context, projectID string, requesterID string, isAdmin bool) ([]models.Proposal, error)
	WithdrawProposal(ctx context.Context, proposalID string, freelancerID string) error
	ShortlistProposal(ctx context.Context, proposalID string, requesterID string, isAdmin bool) error
	RejectProposal(ctx context.Context, proposalID string, requesterID string, isAdmin bool) error
	AcceptProposal(ctx context.Context, proposalID string, requesterID string, isAdmin bool) (string, error)
}

type projectService struct {
	projectRepo  repositories.ProjectRepository
	proposalRepo repositories.ProposalRepository
	categoryRepo repositories.CategoryRepository
	userRepo     *repositories.UserRepository
}

// NewProjectService instantiates a new ProjectService
func NewProjectService(
	projectRepo repositories.ProjectRepository,
	proposalRepo repositories.ProposalRepository,
	categoryRepo repositories.CategoryRepository,
	userRepo     *repositories.UserRepository,
) ProjectService {
	return &projectService{
		projectRepo:  projectRepo,
		proposalRepo: proposalRepo,
		categoryRepo: categoryRepo,
		userRepo:     userRepo,
	}
}

// GetAllProjects retrieves projects with optional hasApplied flag for logged-in freelancer
func (s *projectService) GetAllProjects(ctx context.Context, filters models.ProjectFilters, currentUserID string) ([]models.Project, int, error) {
	projects, total, err := s.projectRepo.GetAll(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	if currentUserID != "" {
		for i := range projects {
			applied, _ := s.proposalRepo.HasFreelancerApplied(ctx, projects[i].ID, currentUserID)
			projects[i].HasApplied = applied
		}
	}

	return projects, total, nil
}

// GetProjectByID retrieves a single project and checks whether current user has applied
func (s *projectService) GetProjectByID(ctx context.Context, id string, currentUserID string) (*models.Project, error) {
	project, err := s.projectRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	if currentUserID != "" {
		applied, _ := s.proposalRepo.HasFreelancerApplied(ctx, project.ID, currentUserID)
		project.HasApplied = applied
	}

	return project, nil
}

// GetMyProjects retrieves all projects posted by the buyer
func (s *projectService) GetMyProjects(ctx context.Context, buyerID string) ([]models.Project, error) {
	return s.projectRepo.GetByBuyerID(ctx, buyerID)
}

// CreateProject validates input and persists a new project
func (s *projectService) CreateProject(ctx context.Context, buyerID string, req models.CreateProjectRequest) (*models.Project, error) {
	valErrors := make(map[string]string)

	// Validate title: 10–150 chars
	title := strings.TrimSpace(req.Title)
	if len(title) < 10 {
		valErrors["title"] = "Project title must be at least 10 characters"
	} else if len(title) > 150 {
		valErrors["title"] = "Project title cannot exceed 150 characters"
	}

	// Validate description: minimum 50 chars
	desc := strings.TrimSpace(req.Description)
	if len(desc) < 50 {
		valErrors["description"] = "Description must be at least 50 characters with detailed project requirements"
	}

	// Validate category
	catID := strings.TrimSpace(req.CategoryID)
	if catID == "" {
		valErrors["category_id"] = "Category is required"
	} else {
		cat, err := s.categoryRepo.GetByID(ctx, catID)
		if err != nil || cat == nil {
			// Try by slug
			cat, err = s.categoryRepo.GetBySlug(ctx, catID)
			if err != nil || cat == nil {
				valErrors["category_id"] = "Invalid category specified"
			} else {
				catID = cat.ID
			}
		}
	}

	// Validate subcategory if provided
	var subID *string
	if req.SubcategoryID != nil && strings.TrimSpace(*req.SubcategoryID) != "" {
		subIDVal := strings.TrimSpace(*req.SubcategoryID)
		sub, err := s.categoryRepo.GetSubcategoryByID(ctx, subIDVal)
		if err == nil && sub != nil {
			subID = &sub.ID
		} else {
			subID = &subIDVal
		}
	}

	// Validate skills
	skills := req.Skills
	if len(skills) == 0 && req.SkillsString != "" {
		rawSkills := strings.Split(req.SkillsString, ",")
		for _, rs := range rawSkills {
			t := strings.TrimSpace(rs)
			if t != "" {
				skills = append(skills, t)
			}
		}
	}
	if len(skills) == 0 {
		valErrors["skills"] = "Please specify at least one required skill"
	}

	// Validate budget
	budgetType := strings.ToLower(strings.TrimSpace(req.BudgetType))
	if budgetType != "hourly" {
		budgetType = "fixed"
	}

	if budgetType == "fixed" {
		if req.FixedBudget == nil && req.BudgetMin == nil {
			valErrors["budget"] = "Please specify a project budget"
		}
		if req.FixedBudget != nil && *req.FixedBudget <= 0 {
			valErrors["fixed_budget"] = "Fixed budget must be greater than 0"
		}
		if req.BudgetMin != nil && req.BudgetMax != nil && *req.BudgetMin > *req.BudgetMax {
			valErrors["budget_min"] = "Minimum budget cannot exceed maximum budget"
		}
	} else {
		if req.BudgetMin == nil || *req.BudgetMin <= 0 {
			valErrors["budget_min"] = "Minimum hourly rate must be greater than 0"
		}
		if req.BudgetMin != nil && req.BudgetMax != nil && *req.BudgetMin > *req.BudgetMax {
			valErrors["budget_max"] = "Maximum hourly rate cannot be lower than minimum hourly rate"
		}
	}

	// Validate experience level
	expLevel := strings.ToLower(strings.TrimSpace(req.ExperienceLevel))
	if expLevel != "entry" && expLevel != "expert" {
		expLevel = "intermediate"
	}

	duration := strings.TrimSpace(req.EstimatedDuration)
	if duration == "" {
		duration = "1 to 3 months"
	}

	if len(valErrors) > 0 {
		return nil, &ServiceValidationError{Errors: valErrors}
	}

	projectID := fmt.Sprintf("prj_usr_%d_%d", time.Now().UnixMilli(), atomic.AddUint64(&idCounter, 1))

	project := &models.Project{
		ID:                projectID,
		BuyerID:           buyerID,
		Title:             title,
		Description:       desc,
		CategoryID:        catID,
		SubcategoryID:     subID,
		Skills:            skills,
		BudgetType:        budgetType,
		BudgetMin:         req.BudgetMin,
		BudgetMax:         req.BudgetMax,
		FixedBudget:       req.FixedBudget,
		ExperienceLevel:   expLevel,
		EstimatedDuration: duration,
		Status:            "open",
		Visibility:        "public",
		ProposalCount:     0,
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}

	if err := s.projectRepo.Create(ctx, project); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return s.projectRepo.GetByID(ctx, projectID)
}

// UpdateProject updates an existing project with authorization check
func (s *projectService) UpdateProject(ctx context.Context, id string, requesterID string, isAdmin bool, req models.UpdateProjectRequest) (*models.Project, error) {
	isOwner, existing, err := s.projectRepo.CheckOwnership(ctx, id, requesterID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrProjectNotFound
	}
	if !isOwner && !isAdmin {
		return nil, ErrForbidden
	}

	if req.Title != nil {
		t := strings.TrimSpace(*req.Title)
		if len(t) < 10 || len(t) > 150 {
			return nil, &ServiceValidationError{Errors: map[string]string{"title": "Title must be between 10 and 150 characters"}}
		}
		existing.Title = t
	}
	if req.Description != nil {
		d := strings.TrimSpace(*req.Description)
		if len(d) < 50 {
			return nil, &ServiceValidationError{Errors: map[string]string{"description": "Description must be at least 50 characters"}}
		}
		existing.Description = d
	}
	if req.CategoryID != nil {
		existing.CategoryID = *req.CategoryID
	}
	if req.SubcategoryID != nil {
		existing.SubcategoryID = req.SubcategoryID
	}
	if req.Skills != nil && len(req.Skills) > 0 {
		existing.Skills = req.Skills
	}
	if req.BudgetType != nil {
		existing.BudgetType = *req.BudgetType
	}
	if req.BudgetMin != nil {
		existing.BudgetMin = req.BudgetMin
	}
	if req.BudgetMax != nil {
		existing.BudgetMax = req.BudgetMax
	}
	if req.FixedBudget != nil {
		existing.FixedBudget = req.FixedBudget
	}
	if req.ExperienceLevel != nil {
		existing.ExperienceLevel = *req.ExperienceLevel
	}
	if req.EstimatedDuration != nil {
		existing.EstimatedDuration = *req.EstimatedDuration
	}

	if err := s.projectRepo.Update(ctx, id, existing); err != nil {
		return nil, err
	}

	return s.projectRepo.GetByID(ctx, id)
}

// UpdateProjectStatus changes the project status (open, closed, cancelled)
func (s *projectService) UpdateProjectStatus(ctx context.Context, id string, requesterID string, isAdmin bool, status string) error {
	isOwner, existing, err := s.projectRepo.CheckOwnership(ctx, id, requesterID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrProjectNotFound
	}
	if !isOwner && !isAdmin {
		return ErrForbidden
	}

	normalized := strings.ToLower(strings.TrimSpace(status))
	validStatuses := map[string]bool{"open": true, "in_progress": true, "completed": true, "cancelled": true, "closed": true}
	if !validStatuses[normalized] {
		return errors.New("invalid status: must be open, in_progress, completed, cancelled, or closed")
	}

	return s.projectRepo.UpdateStatus(ctx, id, normalized)
}

// DeleteProject deletes an open project
func (s *projectService) DeleteProject(ctx context.Context, id string, requesterID string, isAdmin bool) error {
	isOwner, existing, err := s.projectRepo.CheckOwnership(ctx, id, requesterID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrProjectNotFound
	}
	if !isOwner && !isAdmin {
		return ErrForbidden
	}

	if existing.Status == "in_progress" {
		return errors.New("cannot delete a project currently in progress")
	}

	return s.projectRepo.Delete(ctx, id)
}

// SubmitProposal validates and submits a freelancer proposal
func (s *projectService) SubmitProposal(ctx context.Context, projectID string, freelancerID string, req models.CreateProposalRequest) (*models.Proposal, error) {
	valErrors := make(map[string]string)

	project, err := s.projectRepo.GetByID(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// Ensure project is open
	if project.Status != "open" {
		return nil, ErrProjectNotOpen
	}

	// Freelancer cannot bid on own project
	if project.BuyerID == freelancerID {
		return nil, ErrCannotBidOwnProject
	}

	// Check duplicate active proposal
	hasApplied, err := s.proposalRepo.HasFreelancerApplied(ctx, projectID, freelancerID)
	if err != nil {
		return nil, err
	}
	if hasApplied {
		return nil, ErrDuplicateProposal
	}

	// Validate cover letter: minimum 30 chars
	cover := strings.TrimSpace(req.CoverLetter)
	if len(cover) < 30 {
		valErrors["cover_letter"] = "Cover letter must be at least 30 characters explaining your approach"
	}

	// Validate bid amount
	if req.BidAmount <= 0 {
		valErrors["bid_amount"] = "Bid amount must be greater than $0"
	}

	// Validate delivery days
	if req.DeliveryDays <= 0 {
		valErrors["delivery_days"] = "Estimated delivery days must be at least 1 day"
	}

	if len(valErrors) > 0 {
		return nil, &ServiceValidationError{Errors: valErrors}
	}

	duration := strings.TrimSpace(req.EstimatedDuration)
	if duration == "" {
		duration = fmt.Sprintf("%d days", req.DeliveryDays)
	}

	proposalID := fmt.Sprintf("prop_usr_%d_%d", time.Now().UnixMilli(), atomic.AddUint64(&idCounter, 1))

	proposal := &models.Proposal{
		ID:                proposalID,
		ProjectID:         projectID,
		FreelancerID:      freelancerID,
		CoverLetter:       cover,
		BidAmount:         req.BidAmount,
		DeliveryDays:      req.DeliveryDays,
		EstimatedDuration: duration,
		Status:            "pending",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}

	if err := s.proposalRepo.Create(ctx, proposal); err != nil {
		return nil, fmt.Errorf("failed to create proposal: %w", err)
	}

	return s.proposalRepo.GetByID(ctx, proposalID)
}

// GetMyProposals returns all proposals submitted by the authenticated freelancer
func (s *projectService) GetMyProposals(ctx context.Context, freelancerID string) ([]models.Proposal, error) {
	return s.proposalRepo.GetByFreelancerID(ctx, freelancerID)
}

// GetProjectProposals returns all proposals on a project for the buyer, enriched with WorkStream Match Score
func (s *projectService) GetProjectProposals(ctx context.Context, projectID string, requesterID string, isAdmin bool) ([]models.Proposal, error) {
	isOwner, project, err := s.projectRepo.CheckOwnership(ctx, projectID, requesterID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}
	if !isOwner && !isAdmin {
		return nil, ErrForbidden
	}

	proposals, err := s.proposalRepo.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	// Calculate WorkStream Quality & Match Score for each proposal
	for i := range proposals {
		score, rationale := s.calculateProposalMatch(project, &proposals[i])
		proposals[i].MatchScore = score
		proposals[i].MatchRationale = rationale
	}

	return proposals, nil
}

// WithdrawProposal allows a freelancer to withdraw their proposal
func (s *projectService) WithdrawProposal(ctx context.Context, proposalID string, freelancerID string) error {
	return s.proposalRepo.Withdraw(ctx, proposalID, freelancerID)
}

// ShortlistProposal changes a proposal status to shortlisted
func (s *projectService) ShortlistProposal(ctx context.Context, proposalID string, requesterID string, isAdmin bool) error {
	proposal, err := s.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return err
	}
	if proposal == nil {
		return ErrProposalNotFound
	}

	isOwner, _, err := s.projectRepo.CheckOwnership(ctx, proposal.ProjectID, requesterID)
	if err != nil {
		return err
	}
	if !isOwner && !isAdmin {
		return ErrForbidden
	}

	if proposal.Status == "accepted" || proposal.Status == "rejected" || proposal.Status == "withdrawn" {
		return ErrProposalAlreadyDecided
	}

	return s.proposalRepo.UpdateStatus(ctx, proposalID, "shortlisted")
}

// RejectProposal changes a proposal status to rejected
func (s *projectService) RejectProposal(ctx context.Context, proposalID string, requesterID string, isAdmin bool) error {
	proposal, err := s.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return err
	}
	if proposal == nil {
		return ErrProposalNotFound
	}

	isOwner, _, err := s.projectRepo.CheckOwnership(ctx, proposal.ProjectID, requesterID)
	if err != nil {
		return err
	}
	if !isOwner && !isAdmin {
		return ErrForbidden
	}

	if proposal.Status == "accepted" || proposal.Status == "withdrawn" {
		return ErrProposalAlreadyDecided
	}

	return s.proposalRepo.UpdateStatus(ctx, proposalID, "rejected")
}

// AcceptProposal executes the atomic transaction to accept a winning proposal and create contract
func (s *projectService) AcceptProposal(ctx context.Context, proposalID string, requesterID string, isAdmin bool) (string, error) {
	proposal, err := s.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return "", err
	}
	if proposal == nil {
		return "", ErrProposalNotFound
	}

	isOwner, project, err := s.projectRepo.CheckOwnership(ctx, proposal.ProjectID, requesterID)
	if err != nil {
		return "", err
	}
	if project == nil {
		return "", ErrProjectNotFound
	}
	if !isOwner && !isAdmin {
		return "", ErrForbidden
	}

	return s.proposalRepo.AcceptProposalTx(ctx, proposalID, proposal.ProjectID)
}

// calculateProposalMatch computes WorkStream Quality & Match Score (0–100%)
func (s *projectService) calculateProposalMatch(proj *models.Project, prop *models.Proposal) (float64, string) {
	var totalScore float64 = 50.0 // base score
	var rationales []string

	// 1. Skill overlap (up to +25 pts)
	if prop.Freelancer != nil && len(proj.Skills) > 0 {
		flSkills := make(map[string]bool)
		for _, sk := range prop.Freelancer.Skills {
			flSkills[strings.ToLower(strings.TrimSpace(sk))] = true
		}
		flText := strings.ToLower(prop.Freelancer.Title + " " + prop.Freelancer.About + " " + prop.CoverLetter)

		var matched int
		for _, pSkill := range proj.Skills {
			lowSkill := strings.ToLower(strings.TrimSpace(pSkill))
			if flSkills[lowSkill] || strings.Contains(flText, lowSkill) {
				matched++
			}
		}

		if matched > 0 {
			skillBonus := (float64(matched) / float64(len(proj.Skills))) * 25.0
			totalScore += skillBonus
			rationales = append(rationales, fmt.Sprintf("Matches %d/%d required skills", matched, len(proj.Skills)))
		}
	}

	// 2. Budget compatibility (up to +15 pts)
	var targetBudget float64
	if proj.FixedBudget != nil && *proj.FixedBudget > 0 {
		targetBudget = *proj.FixedBudget
	} else if proj.BudgetMax != nil && *proj.BudgetMax > 0 {
		targetBudget = *proj.BudgetMax
	}

	if targetBudget > 0 && prop.BidAmount > 0 {
		diffRatio := math.Abs(prop.BidAmount-targetBudget) / targetBudget
		if diffRatio <= 0.15 {
			totalScore += 15.0
			rationales = append(rationales, "Bid perfectly aligns with target budget")
		} else if diffRatio <= 0.35 {
			totalScore += 10.0
			rationales = append(rationales, "Bid within reasonable budget margin")
		} else {
			totalScore += 5.0
		}
	}

	// 3. Freelancer track record (up to +10 pts)
	if prop.Freelancer != nil {
		if prop.Freelancer.Rating >= 4.8 {
			totalScore += 10.0
			rationales = append(rationales, fmt.Sprintf("%.1f⭐ top-tier rating", prop.Freelancer.Rating))
		} else if prop.Freelancer.Rating >= 4.5 {
			totalScore += 7.0
			rationales = append(rationales, fmt.Sprintf("%.1f⭐ verified rating", prop.Freelancer.Rating))
		}

		if prop.Freelancer.CompletedProjects >= 10 {
			totalScore += 5.0
		}
	}

	// Cap score at 98%
	if totalScore > 98.0 {
		totalScore = 98.0
	}

	rationale := "Good overall candidate"
	if len(rationales) > 0 {
		rationale = strings.Join(rationales, " • ")
	}

	return math.Round(totalScore), rationale
}
