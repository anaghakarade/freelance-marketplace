package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	ErrProjectNotFound = errors.New("project not found")
)

// ProjectRepository defines persistence methods for buyer projects
type ProjectRepository interface {
	Create(ctx context.Context, project *models.Project) error
	GetByID(ctx context.Context, id string) (*models.Project, error)
	GetAll(ctx context.Context, filters models.ProjectFilters) ([]models.Project, int, error)
	GetByBuyerID(ctx context.Context, buyerID string) ([]models.Project, error)
	Update(ctx context.Context, id string, project *models.Project) error
	UpdateStatus(ctx context.Context, id string, status string) error
	Delete(ctx context.Context, id string) error
	IncrementProposalCount(ctx context.Context, projectID string) error
	DecrementProposalCount(ctx context.Context, projectID string) error
	CheckOwnership(ctx context.Context, projectID string, buyerID string) (bool, *models.Project, error)
}

type projectRepository struct {
	db *database.DBWrapper
}

// NewProjectRepository instantiates a new ProjectRepository
func NewProjectRepository(db *database.DBWrapper) ProjectRepository {
	return &projectRepository{db: db}
}

// Create persists a new Project and syncs project_skills inside a transaction
func (r *projectRepository) Create(ctx context.Context, p *models.Project) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	p.UpdatedAt = now

	skillsJSON, _ := json.Marshal(p.Skills)

	query := `
		INSERT INTO projects (
			id, buyer_id, title, description, category_id, subcategory_id,
			skills, budget_type, budget_min, budget_max, fixed_budget,
			experience_level, estimated_duration, status, visibility,
			proposal_count, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14, $15,
			$16, $17, $18
		);
	`

	_, err = tx.ExecContext(ctx, query,
		p.ID, p.BuyerID, p.Title, p.Description, p.CategoryID, p.SubcategoryID,
		skillsJSON, p.BudgetType, p.BudgetMin, p.BudgetMax, p.FixedBudget,
		p.ExperienceLevel, p.EstimatedDuration, p.Status, p.Visibility,
		p.ProposalCount, p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert project: %w", err)
	}

	// Insert into project_skills helper table
	for _, skill := range p.Skills {
		trimmed := strings.TrimSpace(skill)
		if trimmed != "" {
			_, _ = tx.ExecContext(ctx, "INSERT INTO project_skills (project_id, skill) VALUES ($1, $2);", p.ID, trimmed)
		}
	}

	return tx.Commit()
}

// GetByID retrieves a single project by ID with enriched category and buyer profile
func (r *projectRepository) GetByID(ctx context.Context, id string) (*models.Project, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT p.id, p.buyer_id, p.title, p.description, p.category_id, p.subcategory_id,
		       p.skills, p.budget_type, p.budget_min, p.budget_max, p.fixed_budget,
		       p.experience_level, p.estimated_duration, p.status, p.visibility,
		       p.proposal_count, p.selected_proposal_id, p.created_at, p.updated_at,
		       COALESCE(c.slug, ''), COALESCE(c.name, ''),
		       COALESCE(sub.slug, ''), COALESCE(sub.name, ''),
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.avatar, ''),
		       COALESCE(u.location, ''), COALESCE(u.rating, 0), COALESCE(u.reviews_count, 0),
		       COALESCE(u.account_type, 'individual')
		FROM projects p
		LEFT JOIN categories c ON p.category_id = c.id
		LEFT JOIN subcategories sub ON p.subcategory_id = sub.id
		LEFT JOIN users u ON p.buyer_id = u.id
		WHERE p.id = $1;
	`

	var p models.Project
	var skillsJSON []byte
	var subID, selPropID sql.NullString
	var bMin, bMax, fBudget sql.NullFloat64
	var u models.User

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.BuyerID, &p.Title, &p.Description, &p.CategoryID, &subID,
		&skillsJSON, &p.BudgetType, &bMin, &bMax, &fBudget,
		&p.ExperienceLevel, &p.EstimatedDuration, &p.Status, &p.Visibility,
		&p.ProposalCount, &selPropID, &p.CreatedAt, &p.UpdatedAt,
		&p.CategorySlug, &p.CategoryName,
		&p.SubcategorySlug, &p.SubcategoryName,
		&u.ID, &u.Name, &u.Avatar,
		&u.Location, &u.Rating, &u.ReviewsCount,
		&u.AccountType,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query project by id: %w", err)
	}

	if subID.Valid {
		p.SubcategoryID = &subID.String
	}
	if selPropID.Valid {
		p.SelectedProposalID = &selPropID.String
	}
	if bMin.Valid {
		p.BudgetMin = &bMin.Float64
	}
	if bMax.Valid {
		p.BudgetMax = &bMax.Float64
	}
	if fBudget.Valid {
		p.FixedBudget = &fBudget.Float64
	}

	_ = json.Unmarshal(skillsJSON, &p.Skills)
	if u.ID != "" {
		p.Buyer = &u
	}

	return &p, nil
}

// GetAll retrieves projects matching query filters (default open projects for discovery)
func (r *projectRepository) GetAll(ctx context.Context, f models.ProjectFilters) ([]models.Project, int, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, 0, ErrDatabaseUnavailable
	}

	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 20
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	where := []string{"p.status = 'open'"}
	args := []interface{}{}
	idx := 1

	if f.Category != "" {
		where = append(where, fmt.Sprintf("(c.slug = $%d OR p.category_id = $%d)", idx, idx))
		args = append(args, f.Category)
		idx++
	}

	if f.Subcategory != "" {
		where = append(where, fmt.Sprintf("(sub.slug = $%d OR p.subcategory_id = $%d)", idx, idx))
		args = append(args, f.Subcategory)
		idx++
	}

	if f.ExperienceLevel != "" && f.ExperienceLevel != "all" {
		where = append(where, fmt.Sprintf("p.experience_level = $%d", idx))
		args = append(args, strings.ToLower(f.ExperienceLevel))
		idx++
	}

	if f.BudgetType != "" && f.BudgetType != "all" {
		where = append(where, fmt.Sprintf("p.budget_type = $%d", idx))
		args = append(args, strings.ToLower(f.BudgetType))
		idx++
	}

	if f.MinBudget != nil {
		where = append(where, fmt.Sprintf("(COALESCE(p.fixed_budget, p.budget_min, 0) >= $%d)", idx))
		args = append(args, *f.MinBudget)
		idx++
	}

	if f.MaxBudget != nil {
		where = append(where, fmt.Sprintf("(COALESCE(p.fixed_budget, p.budget_max, 999999) <= $%d)", idx))
		args = append(args, *f.MaxBudget)
		idx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf(
			"(p.title ILIKE $%d OR p.description ILIKE $%d OR p.skills::text ILIKE $%d)",
			idx, idx, idx,
		))
		args = append(args, "%"+f.Search+"%")
		idx++
	}

	if len(f.Skills) > 0 {
		var skillClauses []string
		for _, skill := range f.Skills {
			trimmed := strings.TrimSpace(skill)
			if trimmed != "" {
				skillClauses = append(skillClauses, fmt.Sprintf("p.skills::text ILIKE $%d", idx))
				args = append(args, "%"+trimmed+"%")
				idx++
			}
		}
		if len(skillClauses) > 0 {
			where = append(where, "("+strings.Join(skillClauses, " OR ")+")")
		}
	}

	whereSQL := strings.Join(where, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM projects p
		LEFT JOIN categories c ON p.category_id = c.id
		LEFT JOIN subcategories sub ON p.subcategory_id = sub.id
		WHERE %s;
	`, whereSQL)

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count projects: %w", err)
	}

	// Ordering
	orderBy := "p.created_at DESC"
	switch strings.ToLower(f.Sort) {
	case "budget_high":
		orderBy = "COALESCE(p.fixed_budget, p.budget_max, 0) DESC, p.created_at DESC"
	case "budget_low":
		orderBy = "COALESCE(p.fixed_budget, p.budget_min, 0) ASC, p.created_at DESC"
	case "proposals":
		orderBy = "p.proposal_count DESC, p.created_at DESC"
	case "newest":
		orderBy = "p.created_at DESC"
	}

	query := fmt.Sprintf(`
		SELECT p.id, p.buyer_id, p.title, p.description, p.category_id, p.subcategory_id,
		       p.skills, p.budget_type, p.budget_min, p.budget_max, p.fixed_budget,
		       p.experience_level, p.estimated_duration, p.status, p.visibility,
		       p.proposal_count, p.selected_proposal_id, p.created_at, p.updated_at,
		       COALESCE(c.slug, ''), COALESCE(c.name, ''),
		       COALESCE(sub.slug, ''), COALESCE(sub.name, ''),
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.avatar, ''),
		       COALESCE(u.location, ''), COALESCE(u.rating, 0), COALESCE(u.reviews_count, 0),
		       COALESCE(u.account_type, 'individual')
		FROM projects p
		LEFT JOIN categories c ON p.category_id = c.id
		LEFT JOIN subcategories sub ON p.subcategory_id = sub.id
		LEFT JOIN users u ON p.buyer_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d;
	`, whereSQL, orderBy, idx, idx+1)

	queryArgs := append(args, f.Limit, f.Offset)
	rows, err := r.db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		var skillsJSON []byte
		var subID, selPropID sql.NullString
		var bMin, bMax, fBudget sql.NullFloat64
		var u models.User

		if err := rows.Scan(
			&p.ID, &p.BuyerID, &p.Title, &p.Description, &p.CategoryID, &subID,
			&skillsJSON, &p.BudgetType, &bMin, &bMax, &fBudget,
			&p.ExperienceLevel, &p.EstimatedDuration, &p.Status, &p.Visibility,
			&p.ProposalCount, &selPropID, &p.CreatedAt, &p.UpdatedAt,
			&p.CategorySlug, &p.CategoryName,
			&p.SubcategorySlug, &p.SubcategoryName,
			&u.ID, &u.Name, &u.Avatar,
			&u.Location, &u.Rating, &u.ReviewsCount,
			&u.AccountType,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan project row: %w", err)
		}

		if subID.Valid {
			p.SubcategoryID = &subID.String
		}
		if selPropID.Valid {
			p.SelectedProposalID = &selPropID.String
		}
		if bMin.Valid {
			p.BudgetMin = &bMin.Float64
		}
		if bMax.Valid {
			p.BudgetMax = &bMax.Float64
		}
		if fBudget.Valid {
			p.FixedBudget = &fBudget.Float64
		}

		_ = json.Unmarshal(skillsJSON, &p.Skills)
		if u.ID != "" {
			p.Buyer = &u
		}

		projects = append(projects, p)
	}

	return projects, total, nil
}

// GetByBuyerID retrieves all projects created by a specific buyer
func (r *projectRepository) GetByBuyerID(ctx context.Context, buyerID string) ([]models.Project, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	query := `
		SELECT p.id, p.buyer_id, p.title, p.description, p.category_id, p.subcategory_id,
		       p.skills, p.budget_type, p.budget_min, p.budget_max, p.fixed_budget,
		       p.experience_level, p.estimated_duration, p.status, p.visibility,
		       p.proposal_count, p.selected_proposal_id, p.created_at, p.updated_at,
		       COALESCE(c.slug, ''), COALESCE(c.name, ''),
		       COALESCE(sub.slug, ''), COALESCE(sub.name, '')
		FROM projects p
		LEFT JOIN categories c ON p.category_id = c.id
		LEFT JOIN subcategories sub ON p.subcategory_id = sub.id
		WHERE p.buyer_id = $1
		ORDER BY p.created_at DESC;
	`

	rows, err := r.db.QueryContext(ctx, query, buyerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query buyer projects: %w", err)
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		var skillsJSON []byte
		var subID, selPropID sql.NullString
		var bMin, bMax, fBudget sql.NullFloat64

		if err := rows.Scan(
			&p.ID, &p.BuyerID, &p.Title, &p.Description, &p.CategoryID, &subID,
			&skillsJSON, &p.BudgetType, &bMin, &bMax, &fBudget,
			&p.ExperienceLevel, &p.EstimatedDuration, &p.Status, &p.Visibility,
			&p.ProposalCount, &selPropID, &p.CreatedAt, &p.UpdatedAt,
			&p.CategorySlug, &p.CategoryName,
			&p.SubcategorySlug, &p.SubcategoryName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan buyer project: %w", err)
		}

		if subID.Valid {
			p.SubcategoryID = &subID.String
		}
		if selPropID.Valid {
			p.SelectedProposalID = &selPropID.String
		}
		if bMin.Valid {
			p.BudgetMin = &bMin.Float64
		}
		if bMax.Valid {
			p.BudgetMax = &bMax.Float64
		}
		if fBudget.Valid {
			p.FixedBudget = &fBudget.Float64
		}

		_ = json.Unmarshal(skillsJSON, &p.Skills)
		projects = append(projects, p)
	}

	return projects, nil
}

// Update updates an existing project
func (r *projectRepository) Update(ctx context.Context, id string, p *models.Project) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin update tx: %w", err)
	}
	defer tx.Rollback()

	skillsJSON, _ := json.Marshal(p.Skills)
	now := time.Now().UTC()
	p.UpdatedAt = now

	query := `
		UPDATE projects SET
			title = $1,
			description = $2,
			category_id = $3,
			subcategory_id = $4,
			skills = $5,
			budget_type = $6,
			budget_min = $7,
			budget_max = $8,
			fixed_budget = $9,
			experience_level = $10,
			estimated_duration = $11,
			updated_at = $12
		WHERE id = $13;
	`

	res, err := tx.ExecContext(ctx, query,
		p.Title, p.Description, p.CategoryID, p.SubcategoryID,
		skillsJSON, p.BudgetType, p.BudgetMin, p.BudgetMax, p.FixedBudget,
		p.ExperienceLevel, p.EstimatedDuration, p.UpdatedAt, id,
	)
	if err != nil {
		return fmt.Errorf("failed to update project: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrProjectNotFound
	}

	// Update project_skills
	_, _ = tx.ExecContext(ctx, "DELETE FROM project_skills WHERE project_id = $1;", id)
	for _, skill := range p.Skills {
		trimmed := strings.TrimSpace(skill)
		if trimmed != "" {
			_, _ = tx.ExecContext(ctx, "INSERT INTO project_skills (project_id, skill) VALUES ($1, $2);", id, trimmed)
		}
	}

	return tx.Commit()
}

// UpdateStatus changes the lifecycle status of a project
func (r *projectRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	now := time.Now().UTC()
	query := `UPDATE projects SET status = $1, updated_at = $2 WHERE id = $3;`
	res, err := r.db.ExecContext(ctx, query, status, now, id)
	if err != nil {
		return fmt.Errorf("failed to update project status: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrProjectNotFound
	}
	return nil
}

// Delete deletes a project
func (r *projectRepository) Delete(ctx context.Context, id string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	res, err := r.db.ExecContext(ctx, "DELETE FROM projects WHERE id = $1;", id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrProjectNotFound
	}
	return nil
}

// IncrementProposalCount increments proposal_count for a project
func (r *projectRepository) IncrementProposalCount(ctx context.Context, projectID string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	query := `UPDATE projects SET proposal_count = proposal_count + 1, updated_at = NOW() WHERE id = $1;`
	_, err := r.db.ExecContext(ctx, query, projectID)
	return err
}

// DecrementProposalCount decrements proposal_count for a project
func (r *projectRepository) DecrementProposalCount(ctx context.Context, projectID string) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	query := `UPDATE projects SET proposal_count = GREATEST(0, proposal_count - 1), updated_at = NOW() WHERE id = $1;`
	_, err := r.db.ExecContext(ctx, query, projectID)
	return err
}

// CheckOwnership verifies whether the project belongs to the given buyer
func (r *projectRepository) CheckOwnership(ctx context.Context, projectID string, buyerID string) (bool, *models.Project, error) {
	project, err := r.GetByID(ctx, projectID)
	if err != nil {
		return false, nil, err
	}
	if project == nil {
		return false, nil, nil
	}

	isOwner := project.BuyerID == buyerID
	return isOwner, project, nil
}
