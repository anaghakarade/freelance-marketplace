package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	idCounter uint64

	ErrProposalNotFound       = errors.New("proposal not found")
	ErrProposalAlreadyExists   = errors.New("you have already submitted a proposal for this project")
	ErrProjectNotOpen          = errors.New("project is not open for proposals")
	ErrInvalidProposalStatus   = errors.New("proposal cannot be accepted in its current status")
)

// ProposalRepository defines persistence and transactional methods for proposals
type ProposalRepository interface {
	Create(ctx context.Context, proposal *models.Proposal) error
	GetByID(ctx context.Context, id string) (*models.Proposal, error)
	GetByProjectID(ctx context.Context, projectID string) ([]models.Proposal, error)
	GetByFreelancerID(ctx context.Context, freelancerID string) ([]models.Proposal, error)
	UpdateStatus(ctx context.Context, id string, status string) error
	Withdraw(ctx context.Context, id string, freelancerID string) error
	HasFreelancerApplied(ctx context.Context, projectID string, freelancerID string) (bool, error)
	AcceptProposalTx(ctx context.Context, proposalID string, projectID string) (string, error)
}

type proposalRepository struct {
	db *database.DBWrapper
}

// NewProposalRepository instantiates a new ProposalRepository
func NewProposalRepository(db *database.DBWrapper) ProposalRepository {
	return &proposalRepository{db: db}
}

// Create inserts a proposal and increments project proposal_count inside a transaction
func (r *proposalRepository) Create(ctx context.Context, p *models.Proposal) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	p.UpdatedAt = now
	if p.Status == "" {
		p.Status = "pending"
	}

	query := `
		INSERT INTO proposals (
			id, project_id, freelancer_id, cover_letter,
			bid_amount, delivery_days, estimated_duration,
			status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7,
			$8, $9, $10
		);
	`

	_, err = tx.ExecContext(ctx, query,
		p.ID, p.ProjectID, p.FreelancerID, p.CoverLetter,
		p.BidAmount, p.DeliveryDays, p.EstimatedDuration,
		p.Status, p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert proposal: %w", err)
	}

	// Increment proposal count on the project
	_, err = tx.ExecContext(ctx, "UPDATE projects SET proposal_count = proposal_count + 1, updated_at = NOW() WHERE id = $1;", p.ProjectID)
	if err != nil {
		return fmt.Errorf("failed to increment project proposal_count: %w", err)
	}

	return tx.Commit()
}

// GetByID retrieves a proposal by ID with freelancer and project details
func (r *proposalRepository) GetByID(ctx context.Context, id string) (*models.Proposal, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT pr.id, pr.project_id, pr.freelancer_id, pr.cover_letter,
		       pr.bid_amount, pr.delivery_days, COALESCE(pr.estimated_duration, ''),
		       pr.status, pr.created_at, pr.updated_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), COALESCE(u.rating, 0),
		       COALESCE(u.reviews_count, 0), COALESCE(u.completed_projects, 0)
		FROM proposals pr
		LEFT JOIN users u ON pr.freelancer_id = u.id
		WHERE pr.id = $1;
	`

	var p models.Proposal
	var u models.User

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.ProjectID, &p.FreelancerID, &p.CoverLetter,
		&p.BidAmount, &p.DeliveryDays, &p.EstimatedDuration,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
		&u.ID, &u.Name, &u.Avatar,
		&u.Title, &u.Location, &u.Rating,
		&u.ReviewsCount, &u.CompletedProjects,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query proposal by id: %w", err)
	}

	if u.ID != "" {
		p.Freelancer = &u
	}

	return &p, nil
}

// GetByProjectID retrieves all proposals submitted to a specific project (for buyer review)
func (r *proposalRepository) GetByProjectID(ctx context.Context, projectID string) ([]models.Proposal, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT pr.id, pr.project_id, pr.freelancer_id, pr.cover_letter,
		       pr.bid_amount, pr.delivery_days, COALESCE(pr.estimated_duration, ''),
		       pr.status, pr.created_at, pr.updated_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), COALESCE(u.rating, 0),
		       COALESCE(u.reviews_count, 0), COALESCE(u.completed_projects, 0)
		FROM proposals pr
		LEFT JOIN users u ON pr.freelancer_id = u.id
		WHERE pr.project_id = $1
		ORDER BY 
			CASE pr.status 
				WHEN 'accepted' THEN 1 
				WHEN 'shortlisted' THEN 2 
				WHEN 'pending' THEN 3 
				ELSE 4 
			END,
			pr.created_at DESC;
	`

	rows, err := r.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query proposals by project: %w", err)
	}
	defer rows.Close()

	var proposals []models.Proposal
	for rows.Next() {
		var p models.Proposal
		var u models.User

		if err := rows.Scan(
			&p.ID, &p.ProjectID, &p.FreelancerID, &p.CoverLetter,
			&p.BidAmount, &p.DeliveryDays, &p.EstimatedDuration,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
			&u.ID, &u.Name, &u.Avatar,
			&u.Title, &u.Location, &u.Rating,
			&u.ReviewsCount, &u.CompletedProjects,
		); err != nil {
			return nil, fmt.Errorf("failed to scan proposal: %w", err)
		}

		if u.ID != "" {
			p.Freelancer = &u
		}

		proposals = append(proposals, p)
	}

	return proposals, nil
}

// GetByFreelancerID retrieves all proposals submitted by a freelancer
func (r *proposalRepository) GetByFreelancerID(ctx context.Context, freelancerID string) ([]models.Proposal, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT pr.id, pr.project_id, pr.freelancer_id, pr.cover_letter,
		       pr.bid_amount, pr.delivery_days, COALESCE(pr.estimated_duration, ''),
		       pr.status, pr.created_at, pr.updated_at,
		       COALESCE(proj.id, ''), COALESCE(proj.title, ''), COALESCE(proj.status, 'open'),
		       COALESCE(proj.budget_type, 'fixed'), proj.fixed_budget, proj.budget_min, proj.budget_max,
		       COALESCE(c.name, ''),
		       COALESCE(u.name, '')
		FROM proposals pr
		LEFT JOIN projects proj ON pr.project_id = proj.id
		LEFT JOIN categories c ON proj.category_id = c.id
		LEFT JOIN users u ON proj.buyer_id = u.id
		WHERE pr.freelancer_id = $1
		ORDER BY pr.created_at DESC;
	`

	rows, err := r.db.QueryContext(ctx, query, freelancerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query freelancer proposals: %w", err)
	}
	defer rows.Close()

	var proposals []models.Proposal
	for rows.Next() {
		var p models.Proposal
		var proj models.Project
		var fBudget, bMin, bMax sql.NullFloat64
		var buyerName string

		if err := rows.Scan(
			&p.ID, &p.ProjectID, &p.FreelancerID, &p.CoverLetter,
			&p.BidAmount, &p.DeliveryDays, &p.EstimatedDuration,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
			&proj.ID, &proj.Title, &proj.Status,
			&proj.BudgetType, &fBudget, &bMin, &bMax,
			&proj.CategoryName,
			&buyerName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan freelancer proposal: %w", err)
		}

		if fBudget.Valid {
			proj.FixedBudget = &fBudget.Float64
		}
		if bMin.Valid {
			proj.BudgetMin = &bMin.Float64
		}
		if bMax.Valid {
			proj.BudgetMax = &bMax.Float64
		}
		proj.Buyer = &models.User{Name: buyerName}
		p.Project = &proj

		proposals = append(proposals, p)
	}

	return proposals, nil
}

// UpdateStatus changes status of a single proposal (e.g. shortlist or reject)
func (r *proposalRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	now := time.Now().UTC()
	query := `UPDATE proposals SET status = $1, updated_at = $2 WHERE id = $3;`
	res, err := r.db.ExecContext(ctx, query, status, now, id)
	if err != nil {
		return fmt.Errorf("failed to update proposal status: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrProposalNotFound
	}
	return nil
}

// Withdraw marks a proposal as withdrawn and decrements project proposal_count inside a transaction
func (r *proposalRepository) Withdraw(ctx context.Context, id string, freelancerID string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin withdraw tx: %w", err)
	}
	defer tx.Rollback()

	var projectID, currentStatus string
	checkQuery := `SELECT project_id, status FROM proposals WHERE id = $1 AND freelancer_id = $2;`
	if err := tx.QueryRowContext(ctx, checkQuery, id, freelancerID).Scan(&projectID, &currentStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrProposalNotFound
		}
		return fmt.Errorf("failed to verify proposal: %w", err)
	}

	if currentStatus == "accepted" {
		return errors.New("cannot withdraw an accepted proposal")
	}
	if currentStatus == "withdrawn" {
		return nil // already withdrawn
	}

	now := time.Now().UTC()
	_, err = tx.ExecContext(ctx, "UPDATE proposals SET status = 'withdrawn', updated_at = $1 WHERE id = $2;", now, id)
	if err != nil {
		return fmt.Errorf("failed to mark proposal withdrawn: %w", err)
	}

	_, err = tx.ExecContext(ctx, "UPDATE projects SET proposal_count = GREATEST(0, proposal_count - 1), updated_at = NOW() WHERE id = $1;", projectID)
	if err != nil {
		return fmt.Errorf("failed to decrement project proposal_count: %w", err)
	}

	return tx.Commit()
}

// HasFreelancerApplied checks if a freelancer has already submitted an active proposal for this project
func (r *proposalRepository) HasFreelancerApplied(ctx context.Context, projectID string, freelancerID string) (bool, error) {
	if r.db == nil || r.db.DB == nil {
		return false, ErrDatabaseUnavailable
	}

	query := `SELECT COUNT(*) FROM proposals WHERE project_id = $1 AND freelancer_id = $2 AND status != 'withdrawn';`
	var count int
	if err := r.db.QueryRowContext(ctx, query, projectID, freelancerID).Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}

// AcceptProposalTx executes the atomic decision workflow when a buyer accepts a proposal:
// 1. Ensures project is open and proposal belongs to project.
// 2. Marks chosen proposal as 'accepted'.
// 3. Updates project status to 'in_progress' and sets selected_proposal_id.
// 4. Updates all other pending/shortlisted proposals on that project to 'rejected'.
// 5. Atomically creates a Contract record from the accepted proposal and project.
// If any step fails, entire transaction is rolled back.
func (r *proposalRepository) AcceptProposalTx(ctx context.Context, proposalID string, projectID string) (string, error) {
	if r.db == nil || r.db.DB == nil {
		return "", ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()

	// 1. Lock and verify project
	var projStatus, buyerID, projTitle, projDesc string
	err = tx.QueryRowContext(ctx, "SELECT status, buyer_id, title, description FROM projects WHERE id = $1 FOR UPDATE;", projectID).Scan(&projStatus, &buyerID, &projTitle, &projDesc)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrProjectNotFound
		}
		return "", fmt.Errorf("failed to inspect project status: %w", err)
	}
	if projStatus != "open" {
		return "", fmt.Errorf("%w: project is currently '%s'", ErrProjectNotOpen, projStatus)
	}

	// 2. Lock and verify proposal
	var propProjID, propStatus, freelancerID string
	var bidAmount float64
	var deliveryDays int
	err = tx.QueryRowContext(ctx, "SELECT project_id, status, freelancer_id, bid_amount, delivery_days FROM proposals WHERE id = $1 FOR UPDATE;", proposalID).Scan(&propProjID, &propStatus, &freelancerID, &bidAmount, &deliveryDays)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrProposalNotFound
		}
		return "", fmt.Errorf("failed to inspect proposal: %w", err)
	}
	if propProjID != projectID {
		return "", errors.New("proposal does not belong to this project")
	}
	if propStatus == "withdrawn" || propStatus == "rejected" {
		return "", fmt.Errorf("%w: proposal status is '%s'", ErrInvalidProposalStatus, propStatus)
	}

	// 3. Mark accepted proposal
	_, err = tx.ExecContext(ctx, "UPDATE proposals SET status = 'accepted', updated_at = $1 WHERE id = $2;", now, proposalID)
	if err != nil {
		return "", fmt.Errorf("failed to accept proposal: %w", err)
	}

	// 4. Update project to in_progress with selected_proposal_id
	_, err = tx.ExecContext(ctx, "UPDATE projects SET status = 'in_progress', selected_proposal_id = $1, updated_at = $2 WHERE id = $3;", proposalID, now, projectID)
	if err != nil {
		return "", fmt.Errorf("failed to update project status: %w", err)
	}

	// 5. Reject remaining non-accepted proposals on this project
	_, err = tx.ExecContext(ctx, "UPDATE proposals SET status = 'rejected', updated_at = $1 WHERE project_id = $2 AND id != $3 AND status IN ('pending', 'shortlisted');", now, projectID, proposalID)
	if err != nil {
		return "", fmt.Errorf("failed to reject competing proposals: %w", err)
	}

	// 6. Atomically create the Contract
	contractID := fmt.Sprintf("ctr_usr_%d_%d", time.Now().UnixMilli(), atomic.AddUint64(&idCounter, 1))
	var expectedEndDate *time.Time
	if deliveryDays > 0 {
		exp := now.AddDate(0, 0, deliveryDays)
		expectedEndDate = &exp
	}

	contractQuery := `
		INSERT INTO contracts (
			id, project_id, proposal_id, buyer_id, freelancer_id,
			title, description, agreed_budget, currency,
			start_date, expected_end_date, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, 'active', $10, $10
		);
	`
	_, err = tx.ExecContext(
		ctx, contractQuery,
		contractID, projectID, proposalID, buyerID, freelancerID,
		projTitle, projDesc, bidAmount, "USD",
		now, expectedEndDate,
	)
	if err != nil {
		return "", fmt.Errorf("failed to create contract in tx: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return "", fmt.Errorf("failed to commit accept proposal and contract tx: %w", err)
	}

	return contractID, nil
}

