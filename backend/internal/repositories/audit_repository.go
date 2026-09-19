package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

// AuditRepository handles read-only persistence and querying of administrative audit logs
type AuditRepository interface {
	CreateAuditLog(ctx context.Context, log *models.AuditLog) error
	ListAuditLogs(ctx context.Context, action, entityType string, limit, offset int) ([]*models.AuditLog, int, error)
}

type auditRepository struct {
	db *database.DBWrapper
}

// NewAuditRepository creates an AuditRepository
func NewAuditRepository(db *database.DBWrapper) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) available() error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}
	return nil
}

// CreateAuditLog appends an immutable audit log entry
func (r *auditRepository) CreateAuditLog(ctx context.Context, log *models.AuditLog) error {
	if err := r.available(); err != nil {
		return err
	}

	if log.ID == "" {
		log.ID = fmt.Sprintf("aud_%d", time.Now().UnixNano())
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now().UTC()
	}

	metadataJSON, err := json.Marshal(log.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	query := `
		INSERT INTO audit_logs (id, admin_id, action, entity_type, entity_id, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7);
	`

	_, err = r.db.ExecContext(ctx, query, log.ID, log.AdminID, log.Action, log.EntityType, log.EntityID, metadataJSON, log.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}

	return nil
}

// ListAuditLogs retrieves paginated audit logs with action / entityType filters
func (r *auditRepository) ListAuditLogs(ctx context.Context, action, entityType string, limit, offset int) ([]*models.AuditLog, int, error) {
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

	if action != "" && action != "all" {
		where = append(where, fmt.Sprintf("a.action = $%d", idx))
		args = append(args, action)
		idx++
	}

	if entityType != "" && entityType != "all" {
		where = append(where, fmt.Sprintf("a.entity_type = $%d", idx))
		args = append(args, entityType)
		idx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs a %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT a.id, a.admin_id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
		       COALESCE(u.name, ''), COALESCE(u.email, '')
		FROM audit_logs a
		LEFT JOIN users u ON a.admin_id = u.id
		%s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		var metadataJSON []byte

		if err := rows.Scan(
			&l.ID, &l.AdminID, &l.Action, &l.EntityType, &l.EntityID, &metadataJSON, &l.CreatedAt,
			&l.AdminName, &l.AdminEmail,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit log: %w", err)
		}

		if len(metadataJSON) > 0 {
			_ = json.Unmarshal(metadataJSON, &l.Metadata)
		}

		logs = append(logs, &l)
	}

	return logs, total, nil
}
