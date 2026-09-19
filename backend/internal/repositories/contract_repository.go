package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	ErrContractNotFound = errors.New("contract not found")
)

// ContractRepository defines persistence operations for contracts
type ContractRepository interface {
	CreateContractTx(ctx context.Context, tx *sql.Tx, contract *models.Contract) error
	GetByID(ctx context.Context, id string) (*models.Contract, error)
	GetByProjectID(ctx context.Context, projectID string) (*models.Contract, error)
	GetByBuyerID(ctx context.Context, buyerID string) ([]models.Contract, error)
	GetByFreelancerID(ctx context.Context, freelancerID string) ([]models.Contract, error)
	UpdateStatus(ctx context.Context, id string, status string, completedAt *time.Time) error
	CompleteContractAndProjectTx(ctx context.Context, contractID string, projectID string) error
}

type contractRepository struct {
	db *database.DBWrapper
}

// NewContractRepository creates an instance of ContractRepository
func NewContractRepository(db *database.DBWrapper) ContractRepository {
	return &contractRepository{db: db}
}

// CreateContractTx inserts a contract record within an active transaction
func (r *contractRepository) CreateContractTx(ctx context.Context, tx *sql.Tx, c *models.Contract) error {
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	if c.StartDate.IsZero() {
		c.StartDate = now
	}
	if c.Currency == "" {
		c.Currency = "USD"
	}
	if c.Status == "" {
		c.Status = models.ContractStatusActive
	}

	query := `
		INSERT INTO contracts (
			id, project_id, proposal_id, buyer_id, freelancer_id,
			title, description, agreed_budget, currency,
			start_date, expected_end_date, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13, $14
		);
	`

	_, err := tx.ExecContext(
		ctx, query,
		c.ID, c.ProjectID, c.ProposalID, c.BuyerID, c.FreelancerID,
		c.Title, c.Description, c.AgreedBudget, c.Currency,
		c.StartDate, c.ExpectedEndDate, c.Status, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert contract in tx: %w", err)
	}

	return nil
}

// GetByID fetches a contract with buyer and freelancer profiles
func (r *contractRepository) GetByID(ctx context.Context, id string) (*models.Contract, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT c.id, c.project_id, c.proposal_id, c.buyer_id, c.freelancer_id,
		       c.title, c.description, c.agreed_budget, c.currency,
		       c.start_date, c.expected_end_date, c.status, c.created_at, c.updated_at, c.completed_at,
		       b.id, b.name, b.avatar, b.title, b.location, b.rating, b.reviews_count,
		       f.id, f.name, f.avatar, f.title, f.location, f.rating, f.reviews_count,
		       p.id, p.title, p.status, p.budget_type
		FROM contracts c
		LEFT JOIN users b ON c.buyer_id = b.id
		LEFT JOIN users f ON c.freelancer_id = f.id
		LEFT JOIN projects p ON c.project_id = p.id
		WHERE c.id = $1;
	`

	var c models.Contract
	var b, f models.User
	var p models.Project

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&c.ID, &c.ProjectID, &c.ProposalID, &c.BuyerID, &c.FreelancerID,
		&c.Title, &c.Description, &c.AgreedBudget, &c.Currency,
		&c.StartDate, &c.ExpectedEndDate, &c.Status, &c.CreatedAt, &c.UpdatedAt, &c.CompletedAt,
		&b.ID, &b.Name, &b.Avatar, &b.Title, &b.Location, &b.Rating, &b.ReviewsCount,
		&f.ID, &f.Name, &f.Avatar, &f.Title, &f.Location, &f.Rating, &f.ReviewsCount,
		&p.ID, &p.Title, &p.Status, &p.BudgetType,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrContractNotFound
		}
		return nil, fmt.Errorf("failed to query contract: %w", err)
	}

	if b.ID != "" {
		c.Buyer = &b
	}
	if f.ID != "" {
		c.Freelancer = &f
	}
	if p.ID != "" {
		c.Project = &p
	}

	return &c, nil
}

// GetByProjectID fetches the active contract for a project
func (r *contractRepository) GetByProjectID(ctx context.Context, projectID string) (*models.Contract, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT c.id, c.project_id, c.proposal_id, c.buyer_id, c.freelancer_id,
		       c.title, c.description, c.agreed_budget, c.currency,
		       c.start_date, c.expected_end_date, c.status, c.created_at, c.updated_at, c.completed_at,
		       b.id, b.name, b.avatar, b.title, b.location, b.rating, b.reviews_count,
		       f.id, f.name, f.avatar, f.title, f.location, f.rating, f.reviews_count,
		       p.id, p.title, p.status, p.budget_type
		FROM contracts c
		LEFT JOIN users b ON c.buyer_id = b.id
		LEFT JOIN users f ON c.freelancer_id = f.id
		LEFT JOIN projects p ON c.project_id = p.id
		WHERE c.project_id = $1
		ORDER BY c.created_at DESC
		LIMIT 1;
	`

	var c models.Contract
	var b, f models.User
	var p models.Project

	err := r.db.QueryRowContext(ctx, query, projectID).Scan(
		&c.ID, &c.ProjectID, &c.ProposalID, &c.BuyerID, &c.FreelancerID,
		&c.Title, &c.Description, &c.AgreedBudget, &c.Currency,
		&c.StartDate, &c.ExpectedEndDate, &c.Status, &c.CreatedAt, &c.UpdatedAt, &c.CompletedAt,
		&b.ID, &b.Name, &b.Avatar, &b.Title, &b.Location, &b.Rating, &b.ReviewsCount,
		&f.ID, &f.Name, &f.Avatar, &f.Title, &f.Location, &f.Rating, &f.ReviewsCount,
		&p.ID, &p.Title, &p.Status, &p.BudgetType,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrContractNotFound
		}
		return nil, fmt.Errorf("failed to query contract by project: %w", err)
	}

	if b.ID != "" {
		c.Buyer = &b
	}
	if f.ID != "" {
		c.Freelancer = &f
	}
	if p.ID != "" {
		c.Project = &p
	}

	return &c, nil
}

// GetByBuyerID retrieves all contracts where the user is the buyer
func (r *contractRepository) GetByBuyerID(ctx context.Context, buyerID string) ([]models.Contract, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT c.id, c.project_id, c.proposal_id, c.buyer_id, c.freelancer_id,
		       c.title, c.description, c.agreed_budget, c.currency,
		       c.start_date, c.expected_end_date, c.status, c.created_at, c.updated_at, c.completed_at,
		       f.id, f.name, f.avatar, f.title, f.location, f.rating, f.reviews_count,
		       p.id, p.title, p.status, p.budget_type
		FROM contracts c
		LEFT JOIN users f ON c.freelancer_id = f.id
		LEFT JOIN projects p ON c.project_id = p.id
		WHERE c.buyer_id = $1
		ORDER BY c.created_at DESC;
	`

	rows, err := r.db.QueryContext(ctx, query, buyerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query buyer contracts: %w", err)
	}
	defer rows.Close()

	var contracts []models.Contract
	for rows.Next() {
		var c models.Contract
		var f models.User
		var p models.Project

		if err := rows.Scan(
			&c.ID, &c.ProjectID, &c.ProposalID, &c.BuyerID, &c.FreelancerID,
			&c.Title, &c.Description, &c.AgreedBudget, &c.Currency,
			&c.StartDate, &c.ExpectedEndDate, &c.Status, &c.CreatedAt, &c.UpdatedAt, &c.CompletedAt,
			&f.ID, &f.Name, &f.Avatar, &f.Title, &f.Location, &f.Rating, &f.ReviewsCount,
			&p.ID, &p.Title, &p.Status, &p.BudgetType,
		); err != nil {
			return nil, fmt.Errorf("failed to scan buyer contract: %w", err)
		}

		if f.ID != "" {
			c.Freelancer = &f
		}
		if p.ID != "" {
			c.Project = &p
		}

		contracts = append(contracts, c)
	}

	return contracts, nil
}

// GetByFreelancerID retrieves all contracts where the user is the freelancer
func (r *contractRepository) GetByFreelancerID(ctx context.Context, freelancerID string) ([]models.Contract, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT c.id, c.project_id, c.proposal_id, c.buyer_id, c.freelancer_id,
		       c.title, c.description, c.agreed_budget, c.currency,
		       c.start_date, c.expected_end_date, c.status, c.created_at, c.updated_at, c.completed_at,
		       b.id, b.name, b.avatar, b.title, b.location, b.rating, b.reviews_count,
		       p.id, p.title, p.status, p.budget_type
		FROM contracts c
		LEFT JOIN users b ON c.buyer_id = b.id
		LEFT JOIN projects p ON c.project_id = p.id
		WHERE c.freelancer_id = $1
		ORDER BY c.created_at DESC;
	`

	rows, err := r.db.QueryContext(ctx, query, freelancerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query freelancer contracts: %w", err)
	}
	defer rows.Close()

	var contracts []models.Contract
	for rows.Next() {
		var c models.Contract
		var b models.User
		var p models.Project

		if err := rows.Scan(
			&c.ID, &c.ProjectID, &c.ProposalID, &c.BuyerID, &c.FreelancerID,
			&c.Title, &c.Description, &c.AgreedBudget, &c.Currency,
			&c.StartDate, &c.ExpectedEndDate, &c.Status, &c.CreatedAt, &c.UpdatedAt, &c.CompletedAt,
			&b.ID, &b.Name, &b.Avatar, &b.Title, &b.Location, &b.Rating, &b.ReviewsCount,
			&p.ID, &p.Title, &p.Status, &p.BudgetType,
		); err != nil {
			return nil, fmt.Errorf("failed to scan freelancer contract: %w", err)
		}

		if b.ID != "" {
			c.Buyer = &b
		}
		if p.ID != "" {
			c.Project = &p
		}

		contracts = append(contracts, c)
	}

	return contracts, nil
}

// UpdateStatus updates the status and optional completed_at for a contract
func (r *contractRepository) UpdateStatus(ctx context.Context, id string, status string, completedAt *time.Time) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	query := `UPDATE contracts SET status = $1, completed_at = $2, updated_at = NOW() WHERE id = $3;`
	res, err := r.db.ExecContext(ctx, query, status, completedAt, id)
	if err != nil {
		return fmt.Errorf("failed to update contract status: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrContractNotFound
	}

	return nil
}

// CompleteContractAndProjectTx atomically marks both contract and project as completed
func (r *contractRepository) CompleteContractAndProjectTx(ctx context.Context, contractID string, projectID string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()

	// 1. Update contract to completed
	_, err = tx.ExecContext(ctx, `
		UPDATE contracts 
		SET status = 'completed', completed_at = $1, updated_at = $1 
		WHERE id = $2;
	`, now, contractID)
	if err != nil {
		return fmt.Errorf("failed to complete contract in tx: %w", err)
	}

	// 2. Update project to completed
	_, err = tx.ExecContext(ctx, `
		UPDATE projects 
		SET status = 'completed', completed_at = $1, updated_at = $1 
		WHERE id = $2;
	`, now, projectID)
	if err != nil {
		return fmt.Errorf("failed to complete project in tx: %w", err)
	}

	return tx.Commit()
}
