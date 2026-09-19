package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	ErrReportNotFound       = errors.New("report not found")
	ErrInvalidReportTarget  = errors.New("report target not found or invalid target type")
	ErrInvalidStatusChange  = errors.New("invalid report status transition")
)

// ReportRepository handles database operations for user reports and moderation tickets
type ReportRepository interface {
	CreateReport(ctx context.Context, report *models.Report) error
	GetReportByID(ctx context.Context, id string) (*models.Report, error)
	ListReports(ctx context.Context, status string, limit, offset int) ([]*models.Report, int, error)
	UpdateReportStatus(ctx context.Context, id string, status string, adminID string) error
	ResolveReport(ctx context.Context, id string, note string, adminID string) error
	DismissReport(ctx context.Context, id string, note string, adminID string) error
	VerifyTargetExists(ctx context.Context, targetType, targetID string) (bool, string, error)
}

type reportRepository struct {
	db *database.DBWrapper
}

// NewReportRepository creates a new ReportRepository instance
func NewReportRepository(db *database.DBWrapper) ReportRepository {
	return &reportRepository{db: db}
}

func (r *reportRepository) available() error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}
	return nil
}

// VerifyTargetExists validates that the target entity actually exists in PostgreSQL
func (r *reportRepository) VerifyTargetExists(ctx context.Context, targetType, targetID string) (bool, string, error) {
	if err := r.available(); err != nil {
		return false, "", err
	}

	var title string
	var query string

	switch strings.ToLower(targetType) {
	case models.TargetTypeUser:
		query = `SELECT COALESCE(name, 'User') FROM users WHERE id = $1;`
	case models.TargetTypeService:
		query = `SELECT COALESCE(title, 'Service Listing') FROM services WHERE id = $1;`
	case models.TargetTypeProject:
		query = `SELECT COALESCE(title, 'Project Posting') FROM projects WHERE id = $1;`
	case models.TargetTypeReview:
		query = `SELECT COALESCE(comment, 'Review') FROM reviews WHERE id = $1;`
	case models.TargetTypeMessage:
		query = `SELECT COALESCE(SUBSTRING(message FROM 1 FOR 50), 'Message') FROM messages WHERE id = $1;`
	default:
		return false, "", ErrInvalidReportTarget
	}

	err := r.db.QueryRowContext(ctx, query, targetID).Scan(&title)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, "", nil
		}
		return false, "", err
	}

	return true, title, nil
}

// CreateReport inserts a new report
func (r *reportRepository) CreateReport(ctx context.Context, report *models.Report) error {
	if err := r.available(); err != nil {
		return err
	}

	if report.ID == "" {
		report.ID = fmt.Sprintf("rep_%d", time.Now().UnixNano())
	}
	if report.Status == "" {
		report.Status = models.ReportStatusOpen
	}

	now := time.Now().UTC()
	report.CreatedAt = now
	report.UpdatedAt = now

	query := `
		INSERT INTO reports (
			id, reporter_id, target_type, target_id, reason, description,
			status, assigned_admin_id, resolution_note, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
	`

	_, err := r.db.ExecContext(
		ctx, query,
		report.ID, report.ReporterID, report.TargetType, report.TargetID,
		report.Reason, report.Description, report.Status,
		report.AssignedAdminID, report.ResolutionNote, report.CreatedAt, report.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert report: %w", err)
	}

	return nil
}

// GetReportByID returns a report by ID including reporter and assigned admin names
func (r *reportRepository) GetReportByID(ctx context.Context, id string) (*models.Report, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	query := `
		SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.description,
		       r.status, r.assigned_admin_id, r.resolution_note, r.created_at, r.updated_at, r.resolved_at,
		       COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(adm.name, '')
		FROM reports r
		LEFT JOIN users u ON r.reporter_id = u.id
		LEFT JOIN users adm ON r.assigned_admin_id = adm.id
		WHERE r.id = $1;
	`

	var rep models.Report
	var resNote, adminID sql.NullString
	var resAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rep.ID, &rep.ReporterID, &rep.TargetType, &rep.TargetID, &rep.Reason, &rep.Description,
		&rep.Status, &adminID, &resNote, &rep.CreatedAt, &rep.UpdatedAt, &resAt,
		&rep.ReporterName, &rep.ReporterEmail,
		&rep.AdminName,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrReportNotFound
		}
		return nil, fmt.Errorf("failed to get report: %w", err)
	}

	if adminID.Valid {
		rep.AssignedAdminID = &adminID.String
	}
	if resNote.Valid {
		rep.ResolutionNote = &resNote.String
	}
	if resAt.Valid {
		rep.ResolvedAt = &resAt.Time
	}

	return &rep, nil
}

// ListReports retrieves paginated reports filtered by status
func (r *reportRepository) ListReports(ctx context.Context, status string, limit, offset int) ([]*models.Report, int, error) {
	if err := r.available(); err != nil {
		return nil, 0, err
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var where []string
	var args []interface{}
	idx := 1

	if status != "" && status != "all" {
		where = append(where, fmt.Sprintf("r.status = $%d", idx))
		args = append(args, status)
		idx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM reports r %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count reports: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.description,
		       r.status, r.assigned_admin_id, r.resolution_note, r.created_at, r.updated_at, r.resolved_at,
		       COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(adm.name, '')
		FROM reports r
		LEFT JOIN users u ON r.reporter_id = u.id
		LEFT JOIN users adm ON r.assigned_admin_id = adm.id
		%s
		ORDER BY r.created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query reports: %w", err)
	}
	defer rows.Close()

	var reports []*models.Report
	for rows.Next() {
		var rep models.Report
		var resNote, adminID sql.NullString
		var resAt sql.NullTime

		if err := rows.Scan(
			&rep.ID, &rep.ReporterID, &rep.TargetType, &rep.TargetID, &rep.Reason, &rep.Description,
			&rep.Status, &adminID, &resNote, &rep.CreatedAt, &rep.UpdatedAt, &resAt,
			&rep.ReporterName, &rep.ReporterEmail,
			&rep.AdminName,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan report: %w", err)
		}

		if adminID.Valid {
			rep.AssignedAdminID = &adminID.String
		}
		if resNote.Valid {
			rep.ResolutionNote = &resNote.String
		}
		if resAt.Valid {
			rep.ResolvedAt = &resAt.Time
		}

		reports = append(reports, &rep)
	}

	return reports, total, nil
}

// UpdateReportStatus transitions a report to a new status (e.g. under_review)
func (r *reportRepository) UpdateReportStatus(ctx context.Context, id string, newStatus string, adminID string) error {
	existing, err := r.GetReportByID(ctx, id)
	if err != nil {
		return err
	}

	// Validate status transition
	if existing.Status == models.ReportStatusResolved || existing.Status == models.ReportStatusDismissed {
		return fmt.Errorf("%w: closed reports cannot change status", ErrInvalidStatusChange)
	}

	query := `
		UPDATE reports
		SET status = $1, assigned_admin_id = $2, updated_at = NOW()
		WHERE id = $3;
	`
	_, err = r.db.ExecContext(ctx, query, newStatus, adminID, id)
	if err != nil {
		return fmt.Errorf("failed to update report status: %w", err)
	}

	return nil
}

// ResolveReport marks report as resolved with a note
func (r *reportRepository) ResolveReport(ctx context.Context, id string, note string, adminID string) error {
	existing, err := r.GetReportByID(ctx, id)
	if err != nil {
		return err
	}

	if existing.Status == models.ReportStatusResolved || existing.Status == models.ReportStatusDismissed {
		return fmt.Errorf("%w: report is already closed", ErrInvalidStatusChange)
	}

	query := `
		UPDATE reports
		SET status = $1, resolution_note = $2, assigned_admin_id = $3, resolved_at = NOW(), updated_at = NOW()
		WHERE id = $4;
	`
	_, err = r.db.ExecContext(ctx, query, models.ReportStatusResolved, note, adminID, id)
	if err != nil {
		return fmt.Errorf("failed to resolve report: %w", err)
	}

	return nil
}

// DismissReport marks report as dismissed with an admin note
func (r *reportRepository) DismissReport(ctx context.Context, id string, note string, adminID string) error {
	existing, err := r.GetReportByID(ctx, id)
	if err != nil {
		return err
	}

	if existing.Status == models.ReportStatusResolved || existing.Status == models.ReportStatusDismissed {
		return fmt.Errorf("%w: report is already closed", ErrInvalidStatusChange)
	}

	query := `
		UPDATE reports
		SET status = $1, resolution_note = $2, assigned_admin_id = $3, resolved_at = NOW(), updated_at = NOW()
		WHERE id = $4;
	`
	_, err = r.db.ExecContext(ctx, query, models.ReportStatusDismissed, note, adminID, id)
	if err != nil {
		return fmt.Errorf("failed to dismiss report: %w", err)
	}

	return nil
}
