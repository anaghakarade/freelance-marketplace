package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync/atomic"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	contractIDCounter uint64

	ErrContractNotFound      = errors.New("contract not found")
	ErrMilestoneNotFound     = errors.New("milestone not found")
	ErrInvalidContractStatus = errors.New("contract is not in an active state for this operation")
	ErrInvalidMilestoneState = errors.New("invalid milestone state transition")
	ErrNoMilestones          = errors.New("contract must have at least one milestone to complete")
)

// ContractService defines business operations for contracts, milestones, and submissions
type ContractService interface {
	GetContract(ctx context.Context, contractID string, userID string, userRole string) (*models.Contract, error)
	GetContractByProject(ctx context.Context, projectID string, userID string, userRole string) (*models.Contract, error)
	GetMyContracts(ctx context.Context, userID string, userRole string) ([]models.Contract, error)
	GetMilestones(ctx context.Context, contractID string, userID string, userRole string) (*models.MilestonesResponseData, error)
	GetMilestoneByID(ctx context.Context, milestoneID string, userID string, userRole string) (*models.Milestone, error)
	CreateMilestone(ctx context.Context, contractID string, userID string, userRole string, req models.CreateMilestoneRequest) (*models.Milestone, error)
	UpdateMilestone(ctx context.Context, milestoneID string, userID string, userRole string, req models.UpdateMilestoneRequest) (*models.Milestone, error)
	StartMilestone(ctx context.Context, milestoneID string, userID string, userRole string) error
	SubmitMilestone(ctx context.Context, milestoneID string, userID string, userRole string, req models.MilestoneSubmissionRequest) (*models.MilestoneSubmission, error)
	ApproveMilestone(ctx context.Context, milestoneID string, userID string, userRole string, reviewMsg string) error
	RequestMilestoneRevision(ctx context.Context, milestoneID string, userID string, userRole string, req models.MilestoneReviewRequest) error
	GetMilestoneSubmissions(ctx context.Context, milestoneID string, userID string, userRole string) ([]models.MilestoneSubmission, error)
	CalculateContractProgress(ctx context.Context, contractID string) (*models.ContractProgress, error)
}

type contractService struct {
	contractRepo  repositories.ContractRepository
	milestoneRepo repositories.MilestoneRepository
	projectRepo   repositories.ProjectRepository
}

// NewContractService creates an instance of ContractService
func NewContractService(
	contractRepo repositories.ContractRepository,
	milestoneRepo repositories.MilestoneRepository,
	projectRepo repositories.ProjectRepository,
) ContractService {
	return &contractService{
		contractRepo:  contractRepo,
		milestoneRepo: milestoneRepo,
		projectRepo:   projectRepo,
	}
}

// GetContract retrieves a contract and verifies authorization
func (s *contractService) GetContract(ctx context.Context, contractID string, userID string, userRole string) (*models.Contract, error) {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		if errors.Is(err, repositories.ErrContractNotFound) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID && contract.FreelancerID != userID {
		return nil, ErrForbidden
	}

	// Attach milestones & dynamic progress
	milestones, err := s.milestoneRepo.GetByContractID(ctx, contract.ID)
	if err == nil {
		contract.Milestones = milestones
	}
	progress, err := s.CalculateContractProgress(ctx, contract.ID)
	if err == nil {
		contract.Progress = progress
	}

	return contract, nil
}

// GetContractByProject retrieves the active contract for a project
func (s *contractService) GetContractByProject(ctx context.Context, projectID string, userID string, userRole string) (*models.Contract, error) {
	contract, err := s.contractRepo.GetByProjectID(ctx, projectID)
	if err != nil {
		if errors.Is(err, repositories.ErrContractNotFound) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID && contract.FreelancerID != userID {
		return nil, ErrForbidden
	}

	// Attach milestones & progress
	milestones, err := s.milestoneRepo.GetByContractID(ctx, contract.ID)
	if err == nil {
		contract.Milestones = milestones
	}
	progress, err := s.CalculateContractProgress(ctx, contract.ID)
	if err == nil {
		contract.Progress = progress
	}

	return contract, nil
}

// GetMyContracts retrieves contracts for the current authenticated user (buyer or freelancer)
func (s *contractService) GetMyContracts(ctx context.Context, userID string, userRole string) ([]models.Contract, error) {
	var contracts []models.Contract
	var err error

	normalizedRole := strings.ToLower(strings.TrimSpace(userRole))
	if normalizedRole == "freelancer" || normalizedRole == "seller" {
		contracts, err = s.contractRepo.GetByFreelancerID(ctx, userID)
	} else {
		contracts, err = s.contractRepo.GetByBuyerID(ctx, userID)
	}

	if err != nil {
		return nil, err
	}

	// Attach progress for each contract
	for i := range contracts {
		progress, err := s.CalculateContractProgress(ctx, contracts[i].ID)
		if err == nil {
			contracts[i].Progress = progress
		}
	}

	return contracts, nil
}

// GetMilestones retrieves all milestones and dynamic progress for a contract
func (s *contractService) GetMilestones(ctx context.Context, contractID string, userID string, userRole string) (*models.MilestonesResponseData, error) {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		if errors.Is(err, repositories.ErrContractNotFound) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID && contract.FreelancerID != userID {
		return nil, ErrForbidden
	}

	milestones, err := s.milestoneRepo.GetByContractID(ctx, contractID)
	if err != nil {
		return nil, err
	}

	progress, err := s.CalculateContractProgress(ctx, contractID)
	if err != nil {
		return nil, err
	}

	return &models.MilestonesResponseData{
		Milestones: milestones,
		Progress:   progress,
	}, nil
}

// GetMilestoneByID retrieves a single milestone with authorization
func (s *contractService) GetMilestoneByID(ctx context.Context, milestoneID string, userID string, userRole string) (*models.Milestone, error) {
	m, err := s.milestoneRepo.GetByID(ctx, milestoneID)
	if err != nil {
		if errors.Is(err, repositories.ErrMilestoneNotFound) {
			return nil, ErrMilestoneNotFound
		}
		return nil, err
	}

	contract, err := s.contractRepo.GetByID(ctx, m.ContractID)
	if err != nil {
		return nil, err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID && contract.FreelancerID != userID {
		return nil, ErrForbidden
	}

	return m, nil
}

// CreateMilestone adds a milestone to an active contract
func (s *contractService) CreateMilestone(ctx context.Context, contractID string, userID string, userRole string, req models.CreateMilestoneRequest) (*models.Milestone, error) {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		if errors.Is(err, repositories.ErrContractNotFound) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID && contract.FreelancerID != userID {
		return nil, ErrForbidden
	}

	if contract.Status != models.ContractStatusActive && contract.Status != models.ContractStatusDraft {
		return nil, fmt.Errorf("%w: cannot add milestones to %s contract", ErrInvalidContractStatus, contract.Status)
	}

	if strings.TrimSpace(req.Title) == "" || len(strings.TrimSpace(req.Title)) < 3 {
		return nil, errors.New("milestone title must be at least 3 characters")
	}
	if req.Amount < 0 {
		return nil, errors.New("milestone amount cannot be negative")
	}

	currency := req.Currency
	if currency == "" {
		currency = contract.Currency
		if currency == "" {
			currency = "USD"
		}
	}

	milestone := &models.Milestone{
		ID:             fmt.Sprintf("mls_usr_%d_%d", time.Now().UnixMilli(), atomic.AddUint64(&contractIDCounter, 1)),
		ContractID:     contractID,
		Title:          strings.TrimSpace(req.Title),
		Description:    strings.TrimSpace(req.Description),
		Amount:         req.Amount,
		Currency:       currency,
		DueDate:        req.DueDate,
		Status:         models.MilestoneStatusPending,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}

	if err := s.milestoneRepo.CreateWithNextSequence(ctx, milestone); err != nil {
		return nil, fmt.Errorf("failed to create milestone: %w", err)
	}

	return milestone, nil
}

// UpdateMilestone permits contract participants to edit only pending milestones.
func (s *contractService) UpdateMilestone(ctx context.Context, milestoneID string, userID string, userRole string, req models.UpdateMilestoneRequest) (*models.Milestone, error) {
	m, err := s.GetMilestoneByID(ctx, milestoneID, userID, userRole)
	if err != nil {
		return nil, err
	}
	if m.Status != models.MilestoneStatusPending {
		return nil, fmt.Errorf("%w: only pending milestones can be edited", ErrInvalidMilestoneState)
	}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if len(title) < 3 || len(title) > 200 {
			return nil, errors.New("milestone title must be between 3 and 200 characters")
		}
		m.Title = title
	}
	if req.Description != nil {
		m.Description = strings.TrimSpace(*req.Description)
	}
	if req.Amount != nil {
		if *req.Amount < 0 {
			return nil, errors.New("milestone amount cannot be negative")
		}
		m.Amount = *req.Amount
	}
	if req.DueDate != nil {
		m.DueDate = req.DueDate
	}
	if err := s.milestoneRepo.Update(ctx, m); err != nil {
		return nil, err
	}
	return s.milestoneRepo.GetByID(ctx, milestoneID)
}

// StartMilestone moves a milestone to in_progress (freelancer action)
func (s *contractService) StartMilestone(ctx context.Context, milestoneID string, userID string, userRole string) error {
	m, err := s.milestoneRepo.GetByID(ctx, milestoneID)
	if err != nil {
		if errors.Is(err, repositories.ErrMilestoneNotFound) {
			return ErrMilestoneNotFound
		}
		return err
	}

	contract, err := s.contractRepo.GetByID(ctx, m.ContractID)
	if err != nil {
		return err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.FreelancerID != userID {
		return ErrForbidden // Only assigned freelancer may start work
	}

	if m.Status != models.MilestoneStatusPending && m.Status != models.MilestoneStatusRevisionRequested {
		return fmt.Errorf("%w: cannot start milestone currently in '%s' status", ErrInvalidMilestoneState, m.Status)
	}

	return s.milestoneRepo.UpdateStatus(ctx, milestoneID, models.MilestoneStatusInProgress, nil)
}

// SubmitMilestone records freelancer deliverable submission and transitions milestone to submitted
func (s *contractService) SubmitMilestone(ctx context.Context, milestoneID string, userID string, userRole string, req models.MilestoneSubmissionRequest) (*models.MilestoneSubmission, error) {
	m, err := s.milestoneRepo.GetByID(ctx, milestoneID)
	if err != nil {
		if errors.Is(err, repositories.ErrMilestoneNotFound) {
			return nil, ErrMilestoneNotFound
		}
		return nil, err
	}

	contract, err := s.contractRepo.GetByID(ctx, m.ContractID)
	if err != nil {
		return nil, err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.FreelancerID != userID {
		return nil, ErrForbidden // Only assigned freelancer may submit work
	}

	if m.Status != models.MilestoneStatusInProgress {
		return nil, fmt.Errorf("%w: milestone must be 'in_progress' to submit work (current: '%s')", ErrInvalidMilestoneState, m.Status)
	}

	msg := strings.TrimSpace(req.Message)
	if msg == "" && (req.AttachmentURL == nil || strings.TrimSpace(*req.AttachmentURL) == "") {
		return nil, errors.New("a submission message or attachment URL is required")
	}

	now := time.Now().UTC()
	sub := &models.MilestoneSubmission{
		ID:            fmt.Sprintf("subm_usr_%d_%d", now.UnixMilli(), atomic.AddUint64(&contractIDCounter, 1)),
		MilestoneID:   milestoneID,
		SubmittedBy:   userID,
		Message:       msg,
		AttachmentURL: req.AttachmentURL,
		Status:        models.SubmissionStatusSubmitted,
		CreatedAt:     now,
	}

	if err := s.milestoneRepo.SubmitAndTransitionTx(ctx, sub); err != nil {
		return nil, fmt.Errorf("failed to submit milestone work: %w", err)
	}

	return sub, nil
}

// ApproveMilestone approves a submitted milestone (buyer action), and completes contract if all milestones approved
func (s *contractService) ApproveMilestone(ctx context.Context, milestoneID string, userID string, userRole string, reviewMsg string) error {
	m, err := s.milestoneRepo.GetByID(ctx, milestoneID)
	if err != nil {
		if errors.Is(err, repositories.ErrMilestoneNotFound) {
			return ErrMilestoneNotFound
		}
		return err
	}

	contract, err := s.contractRepo.GetByID(ctx, m.ContractID)
	if err != nil {
		return err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID {
		return ErrForbidden // Only project buyer can approve milestone
	}

	if m.Status != models.MilestoneStatusSubmitted {
		return fmt.Errorf("%w: milestone must be in 'submitted' status to approve (current: '%s')", ErrInvalidMilestoneState, m.Status)
	}

	now := time.Now().UTC()

	if err := s.milestoneRepo.ApproveAndCompleteTx(ctx, milestoneID, reviewMsg, now); err != nil {
		return fmt.Errorf("failed to approve milestone: %w", err)
	}
	return nil
}

// RequestMilestoneRevision requests changes on a submitted milestone (buyer action)
func (s *contractService) RequestMilestoneRevision(ctx context.Context, milestoneID string, userID string, userRole string, req models.MilestoneReviewRequest) error {
	m, err := s.milestoneRepo.GetByID(ctx, milestoneID)
	if err != nil {
		if errors.Is(err, repositories.ErrMilestoneNotFound) {
			return ErrMilestoneNotFound
		}
		return err
	}

	contract, err := s.contractRepo.GetByID(ctx, m.ContractID)
	if err != nil {
		return err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID {
		return ErrForbidden // Only buyer can request revision
	}

	if m.Status != models.MilestoneStatusSubmitted {
		return fmt.Errorf("%w: milestone must be in 'submitted' status to request revisions (current: '%s')", ErrInvalidMilestoneState, m.Status)
	}

	msg := strings.TrimSpace(req.Message)
	if msg == "" || len(msg) < 5 {
		return errors.New("revision feedback message must be at least 5 characters")
	}

	now := time.Now().UTC()

	if err := s.milestoneRepo.RequestRevisionTx(ctx, milestoneID, msg, now); err != nil {
		return fmt.Errorf("failed to request revision on milestone: %w", err)
	}

	return nil
}

// GetMilestoneSubmissions retrieves work submissions audit trail for a milestone
func (s *contractService) GetMilestoneSubmissions(ctx context.Context, milestoneID string, userID string, userRole string) ([]models.MilestoneSubmission, error) {
	m, err := s.milestoneRepo.GetByID(ctx, milestoneID)
	if err != nil {
		if errors.Is(err, repositories.ErrMilestoneNotFound) {
			return nil, ErrMilestoneNotFound
		}
		return nil, err
	}

	contract, err := s.contractRepo.GetByID(ctx, m.ContractID)
	if err != nil {
		return nil, err
	}

	isAdmin := strings.EqualFold(userRole, "admin")
	if !isAdmin && contract.BuyerID != userID && contract.FreelancerID != userID {
		return nil, ErrForbidden
	}

	return s.milestoneRepo.GetSubmissionsByMilestoneID(ctx, milestoneID)
}

// CalculateContractProgress dynamically evaluates milestone statuses and statistics for a contract
func (s *contractService) CalculateContractProgress(ctx context.Context, contractID string) (*models.ContractProgress, error) {
	milestones, err := s.milestoneRepo.GetByContractID(ctx, contractID)
	if err != nil {
		return nil, err
	}

	progress := &models.ContractProgress{
		TotalMilestones: len(milestones),
	}

	for _, m := range milestones {
		progress.TotalAmount += m.Amount

		switch m.Status {
		case models.MilestoneStatusApproved:
			progress.ApprovedMilestones++
			progress.ApprovedAmount += m.Amount
		case models.MilestoneStatusInProgress:
			progress.InProgressMilestones++
		case models.MilestoneStatusSubmitted:
			progress.SubmittedMilestones++
		case models.MilestoneStatusRevisionRequested:
			progress.RevisionRequestedMilestones++
		case models.MilestoneStatusPending:
			progress.PendingMilestones++
		}
	}

	if progress.TotalMilestones > 0 {
		progress.ProgressPercentage = int(float64(progress.ApprovedMilestones) / float64(progress.TotalMilestones) * 100.0)
	}

	return progress, nil
}
