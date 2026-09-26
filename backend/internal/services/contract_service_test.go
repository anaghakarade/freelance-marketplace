package services

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

// Mock Contract Repository
type mockContractRepo struct {
	contracts map[string]*models.Contract
}

func newMockContractRepo() *mockContractRepo {
	return &mockContractRepo{
		contracts: make(map[string]*models.Contract),
	}
}

func (m *mockContractRepo) CreateContractTx(ctx context.Context, tx *sql.Tx, c *models.Contract) error {
	m.contracts[c.ID] = c
	return nil
}

func (m *mockContractRepo) GetByID(ctx context.Context, id string) (*models.Contract, error) {
	c, ok := m.contracts[id]
	if !ok {
		return nil, repositories.ErrContractNotFound
	}
	return c, nil
}

func (m *mockContractRepo) GetByProjectID(ctx context.Context, projectID string) (*models.Contract, error) {
	for _, c := range m.contracts {
		if c.ProjectID == projectID {
			return c, nil
		}
	}
	return nil, repositories.ErrContractNotFound
}

func (m *mockContractRepo) GetByBuyerID(ctx context.Context, buyerID string) ([]models.Contract, error) {
	var list []models.Contract
	for _, c := range m.contracts {
		if c.BuyerID == buyerID {
			list = append(list, *c)
		}
	}
	return list, nil
}

func (m *mockContractRepo) GetByFreelancerID(ctx context.Context, freelancerID string) ([]models.Contract, error) {
	var list []models.Contract
	for _, c := range m.contracts {
		if c.FreelancerID == freelancerID {
			list = append(list, *c)
		}
	}
	return list, nil
}

func (m *mockContractRepo) UpdateStatus(ctx context.Context, id string, status string, completedAt *time.Time) error {
	c, ok := m.contracts[id]
	if !ok {
		return repositories.ErrContractNotFound
	}
	c.Status = status
	c.CompletedAt = completedAt
	return nil
}

func (m *mockContractRepo) CompleteContractAndProjectTx(ctx context.Context, contractID string, projectID string) error {
	c, ok := m.contracts[contractID]
	if !ok {
		return repositories.ErrContractNotFound
	}
	now := time.Now().UTC()
	c.Status = models.ContractStatusCompleted
	c.CompletedAt = &now
	return nil
}

// Mock Milestone Repository
type mockMilestoneRepo struct {
	milestones  map[string]*models.Milestone
	submissions map[string][]models.MilestoneSubmission
	contractRepo *mockContractRepo
}

func newMockMilestoneRepo() *mockMilestoneRepo {
	return &mockMilestoneRepo{
		milestones:  make(map[string]*models.Milestone),
		submissions: make(map[string][]models.MilestoneSubmission),
	}
}

func (m *mockMilestoneRepo) Create(ctx context.Context, milestone *models.Milestone) error {
	m.milestones[milestone.ID] = milestone
	return nil
}

func (m *mockMilestoneRepo) CreateWithNextSequence(ctx context.Context, milestone *models.Milestone) error {
	seq, _ := m.GetNextSequenceNumber(ctx, milestone.ContractID)
	milestone.SequenceNumber = seq
	return m.Create(ctx, milestone)
}

func (m *mockMilestoneRepo) GetByID(ctx context.Context, id string) (*models.Milestone, error) {
	ml, ok := m.milestones[id]
	if !ok {
		return nil, repositories.ErrMilestoneNotFound
	}
	ml.Submissions = m.submissions[id]
	return ml, nil
}

func (m *mockMilestoneRepo) GetByContractID(ctx context.Context, contractID string) ([]models.Milestone, error) {
	var list []models.Milestone
	for _, ml := range m.milestones {
		if ml.ContractID == contractID {
			ml.Submissions = m.submissions[ml.ID]
			list = append(list, *ml)
		}
	}
	return list, nil
}

func (m *mockMilestoneRepo) GetNextSequenceNumber(ctx context.Context, contractID string) (int, error) {
	maxSeq := 0
	for _, ml := range m.milestones {
		if ml.ContractID == contractID && ml.SequenceNumber > maxSeq {
			maxSeq = ml.SequenceNumber
		}
	}
	return maxSeq + 1, nil
}

func (m *mockMilestoneRepo) Update(ctx context.Context, milestone *models.Milestone) error {
	ml, ok := m.milestones[milestone.ID]
	if !ok {
		return repositories.ErrMilestoneNotFound
	}
	ml.Title = milestone.Title
	ml.Description = milestone.Description
	ml.Amount = milestone.Amount
	ml.DueDate = milestone.DueDate
	return nil
}

func (m *mockMilestoneRepo) UpdateStatus(ctx context.Context, id string, status string, completedAt *time.Time) error {
	ml, ok := m.milestones[id]
	if !ok {
		return repositories.ErrMilestoneNotFound
	}
	ml.Status = status
	ml.CompletedAt = completedAt
	return nil
}

func (m *mockMilestoneRepo) CreateSubmission(ctx context.Context, sub *models.MilestoneSubmission) error {
	m.submissions[sub.MilestoneID] = append([]models.MilestoneSubmission{*sub}, m.submissions[sub.MilestoneID]...)
	return nil
}

func (m *mockMilestoneRepo) SubmitAndTransitionTx(ctx context.Context, sub *models.MilestoneSubmission) error {
	if err := m.CreateSubmission(ctx, sub); err != nil {
		return err
	}
	return m.UpdateStatus(ctx, sub.MilestoneID, models.MilestoneStatusSubmitted, nil)
}

func (m *mockMilestoneRepo) GetSubmissionsByMilestoneID(ctx context.Context, milestoneID string) ([]models.MilestoneSubmission, error) {
	return m.submissions[milestoneID], nil
}

func (m *mockMilestoneRepo) UpdateSubmissionStatus(ctx context.Context, submissionID string, status string, reviewMsg string, reviewedAt time.Time) error {
	for mID, subs := range m.submissions {
		for i := range subs {
			if subs[i].ID == submissionID {
				subs[i].Status = status
				subs[i].ReviewMessage = &reviewMsg
				subs[i].ReviewedAt = &reviewedAt
				m.submissions[mID] = subs
				return nil
			}
		}
	}
	return nil
}

func (m *mockMilestoneRepo) RequestRevisionTx(ctx context.Context, milestoneID string, reviewMsg string, reviewedAt time.Time) error {
	ml, ok := m.milestones[milestoneID]
	if !ok {
		return repositories.ErrMilestoneNotFound
	}
	ml.Status = models.MilestoneStatusRevisionRequested
	if subs := m.submissions[milestoneID]; len(subs) > 0 {
		subs[0].Status = models.SubmissionStatusRevisionRequested
		subs[0].ReviewMessage = &reviewMsg
		subs[0].ReviewedAt = &reviewedAt
		m.submissions[milestoneID] = subs
	}
	return nil
}

func (m *mockMilestoneRepo) ApproveAndCompleteTx(ctx context.Context, milestoneID string, reviewMsg string, reviewedAt time.Time) error {
	ml, ok := m.milestones[milestoneID]
	if !ok {
		return repositories.ErrMilestoneNotFound
	}
	ml.Status = models.MilestoneStatusApproved
	ml.CompletedAt = &reviewedAt
	if subs := m.submissions[milestoneID]; len(subs) > 0 {
		subs[0].Status = models.SubmissionStatusApproved
		subs[0].ReviewMessage = &reviewMsg
		subs[0].ReviewedAt = &reviewedAt
		m.submissions[milestoneID] = subs
	}
	allApproved := true
	for _, milestone := range m.milestones {
		if milestone.ContractID == ml.ContractID && milestone.Status != models.MilestoneStatusApproved {
			allApproved = false
			break
		}
	}
	if allApproved && m.contractRepo != nil {
		contract, err := m.contractRepo.GetByID(ctx, ml.ContractID)
		if err != nil {
			return err
		}
		contract.Status = models.ContractStatusCompleted
		contract.CompletedAt = &reviewedAt
	}
	return nil
}

func TestContractService_MilestoneLifecycleAndCompletion(t *testing.T) {
	ctx := context.Background()

	contractRepo := newMockContractRepo()
	milestoneRepo := newMockMilestoneRepo()
	milestoneRepo.contractRepo = contractRepo

	contractSvc := &contractService{
		contractRepo:  contractRepo,
		milestoneRepo: milestoneRepo,
		projectRepo:   nil,
	}

	// 1. Setup Active Contract
	testContract := &models.Contract{
		ID:           "ctr_test_1",
		ProjectID:    "prj_test_1",
		ProposalID:   "prop_test_1",
		BuyerID:      "usr_buyer_1",
		FreelancerID: "usr_free_1",
		Title:        "Full Stack Web App",
		Description:  "Deliver React and Go web app",
		AgreedBudget: 1500.00,
		Currency:     "USD",
		Status:       models.ContractStatusActive,
		CreatedAt:    time.Now().UTC(),
	}
	contractRepo.contracts[testContract.ID] = testContract

	// 2. Authorization test: Stranger cannot access contract
	_, err := contractSvc.GetContract(ctx, "ctr_test_1", "usr_stranger", "buyer")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for stranger, got: %v", err)
	}

	// 3. Buyer & Freelancer can access contract
	cBuyer, err := contractSvc.GetContract(ctx, "ctr_test_1", "usr_buyer_1", "buyer")
	if err != nil {
		t.Fatalf("buyer failed to get contract: %v", err)
	}
	if cBuyer.ID != "ctr_test_1" {
		t.Errorf("expected contract ctr_test_1, got: %s", cBuyer.ID)
	}

	// 4. Create Milestone 1
	m1, err := contractSvc.CreateMilestone(ctx, "ctr_test_1", "usr_buyer_1", "buyer", models.CreateMilestoneRequest{
		Title:       "Database & Auth Setup",
		Description: "Configure PostgreSQL schema and JWT auth",
		Amount:      600.00,
	})
	if err != nil {
		t.Fatalf("failed to create milestone 1: %v", err)
	}
	if m1.SequenceNumber != 1 {
		t.Errorf("expected sequence 1, got %d", m1.SequenceNumber)
	}
	if m1.Status != models.MilestoneStatusPending {
		t.Errorf("expected status pending, got %s", m1.Status)
	}

	// 5. Create Milestone 2
	m2, err := contractSvc.CreateMilestone(ctx, "ctr_test_1", "usr_free_1", "freelancer", models.CreateMilestoneRequest{
		Title:       "Frontend UI Integration",
		Description: "Build React pages and connect REST endpoints",
		Amount:      900.00,
	})
	if err != nil {
		t.Fatalf("failed to create milestone 2: %v", err)
	}
	if m2.SequenceNumber != 2 {
		t.Errorf("expected sequence 2, got %d", m2.SequenceNumber)
	}

	// 6. Test initial progress
	progress, err := contractSvc.CalculateContractProgress(ctx, "ctr_test_1")
	if err != nil {
		t.Fatalf("failed to calculate progress: %v", err)
	}
	if progress.TotalMilestones != 2 || progress.ApprovedMilestones != 0 || progress.ProgressPercentage != 0 {
		t.Errorf("expected 0%% progress, got %d%%", progress.ProgressPercentage)
	}

	// 7. Non-freelancer cannot start milestone
	err = contractSvc.StartMilestone(ctx, m1.ID, "usr_buyer_1", "buyer")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden when buyer tries to start milestone, got: %v", err)
	}

	// 8. Freelancer starts milestone 1
	err = contractSvc.StartMilestone(ctx, m1.ID, "usr_free_1", "freelancer")
	if err != nil {
		t.Fatalf("freelancer failed to start milestone: %v", err)
	}
	m1Updated, _ := milestoneRepo.GetByID(ctx, m1.ID)
	if m1Updated.Status != models.MilestoneStatusInProgress {
		t.Errorf("expected in_progress, got %s", m1Updated.Status)
	}

	// 9. A submission needs either a message or an attachment
	_, err = contractSvc.SubmitMilestone(ctx, m1.ID, "usr_free_1", "freelancer", models.MilestoneSubmissionRequest{
		Message: "",
	})
	if err == nil {
		t.Fatalf("expected error for empty submission, got nil")
	}

	// 10. Freelancer submits valid work
	sub1, err := contractSvc.SubmitMilestone(ctx, m1.ID, "usr_free_1", "freelancer", models.MilestoneSubmissionRequest{
		Message: "PostgreSQL migrations and JWT authentication endpoints are complete and tested.",
	})
	if err != nil {
		t.Fatalf("failed to submit milestone work: %v", err)
	}
	if sub1.Status != models.SubmissionStatusSubmitted {
		t.Errorf("expected submitted status, got %s", sub1.Status)
	}

	// 11. Freelancer cannot approve their own milestone
	err = contractSvc.ApproveMilestone(ctx, m1.ID, "usr_free_1", "freelancer", "I approve my own work")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for freelancer approval, got: %v", err)
	}

	// 12. Buyer requests revision on milestone 1
	err = contractSvc.RequestMilestoneRevision(ctx, m1.ID, "usr_buyer_1", "buyer", models.MilestoneReviewRequest{
		Message: "Please add password hashing unit test coverage before approval.",
	})
	if err != nil {
		t.Fatalf("buyer failed to request revision: %v", err)
	}
	m1Revision, _ := milestoneRepo.GetByID(ctx, m1.ID)
	if m1Revision.Status != models.MilestoneStatusRevisionRequested {
		t.Errorf("expected revision_requested, got %s", m1Revision.Status)
	}

	// 13. Freelancer re-starts and re-submits milestone 1
	err = contractSvc.StartMilestone(ctx, m1.ID, "usr_free_1", "freelancer")
	if err != nil {
		t.Fatalf("failed to re-start milestone after revision request: %v", err)
	}

	_, err = contractSvc.SubmitMilestone(ctx, m1.ID, "usr_free_1", "freelancer", models.MilestoneSubmissionRequest{
		Message: "Added TestPasswordHashing unit test suite covering bcrypt hashing and comparison.",
	})
	if err != nil {
		t.Fatalf("failed to re-submit milestone: %v", err)
	}

	// 14. Buyer approves milestone 1
	err = contractSvc.ApproveMilestone(ctx, m1.ID, "usr_buyer_1", "buyer", "Verified tests. Looks great!")
	if err != nil {
		t.Fatalf("buyer failed to approve milestone: %v", err)
	}

	// Contract should still be active because milestone 2 is not completed
	contractCheck1, _ := contractRepo.GetByID(ctx, "ctr_test_1")
	if contractCheck1.Status != models.ContractStatusActive {
		t.Errorf("expected contract to remain active with 1/2 milestones approved, got %s", contractCheck1.Status)
	}

	progressMid, _ := contractSvc.CalculateContractProgress(ctx, "ctr_test_1")
	if progressMid.ProgressPercentage != 50 {
		t.Errorf("expected 50%% progress, got %d%%", progressMid.ProgressPercentage)
	}

	// 15. Freelancer completes and buyer approves milestone 2
	_ = contractSvc.StartMilestone(ctx, m2.ID, "usr_free_1", "freelancer")
	_, _ = contractSvc.SubmitMilestone(ctx, m2.ID, "usr_free_1", "freelancer", models.MilestoneSubmissionRequest{
		Message: "React frontend components and routes are complete and verified in browser.",
	})
	err = contractSvc.ApproveMilestone(ctx, m2.ID, "usr_buyer_1", "buyer", "Excellent delivery!")
	if err != nil {
		t.Fatalf("buyer failed to approve milestone 2: %v", err)
	}

	// 16. Automatic completion: Contract should now be COMPLETED
	contractCompleted, _ := contractRepo.GetByID(ctx, "ctr_test_1")
	if contractCompleted.Status != models.ContractStatusCompleted {
		t.Errorf("expected contract status 'completed', got: '%s'", contractCompleted.Status)
	}
	if contractCompleted.CompletedAt == nil {
		t.Errorf("expected completedAt to be populated on contract")
	}

	progressFinal, _ := contractSvc.CalculateContractProgress(ctx, "ctr_test_1")
	if progressFinal.ProgressPercentage != 100 || progressFinal.ApprovedMilestones != 2 {
		t.Errorf("expected 100%% progress, got %d%%", progressFinal.ProgressPercentage)
	}
}

// TestContractService_SubmitMilestone_RBAC covers the exact 403 scenario from the bug report:
// A stranger or the buyer must be rejected; the assigned freelancer must succeed.
func TestContractService_SubmitMilestone_RBAC(t *testing.T) {
	ctx := context.Background()

	contractRepo := newMockContractRepo()
	milestoneRepo := newMockMilestoneRepo()
	milestoneRepo.contractRepo = contractRepo

	svc := &contractService{
		contractRepo:  contractRepo,
		milestoneRepo: milestoneRepo,
		projectRepo:   nil,
	}

	// Seed a contract with a known buyer and freelancer.
	const (
		buyerID      = "usr_buyer_rbac"
		freelancerID = "usr_free_rbac"
		strangerID   = "usr_stranger_rbac"
		contractID   = "ctr_rbac_1"
		milestoneID  = "mls_rbac_1"
	)

	contractRepo.contracts[contractID] = &models.Contract{
		ID:           contractID,
		ProjectID:    "prj_rbac_1",
		ProposalID:   "prop_rbac_1",
		BuyerID:      buyerID,
		FreelancerID: freelancerID,
		Title:        "RBAC Test Contract",
		AgreedBudget: 500,
		Currency:     "USD",
		Status:       models.ContractStatusActive,
		CreatedAt:    time.Now().UTC(),
	}

	milestoneRepo.milestones[milestoneID] = &models.Milestone{
		ID:             milestoneID,
		ContractID:     contractID,
		Title:          "RBAC Milestone",
		SequenceNumber: 1,
		Amount:         500,
		Status:         models.MilestoneStatusPending,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}

	req := models.MilestoneSubmissionRequest{
		Message: "Deliverable complete.",
	}

	// 1. Stranger (unassigned third party) must get 403 on StartMilestone.
	if err := svc.StartMilestone(ctx, milestoneID, strangerID, "freelancer"); !errors.Is(err, ErrForbidden) {
		t.Errorf("stranger StartMilestone: expected ErrForbidden, got: %v", err)
	}

	// 2. Buyer must get 403 on StartMilestone (not their role).
	if err := svc.StartMilestone(ctx, milestoneID, buyerID, "buyer"); !errors.Is(err, ErrForbidden) {
		t.Errorf("buyer StartMilestone: expected ErrForbidden, got: %v", err)
	}

	// Transition to in_progress as the legitimate freelancer.
	if err := svc.StartMilestone(ctx, milestoneID, freelancerID, "freelancer"); err != nil {
		t.Fatalf("assigned freelancer StartMilestone failed: %v", err)
	}

	// 3. Stranger must get 403 on SubmitMilestone.
	if _, err := svc.SubmitMilestone(ctx, milestoneID, strangerID, "freelancer", req); !errors.Is(err, ErrForbidden) {
		t.Errorf("stranger SubmitMilestone: expected ErrForbidden, got: %v", err)
	}

	// 4. Buyer must get 403 on SubmitMilestone (buyer is not the freelancer).
	if _, err := svc.SubmitMilestone(ctx, milestoneID, buyerID, "buyer", req); !errors.Is(err, ErrForbidden) {
		t.Errorf("buyer SubmitMilestone: expected ErrForbidden, got: %v", err)
	}

	// 5. Assigned freelancer must succeed.
	sub, err := svc.SubmitMilestone(ctx, milestoneID, freelancerID, "freelancer", req)
	if err != nil {
		t.Fatalf("assigned freelancer SubmitMilestone failed: %v", err)
	}
	if sub.Status != models.SubmissionStatusSubmitted {
		t.Errorf("expected submitted status, got %s", sub.Status)
	}

	// 6. Milestone status must be 'submitted' after the freelancer submits.
	m, _ := milestoneRepo.GetByID(ctx, milestoneID)
	if m.Status != models.MilestoneStatusSubmitted {
		t.Errorf("expected milestone status 'submitted', got '%s'", m.Status)
	}

	// 7. SubmittedMilestones count must be reflected in ContractProgress (drives
	//    the 'N deliverables awaiting review' badge on the Buyer Dashboard).
	progress, err := svc.CalculateContractProgress(ctx, contractID)
	if err != nil {
		t.Fatalf("CalculateContractProgress failed: %v", err)
	}
	if progress.SubmittedMilestones != 1 {
		t.Errorf("expected 1 submitted milestone in progress, got %d", progress.SubmittedMilestones)
	}

	// 8. Buyer can approve the submitted milestone.
	if err := svc.ApproveMilestone(ctx, milestoneID, buyerID, "buyer", "LGTM"); err != nil {
		t.Fatalf("buyer ApproveMilestone failed: %v", err)
	}

	// 9. Freelancer must get 403 trying to approve their own work.
	// (Re-set milestone status to submitted for this check.)
	milestoneRepo.milestones[milestoneID].Status = models.MilestoneStatusSubmitted
	if err := svc.ApproveMilestone(ctx, milestoneID, freelancerID, "freelancer", "I approve my own work"); !errors.Is(err, ErrForbidden) {
		t.Errorf("freelancer ApproveMilestone: expected ErrForbidden, got: %v", err)
	}
}

// TestContractService_SubmittedMilestonesInProgress verifies that the
// SubmittedMilestones field of ContractProgress is correctly incremented,
// as it drives the buyer-dashboard "N deliverables awaiting review" badge.
func TestContractService_SubmittedMilestonesInProgress(t *testing.T) {
	ctx := context.Background()

	contractRepo := newMockContractRepo()
	milestoneRepo := newMockMilestoneRepo()
	milestoneRepo.contractRepo = contractRepo

	svc := &contractService{
		contractRepo:  contractRepo,
		milestoneRepo: milestoneRepo,
		projectRepo:   nil,
	}

	contractRepo.contracts["ctr_prog_1"] = &models.Contract{
		ID:           "ctr_prog_1",
		BuyerID:      "buyer_prog",
		FreelancerID: "free_prog",
		Status:       models.ContractStatusActive,
		CreatedAt:    time.Now().UTC(),
	}

	// Add 3 milestones in different states.
	for i, status := range []string{
		models.MilestoneStatusSubmitted,
		models.MilestoneStatusSubmitted,
		models.MilestoneStatusInProgress,
	} {
		id := "mls_prog_" + string(rune('a'+i))
		milestoneRepo.milestones[id] = &models.Milestone{
			ID:         id,
			ContractID: "ctr_prog_1",
			Title:      "Milestone " + string(rune('A'+i)),
			Amount:     100,
			Status:     status,
			CreatedAt:  time.Now().UTC(),
			UpdatedAt:  time.Now().UTC(),
		}
	}

	progress, err := svc.CalculateContractProgress(ctx, "ctr_prog_1")
	if err != nil {
		t.Fatalf("CalculateContractProgress error: %v", err)
	}
	if progress.SubmittedMilestones != 2 {
		t.Errorf("expected 2 submitted milestones, got %d", progress.SubmittedMilestones)
	}
	if progress.InProgressMilestones != 1 {
		t.Errorf("expected 1 in_progress milestone, got %d", progress.InProgressMilestones)
	}
	if progress.TotalMilestones != 3 {
		t.Errorf("expected 3 total milestones, got %d", progress.TotalMilestones)
	}
}

