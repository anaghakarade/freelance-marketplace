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
	ErrMilestoneNotFound  = errors.New("milestone not found")
	ErrSubmissionNotFound = errors.New("milestone submission not found")
)

// MilestoneRepository defines data access methods for milestones and submissions
type MilestoneRepository interface {
	Create(ctx context.Context, milestone *models.Milestone) error
	CreateWithNextSequence(ctx context.Context, milestone *models.Milestone) error
	GetByID(ctx context.Context, id string) (*models.Milestone, error)
	GetByContractID(ctx context.Context, contractID string) ([]models.Milestone, error)
	GetNextSequenceNumber(ctx context.Context, contractID string) (int, error)
	Update(ctx context.Context, milestone *models.Milestone) error
	UpdateStatus(ctx context.Context, id string, status string, completedAt *time.Time) error
	CreateSubmission(ctx context.Context, sub *models.MilestoneSubmission) error
	SubmitAndTransitionTx(ctx context.Context, sub *models.MilestoneSubmission) error
	GetSubmissionsByMilestoneID(ctx context.Context, milestoneID string) ([]models.MilestoneSubmission, error)
	UpdateSubmissionStatus(ctx context.Context, submissionID string, status string, reviewMsg string, reviewedAt time.Time) error
	RequestRevisionTx(ctx context.Context, milestoneID string, reviewMsg string, reviewedAt time.Time) error
	ApproveAndCompleteTx(ctx context.Context, milestoneID string, reviewMsg string, reviewedAt time.Time) error
}

type milestoneRepository struct {
	db *database.DBWrapper
}

// NewMilestoneRepository creates an instance of MilestoneRepository
func NewMilestoneRepository(db *database.DBWrapper) MilestoneRepository {
	return &milestoneRepository{db: db}
}

// Create inserts a new milestone record
func (r *milestoneRepository) Create(ctx context.Context, m *models.Milestone) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	now := time.Now().UTC()
	if m.CreatedAt.IsZero() {
		m.CreatedAt = now
	}
	m.UpdatedAt = now
	if m.Currency == "" {
		m.Currency = "USD"
	}
	if m.Status == "" {
		m.Status = models.MilestoneStatusPending
	}

	query := `
		INSERT INTO milestones (
			id, contract_id, title, description, sequence_number,
			amount, currency, due_date, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11
		);
	`

	_, err := r.db.ExecContext(
		ctx, query,
		m.ID, m.ContractID, m.Title, m.Description, m.SequenceNumber,
		m.Amount, m.Currency, m.DueDate, m.Status, m.CreatedAt, m.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert milestone: %w", err)
	}

	return nil
}

// CreateWithNextSequence assigns the next sequence number and creates the milestone
// while holding a row lock on the contract. This serializes concurrent additions.
func (r *milestoneRepository) CreateWithNextSequence(ctx context.Context, m *models.Milestone) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin milestone transaction: %w", err)
	}
	defer tx.Rollback()

	var contractID string
	if err := tx.QueryRowContext(ctx, `SELECT id FROM contracts WHERE id = $1 FOR UPDATE`, m.ContractID).Scan(&contractID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrContractNotFound
		}
		return fmt.Errorf("failed to lock contract: %w", err)
	}

	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM milestones WHERE contract_id = $1`, m.ContractID).Scan(&m.SequenceNumber); err != nil {
		return fmt.Errorf("failed to allocate milestone sequence: %w", err)
	}

	now := time.Now().UTC()
	if m.CreatedAt.IsZero() {
		m.CreatedAt = now
	}
	m.UpdatedAt = now
	if m.Currency == "" {
		m.Currency = "USD"
	}
	if m.Status == "" {
		m.Status = models.MilestoneStatusPending
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO milestones (id, contract_id, title, description, sequence_number, amount, currency, due_date, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		m.ID, m.ContractID, m.Title, m.Description, m.SequenceNumber, m.Amount, m.Currency, m.DueDate, m.Status, m.CreatedAt, m.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert milestone: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit milestone transaction: %w", err)
	}
	return nil
}

// GetByID fetches a single milestone by ID
func (r *milestoneRepository) GetByID(ctx context.Context, id string) (*models.Milestone, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT id, contract_id, title, description, sequence_number,
		       amount, currency, due_date, status, created_at, updated_at, completed_at
		FROM milestones
		WHERE id = $1;
	`

	var m models.Milestone
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID, &m.ContractID, &m.Title, &m.Description, &m.SequenceNumber,
		&m.Amount, &m.Currency, &m.DueDate, &m.Status, &m.CreatedAt, &m.UpdatedAt, &m.CompletedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrMilestoneNotFound
		}
		return nil, fmt.Errorf("failed to query milestone: %w", err)
	}

	// Fetch submissions for this milestone
	subs, err := r.GetSubmissionsByMilestoneID(ctx, m.ID)
	if err == nil {
		m.Submissions = subs
	}

	return &m, nil
}

// GetByContractID retrieves all milestones for a contract sorted by sequence_number
func (r *milestoneRepository) GetByContractID(ctx context.Context, contractID string) ([]models.Milestone, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT id, contract_id, title, description, sequence_number,
		       amount, currency, due_date, status, created_at, updated_at, completed_at
		FROM milestones
		WHERE contract_id = $1
		ORDER BY sequence_number ASC;
	`

	rows, err := r.db.QueryContext(ctx, query, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to query contract milestones: %w", err)
	}
	defer rows.Close()

	var milestones []models.Milestone
	for rows.Next() {
		var m models.Milestone
		if err := rows.Scan(
			&m.ID, &m.ContractID, &m.Title, &m.Description, &m.SequenceNumber,
			&m.Amount, &m.Currency, &m.DueDate, &m.Status, &m.CreatedAt, &m.UpdatedAt, &m.CompletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan milestone: %w", err)
		}

		milestones = append(milestones, m)
	}

	// Attach submissions to each milestone
	for i := range milestones {
		subs, err := r.GetSubmissionsByMilestoneID(ctx, milestones[i].ID)
		if err == nil {
			milestones[i].Submissions = subs
		}
	}

	return milestones, nil
}

// GetNextSequenceNumber finds the next safe sequence number for a new milestone in a contract
func (r *milestoneRepository) GetNextSequenceNumber(ctx context.Context, contractID string) (int, error) {
	if r.db == nil || r.db.DB == nil {
		return 0, ErrDatabaseUnavailable
	}

	query := `SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM milestones WHERE contract_id = $1;`
	var nextSeq int
	if err := r.db.QueryRowContext(ctx, query, contractID).Scan(&nextSeq); err != nil {
		return 0, fmt.Errorf("failed to compute next sequence number: %w", err)
	}
	return nextSeq, nil
}

// Update modifies title, description, amount, or due_date of an existing milestone
func (r *milestoneRepository) Update(ctx context.Context, m *models.Milestone) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	query := `
		UPDATE milestones
		SET title = $1, description = $2, amount = $3, due_date = $4, updated_at = NOW()
		WHERE id = $5;
	`

	res, err := r.db.ExecContext(ctx, query, m.Title, m.Description, m.Amount, m.DueDate, m.ID)
	if err != nil {
		return fmt.Errorf("failed to update milestone: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrMilestoneNotFound
	}

	return nil
}

// UpdateStatus changes a milestone's status and completed_at timestamp
func (r *milestoneRepository) UpdateStatus(ctx context.Context, id string, status string, completedAt *time.Time) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	query := `
		UPDATE milestones
		SET status = $1, completed_at = $2, updated_at = NOW()
		WHERE id = $3;
	`

	res, err := r.db.ExecContext(ctx, query, status, completedAt, id)
	if err != nil {
		return fmt.Errorf("failed to update milestone status: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrMilestoneNotFound
	}

	return nil
}

// CreateSubmission stores a freelancer work submission record
func (r *milestoneRepository) CreateSubmission(ctx context.Context, s *models.MilestoneSubmission) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	if s.Status == "" {
		s.Status = models.SubmissionStatusSubmitted
	}

	query := `
		INSERT INTO milestone_submissions (
			id, milestone_id, submitted_by, message, attachment_url, status, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		);
	`

	_, err := r.db.ExecContext(
		ctx, query,
		s.ID, s.MilestoneID, s.SubmittedBy, s.Message, s.AttachmentURL, s.Status, s.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert milestone submission: %w", err)
	}

	return nil
}

// SubmitAndTransitionTx persists a submission and transitions the corresponding
// milestone together, preventing an orphaned submission on transition failure.
func (r *milestoneRepository) SubmitAndTransitionTx(ctx context.Context, s *models.MilestoneSubmission) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin submission transaction: %w", err)
	}
	defer tx.Rollback()

	var milestoneID string
	err = tx.QueryRowContext(ctx, `
		UPDATE milestones SET status = 'submitted', updated_at = NOW()
		WHERE id = $1 AND status = 'in_progress'
		RETURNING id`, s.MilestoneID).Scan(&milestoneID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrMilestoneNotFound
		}
		return fmt.Errorf("failed to transition milestone to submitted: %w", err)
	}

	if s.CreatedAt.IsZero() {
		s.CreatedAt = time.Now().UTC()
	}
	if s.Status == "" {
		s.Status = models.SubmissionStatusSubmitted
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO milestone_submissions (id, milestone_id, submitted_by, message, attachment_url, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		s.ID, s.MilestoneID, s.SubmittedBy, s.Message, s.AttachmentURL, s.Status, s.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert milestone submission: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit submission transaction: %w", err)
	}
	return nil
}

// GetSubmissionsByMilestoneID retrieves all submission history for a milestone
func (r *milestoneRepository) GetSubmissionsByMilestoneID(ctx context.Context, milestoneID string) ([]models.MilestoneSubmission, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT s.id, s.milestone_id, s.submitted_by, s.message, s.attachment_url,
		       s.status, s.review_message, s.created_at, s.reviewed_at,
		       u.id, u.name, u.avatar
		FROM milestone_submissions s
		LEFT JOIN users u ON s.submitted_by = u.id
		WHERE s.milestone_id = $1
		ORDER BY s.created_at DESC;
	`

	rows, err := r.db.QueryContext(ctx, query, milestoneID)
	if err != nil {
		return nil, fmt.Errorf("failed to query milestone submissions: %w", err)
	}
	defer rows.Close()

	var subs []models.MilestoneSubmission
	for rows.Next() {
		var s models.MilestoneSubmission
		var u models.User

		if err := rows.Scan(
			&s.ID, &s.MilestoneID, &s.SubmittedBy, &s.Message, &s.AttachmentURL,
			&s.Status, &s.ReviewMessage, &s.CreatedAt, &s.ReviewedAt,
			&u.ID, &u.Name, &u.Avatar,
		); err != nil {
			return nil, fmt.Errorf("failed to scan milestone submission: %w", err)
		}

		if u.ID != "" {
			s.Submitter = &u
		}

		subs = append(subs, s)
	}

	return subs, nil
}

// UpdateSubmissionStatus updates the status and buyer review notes of a submission
func (r *milestoneRepository) UpdateSubmissionStatus(ctx context.Context, submissionID string, status string, reviewMsg string, reviewedAt time.Time) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	query := `
		UPDATE milestone_submissions
		SET status = $1, review_message = $2, reviewed_at = $3
		WHERE id = $4;
	`

	res, err := r.db.ExecContext(ctx, query, status, reviewMsg, reviewedAt, submissionID)
	if err != nil {
		return fmt.Errorf("failed to update submission status: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrSubmissionNotFound
	}

	return nil
}

// RequestRevisionTx atomically retains the submission and records the buyer's
// feedback while returning the milestone to the revision-requested state.
func (r *milestoneRepository) RequestRevisionTx(ctx context.Context, milestoneID string, reviewMsg string, reviewedAt time.Time) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin revision transaction: %w", err)
	}
	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, `
		UPDATE milestones SET status = 'revision_requested', updated_at = $1
		WHERE id = $2 AND status = 'submitted'
		RETURNING id`, reviewedAt, milestoneID).Scan(&milestoneID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrMilestoneNotFound
		}
		return fmt.Errorf("failed to request milestone revision: %w", err)
	}

	result, err := tx.ExecContext(ctx, `
		UPDATE milestone_submissions SET status = 'revision_requested', review_message = $1, reviewed_at = $2
		WHERE id = (
			SELECT id FROM milestone_submissions WHERE milestone_id = $3 ORDER BY created_at DESC, id DESC LIMIT 1
		)`, reviewMsg, reviewedAt, milestoneID)
	if err != nil {
		return fmt.Errorf("failed to store revision feedback: %w", err)
	}
	if rows, err := result.RowsAffected(); err != nil || rows != 1 {
		if err != nil {
			return fmt.Errorf("failed to confirm revision feedback: %w", err)
		}
		return ErrSubmissionNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit revision transaction: %w", err)
	}
	return nil
}

// ApproveAndCompleteTx atomically records buyer approval and, when applicable,
// completes the contract and its project.
func (r *milestoneRepository) ApproveAndCompleteTx(ctx context.Context, milestoneID string, reviewMsg string, reviewedAt time.Time) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin approval transaction: %w", err)
	}
	defer tx.Rollback()

	var contractID string
	err = tx.QueryRowContext(ctx, `
		UPDATE milestones SET status = 'approved', completed_at = $1, updated_at = $1
		WHERE id = $2 AND status = 'submitted'
		RETURNING contract_id`, reviewedAt, milestoneID).Scan(&contractID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrMilestoneNotFound
		}
		return fmt.Errorf("failed to approve milestone: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE milestone_submissions SET status = 'approved', review_message = $1, reviewed_at = $2
		WHERE id = (
			SELECT id FROM milestone_submissions WHERE milestone_id = $3 ORDER BY created_at DESC, id DESC LIMIT 1
		)`, reviewMsg, reviewedAt, milestoneID)
	if err != nil {
		return fmt.Errorf("failed to approve milestone submission: %w", err)
	}

	var projectID string
	err = tx.QueryRowContext(ctx, `SELECT project_id FROM contracts WHERE id = $1 FOR UPDATE`, contractID).Scan(&projectID)
	if err != nil {
		return fmt.Errorf("failed to lock contract: %w", err)
	}

	var total, approved int
	err = tx.QueryRowContext(ctx, `SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'approved') FROM milestones WHERE contract_id = $1`, contractID).Scan(&total, &approved)
	if err != nil {
		return fmt.Errorf("failed to evaluate contract completion: %w", err)
	}
	if total > 0 && total == approved {
		if _, err = tx.ExecContext(ctx, `UPDATE contracts SET status = 'completed', completed_at = $1, updated_at = $1 WHERE id = $2`, reviewedAt, contractID); err != nil {
			return fmt.Errorf("failed to complete contract: %w", err)
		}
		if _, err = tx.ExecContext(ctx, `UPDATE projects SET status = 'completed', completed_at = $1, updated_at = $1 WHERE id = $2`, reviewedAt, projectID); err != nil {
			return fmt.Errorf("failed to complete project: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit approval transaction: %w", err)
	}
	return nil
}
