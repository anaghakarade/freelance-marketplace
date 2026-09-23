package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

// MockProjectRepo implements repositories.ProjectRepository for testing
type MockProjectRepo struct {
	projects map[string]*models.Project
}

func NewMockProjectRepo() *MockProjectRepo {
	return &MockProjectRepo{projects: make(map[string]*models.Project)}
}

func (m *MockProjectRepo) Create(ctx context.Context, p *models.Project) error {
	m.projects[p.ID] = p
	return nil
}

func (m *MockProjectRepo) GetByID(ctx context.Context, id string) (*models.Project, error) {
	if p, ok := m.projects[id]; ok {
		return p, nil
	}
	return nil, nil
}

func (m *MockProjectRepo) GetAll(ctx context.Context, f models.ProjectFilters) ([]models.Project, int, error) {
	var list []models.Project
	for _, p := range m.projects {
		if p.Status == "open" {
			list = append(list, *p)
		}
	}
	return list, len(list), nil
}

func (m *MockProjectRepo) GetByBuyerID(ctx context.Context, buyerID string) ([]models.Project, error) {
	var list []models.Project
	for _, p := range m.projects {
		if p.BuyerID == buyerID {
			list = append(list, *p)
		}
	}
	return list, nil
}

func (m *MockProjectRepo) Update(ctx context.Context, id string, p *models.Project) error {
	if _, ok := m.projects[id]; !ok {
		return repositories.ErrProjectNotFound
	}
	m.projects[id] = p
	return nil
}

func (m *MockProjectRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	if p, ok := m.projects[id]; ok {
		p.Status = status
		return nil
	}
	return repositories.ErrProjectNotFound
}

func (m *MockProjectRepo) Delete(ctx context.Context, id string) error {
	if _, ok := m.projects[id]; !ok {
		return repositories.ErrProjectNotFound
	}
	delete(m.projects, id)
	return nil
}

func (m *MockProjectRepo) IncrementProposalCount(ctx context.Context, projectID string) error {
	if p, ok := m.projects[projectID]; ok {
		p.ProposalCount++
	}
	return nil
}

func (m *MockProjectRepo) DecrementProposalCount(ctx context.Context, projectID string) error {
	if p, ok := m.projects[projectID]; ok && p.ProposalCount > 0 {
		p.ProposalCount--
	}
	return nil
}

func (m *MockProjectRepo) CheckOwnership(ctx context.Context, projectID string, buyerID string) (bool, *models.Project, error) {
	p, ok := m.projects[projectID]
	if !ok {
		return false, nil, nil
	}
	return p.BuyerID == buyerID, p, nil
}

// MockProposalRepo implements repositories.ProposalRepository for testing
type MockProposalRepo struct {
	proposals map[string]*models.Proposal
}

func NewMockProposalRepo() *MockProposalRepo {
	return &MockProposalRepo{proposals: make(map[string]*models.Proposal)}
}

func (m *MockProposalRepo) Create(ctx context.Context, p *models.Proposal) error {
	m.proposals[p.ID] = p
	return nil
}

func (m *MockProposalRepo) GetByID(ctx context.Context, id string) (*models.Proposal, error) {
	if p, ok := m.proposals[id]; ok {
		return p, nil
	}
	return nil, nil
}

func (m *MockProposalRepo) GetByProjectID(ctx context.Context, projectID string) ([]models.Proposal, error) {
	var list []models.Proposal
	for _, p := range m.proposals {
		if p.ProjectID == projectID {
			list = append(list, *p)
		}
	}
	return list, nil
}

func (m *MockProposalRepo) GetByFreelancerID(ctx context.Context, freelancerID string) ([]models.Proposal, error) {
	var list []models.Proposal
	for _, p := range m.proposals {
		if p.FreelancerID == freelancerID {
			list = append(list, *p)
		}
	}
	return list, nil
}

func (m *MockProposalRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	if p, ok := m.proposals[id]; ok {
		p.Status = status
		return nil
	}
	return repositories.ErrProposalNotFound
}

func (m *MockProposalRepo) Withdraw(ctx context.Context, id string, freelancerID string) error {
	if p, ok := m.proposals[id]; ok && p.FreelancerID == freelancerID {
		p.Status = "withdrawn"
		return nil
	}
	return repositories.ErrProposalNotFound
}

func (m *MockProposalRepo) HasFreelancerApplied(ctx context.Context, projectID string, freelancerID string) (bool, error) {
	for _, p := range m.proposals {
		if p.ProjectID == projectID && p.FreelancerID == freelancerID && p.Status != "withdrawn" {
			return true, nil
		}
	}
	return false, nil
}

func (m *MockProposalRepo) AcceptProposalTx(ctx context.Context, proposalID string, projectID string) (string, error) {
	p, ok := m.proposals[proposalID]
	if !ok || p.ProjectID != projectID {
		return "", repositories.ErrProposalNotFound
	}
	p.Status = "accepted"

	for _, other := range m.proposals {
		if other.ProjectID == projectID && other.ID != proposalID && (other.Status == "pending" || other.Status == "shortlisted") {
			other.Status = "rejected"
		}
	}
	return "ctr_mock_test_1", nil
}

type mockProjectCatRepo struct{}

func (m *mockProjectCatRepo) GetAll(ctx context.Context) ([]models.Category, error) {
	return nil, nil
}
func (m *mockProjectCatRepo) GetBySlug(ctx context.Context, slug string) (*models.Category, error) {
	return &models.Category{ID: "cat_1", Slug: slug, Name: "Tech"}, nil
}
func (m *mockProjectCatRepo) GetByID(ctx context.Context, id string) (*models.Category, error) {
	return &models.Category{ID: id, Slug: "cat-slug", Name: "Category"}, nil
}
func (m *mockProjectCatRepo) GetSubcategoriesByCategorySlug(ctx context.Context, slug string) ([]models.Subcategory, error) {
	return nil, nil
}
func (m *mockProjectCatRepo) GetSubcategoryByID(ctx context.Context, id string) (*models.Subcategory, error) {
	return &models.Subcategory{ID: id, Slug: "sub-slug", Name: "Subcategory"}, nil
}
func (m *mockProjectCatRepo) ValidateCategoryAndSubcategory(ctx context.Context, cID, sID string) (*models.Category, *models.Subcategory, error) {
	return &models.Category{ID: cID}, &models.Subcategory{ID: sID}, nil
}

func TestProjectService_CreateAndValidateProject(t *testing.T) {
	projRepo := NewMockProjectRepo()
	propRepo := NewMockProposalRepo()
	catRepo := &mockProjectCatRepo{}

	svc := NewProjectService(projRepo, propRepo, catRepo, nil)
	ctx := context.Background()

	// 1. Invalid title (< 10 chars)
	_, err := svc.CreateProject(ctx, "usr_buyer_1", models.CreateProjectRequest{
		Title:       "Short",
		Description: "A comprehensive project description that easily exceeds the required fifty characters limit.",
		CategoryID:  "cat_1",
		Skills:      []string{"React"},
	})
	if err == nil {
		t.Fatalf("expected validation error for short title, got nil")
	}

	// 2. Invalid description (< 50 chars)
	_, err = svc.CreateProject(ctx, "usr_buyer_1", models.CreateProjectRequest{
		Title:       "Valid Title For Project",
		Description: "Too short description",
		CategoryID:  "cat_1",
		Skills:      []string{"React"},
	})
	if err == nil {
		t.Fatalf("expected validation error for short description, got nil")
	}

	// 3. Valid project creation
	fixedBudget := 800.0
	proj, err := svc.CreateProject(ctx, "usr_buyer_1", models.CreateProjectRequest{
		Title:       "Custom Analytics Dashboard in React",
		Description: "A comprehensive project description that easily exceeds the required fifty characters limit for testing.",
		CategoryID:  "cat_1",
		Skills:      []string{"React", "TypeScript"},
		BudgetType:  "fixed",
		FixedBudget: &fixedBudget,
	})
	if err != nil {
		t.Fatalf("unexpected error creating project: %v", err)
	}
	if proj.Status != "open" {
		t.Errorf("expected status 'open', got '%s'", proj.Status)
	}
	if proj.BuyerID != "usr_buyer_1" {
		t.Errorf("expected buyer ID 'usr_buyer_1', got '%s'", proj.BuyerID)
	}

	// 4. Duplicate project creation (same buyer, same title)
	_, err = svc.CreateProject(ctx, "usr_buyer_1", models.CreateProjectRequest{
		Title:       "custom analytics dashboard in react", // case-insensitive duplicate
		Description: "Another comprehensive project description that easily exceeds the required fifty characters limit.",
		CategoryID:  "cat_1",
		Skills:      []string{"React"},
		BudgetType:  "fixed",
		FixedBudget: &fixedBudget,
	})
	if err == nil {
		t.Fatalf("expected validation error for duplicate project, got nil")
	}
}

func TestProjectService_ProposalLifecycleAndAcceptWorkflow(t *testing.T) {
	projRepo := NewMockProjectRepo()
	propRepo := NewMockProposalRepo()
	catRepo := &mockProjectCatRepo{}

	svc := NewProjectService(projRepo, propRepo, catRepo, nil)
	ctx := context.Background()

	// Create test project
	fixedBudget := 1000.0
	proj := &models.Project{
		ID:          "prj_test_1",
		BuyerID:     "usr_buyer_1",
		Title:       "Test SaaS Platform Build",
		Description: "Detailed description of a SaaS platform build that meets all criteria.",
		CategoryID:  "cat_1",
		Skills:      []string{"React", "Node.js"},
		BudgetType:  "fixed",
		FixedBudget: &fixedBudget,
		Status:      "open",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_ = projRepo.Create(ctx, proj)

	// 1. Buyer cannot bid on own project
	_, err := svc.SubmitProposal(ctx, "prj_test_1", "usr_buyer_1", models.CreateProposalRequest{
		CoverLetter:  "I want to bid on my own project with enough characters here.",
		BidAmount:    500,
		DeliveryDays: 10,
	})
	if !errors.Is(err, ErrCannotBidOwnProject) {
		t.Fatalf("expected ErrCannotBidOwnProject, got: %v", err)
	}

	// 2. Freelancer 1 submits proposal
	prop1, err := svc.SubmitProposal(ctx, "prj_test_1", "usr_free_1", models.CreateProposalRequest{
		CoverLetter:  "Hello, I have 5 years experience building SaaS platforms with React and Node.js.",
		BidAmount:    950,
		DeliveryDays: 14,
	})
	if err != nil {
		t.Fatalf("failed to submit proposal: %v", err)
	}
	if prop1.Status != "pending" {
		t.Errorf("expected status 'pending', got '%s'", prop1.Status)
	}

	// 3. Duplicate submission by same freelancer blocked
	_, err = svc.SubmitProposal(ctx, "prj_test_1", "usr_free_1", models.CreateProposalRequest{
		CoverLetter:  "Second proposal trying to duplicate the previous one with long text.",
		BidAmount:    900,
		DeliveryDays: 12,
	})
	if !errors.Is(err, ErrDuplicateProposal) {
		t.Fatalf("expected ErrDuplicateProposal, got: %v", err)
	}

	// 4. Freelancer 2 submits proposal
	prop2, err := svc.SubmitProposal(ctx, "prj_test_1", "usr_free_2", models.CreateProposalRequest{
		CoverLetter:  "Greetings, I am also a senior full stack engineer ready to start immediately.",
		BidAmount:    1100,
		DeliveryDays: 18,
	})
	if err != nil {
		t.Fatalf("failed to submit second proposal: %v", err)
	}

	// 5. Non-owner cannot shortlist proposal
	err = svc.ShortlistProposal(ctx, prop1.ID, "usr_stranger", false)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for stranger, got: %v", err)
	}

	// 6. Owner shortlists proposal 1
	err = svc.ShortlistProposal(ctx, prop1.ID, "usr_buyer_1", false)
	if err != nil {
		t.Fatalf("failed to shortlist proposal: %v", err)
	}
	updatedProp1, _ := propRepo.GetByID(ctx, prop1.ID)
	if updatedProp1.Status != "shortlisted" {
		t.Errorf("expected status 'shortlisted', got '%s'", updatedProp1.Status)
	}

	// 7. Owner accepts proposal 1 -> atomic decision workflow
	contractID, err := svc.AcceptProposal(ctx, prop1.ID, "usr_buyer_1", false)
	if err != nil {
		t.Fatalf("failed to accept proposal: %v", err)
	}
	if contractID == "" {
		t.Errorf("expected non-empty contractID on proposal acceptance")
	}

	// Verify proposal 1 is accepted, and competing proposal 2 is rejected
	acceptedProp1, _ := propRepo.GetByID(ctx, prop1.ID)
	if acceptedProp1.Status != "accepted" {
		t.Errorf("expected accepted proposal status 'accepted', got '%s'", acceptedProp1.Status)
	}

	rejectedProp2, _ := propRepo.GetByID(ctx, prop2.ID)
	if rejectedProp2.Status != "rejected" {
		t.Errorf("expected competing proposal status 'rejected', got '%s'", rejectedProp2.Status)
	}
}
