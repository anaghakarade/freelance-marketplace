package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	ErrServiceNotFound = errors.New("service not found")
)

// AdminRepository handles data access for administrative governance and moderation
type AdminRepository interface {
	ListUsers(ctx context.Context, search, role, status string, limit, offset int) ([]*models.AdminUserItem, int, error)
	GetUserByID(ctx context.Context, id string) (*models.AdminUserItem, error)
	UpdateUserStatus(ctx context.Context, id string, status string, isActive bool) error

	ListServices(ctx context.Context, search, status string, limit, offset int) ([]*models.Service, int, error)
	GetServiceByID(ctx context.Context, id string) (*models.Service, error)
	UpdateServiceStatus(ctx context.Context, id string, status string) error

	ListProjects(ctx context.Context, search, status string, limit, offset int) ([]*models.Project, int, error)
	GetProjectByID(ctx context.Context, id string) (*models.Project, error)
	UpdateProjectStatus(ctx context.Context, id string, status string) error

	GetAnalytics(ctx context.Context) (*models.AdminAnalytics, error)
}

type adminRepository struct {
	db *database.DBWrapper
}

// NewAdminRepository creates a new instance of AdminRepository
func NewAdminRepository(db *database.DBWrapper) AdminRepository {
	return &adminRepository{db: db}
}

func (r *adminRepository) available() error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}
	return nil
}

// ListUsers retrieves users matching filters with pagination and relational counts
func (r *adminRepository) ListUsers(ctx context.Context, search, role, status string, limit, offset int) ([]*models.AdminUserItem, int, error) {
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

	if search != "" {
		where = append(where, fmt.Sprintf("(u.name ILIKE $%d OR u.email ILIKE $%d OR u.title ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	if role != "" && role != "all" {
		where = append(where, fmt.Sprintf("u.role = $%d", idx))
		args = append(args, role)
		idx++
	}

	if status != "" && status != "all" {
		where = append(where, fmt.Sprintf("u.status = $%d", idx))
		args = append(args, status)
		idx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users u %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT u.id, u.name, u.email, u.role, u.account_type, u.avatar, u.title,
		       u.location, u.rating, u.reviews_count, u.skills, u.about, u.languages,
		       u.completed_projects, u.starting_price, u.status, u.is_active,
		       u.created_at, u.updated_at,
		       (SELECT COUNT(*) FROM services s WHERE s.seller_id = u.id) AS service_count,
		       (SELECT COUNT(*) FROM projects p WHERE p.buyer_id = u.id) AS project_count,
		       (SELECT COUNT(*) FROM contracts c WHERE c.client_id = u.id OR c.freelancer_id = u.id) AS contract_count
		FROM users u
		%s
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []*models.AdminUserItem
	for rows.Next() {
		var item models.AdminUserItem
		var skillsJSON, languagesJSON []byte

		if err := rows.Scan(
			&item.ID, &item.Name, &item.Email, &item.Role, &item.AccountType, &item.Avatar, &item.Title,
			&item.Location, &item.Rating, &item.ReviewsCount, &skillsJSON, &item.About, &languagesJSON,
			&item.CompletedProjects, &item.StartingPrice, &item.Status, &item.IsActive,
			&item.CreatedAt, &item.UpdatedAt,
			&item.ServiceCount, &item.ProjectCount, &item.ContractCount,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}

		if len(skillsJSON) > 0 {
			_ = json.Unmarshal(skillsJSON, &item.Skills)
		}
		if len(languagesJSON) > 0 {
			_ = json.Unmarshal(languagesJSON, &item.Languages)
		}

		users = append(users, &item)
	}

	return users, total, nil
}

// GetUserByID gets single user details with relation counts
func (r *adminRepository) GetUserByID(ctx context.Context, id string) (*models.AdminUserItem, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	query := `
		SELECT u.id, u.name, u.email, u.role, u.account_type, u.avatar, u.title,
		       u.location, u.rating, u.reviews_count, u.skills, u.about, u.languages,
		       u.completed_projects, u.starting_price, u.status, u.is_active,
		       u.created_at, u.updated_at,
		       (SELECT COUNT(*) FROM services s WHERE s.seller_id = u.id) AS service_count,
		       (SELECT COUNT(*) FROM projects p WHERE p.buyer_id = u.id) AS project_count,
		       (SELECT COUNT(*) FROM contracts c WHERE c.client_id = u.id OR c.freelancer_id = u.id) AS contract_count
		FROM users u
		WHERE u.id = $1;
	`

	var item models.AdminUserItem
	var skillsJSON, languagesJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&item.ID, &item.Name, &item.Email, &item.Role, &item.AccountType, &item.Avatar, &item.Title,
		&item.Location, &item.Rating, &item.ReviewsCount, &skillsJSON, &item.About, &languagesJSON,
		&item.CompletedProjects, &item.StartingPrice, &item.Status, &item.IsActive,
		&item.CreatedAt, &item.UpdatedAt,
		&item.ServiceCount, &item.ProjectCount, &item.ContractCount,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}

	if len(skillsJSON) > 0 {
		_ = json.Unmarshal(skillsJSON, &item.Skills)
	}
	if len(languagesJSON) > 0 {
		_ = json.Unmarshal(languagesJSON, &item.Languages)
	}

	return &item, nil
}

// UpdateUserStatus changes user status and is_active flag
func (r *adminRepository) UpdateUserStatus(ctx context.Context, id string, status string, isActive bool) error {
	if err := r.available(); err != nil {
		return err
	}

	query := `UPDATE users SET status = $1, is_active = $2, updated_at = NOW() WHERE id = $3;`
	res, err := r.db.ExecContext(ctx, query, status, isActive, id)
	if err != nil {
		return fmt.Errorf("failed to update user status: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrUserNotFound
	}
	return nil
}

// ListServices lists services with filters and pagination for moderation
func (r *adminRepository) ListServices(ctx context.Context, search, status string, limit, offset int) ([]*models.Service, int, error) {
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

	if search != "" {
		where = append(where, fmt.Sprintf("(s.title ILIKE $%d OR s.description ILIKE $%d)", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	if status != "" && status != "all" {
		where = append(where, fmt.Sprintf("s.status = $%d", idx))
		args = append(args, status)
		idx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM services s %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count services: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images,
		       s.description, s.tags, s.starting_price, s.currency, s.delivery_days,
		       s.rating, s.review_count, s.order_count, s.created_at, s.updated_at, s.published_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.role, ''), COALESCE(u.avatar, ''), COALESCE(u.title, '')
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		%s
		ORDER BY s.created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list services: %w", err)
	}
	defer rows.Close()

	var services []*models.Service
	for rows.Next() {
		var s models.Service
		var tagIDsJSON, galleryImagesJSON, tagsJSON []byte
		var pubAt sql.NullTime
		var u models.User

		if err := rows.Scan(
			&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
			&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
			&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryImagesJSON,
			&s.Description, &tagsJSON, &s.StartingPrice, &s.Currency, &s.DeliveryDays,
			&s.Rating, &s.ReviewCount, &s.OrderCount, &s.CreatedAt, &s.UpdatedAt, &pubAt,
			&u.ID, &u.Name, &u.Email, &u.Role, &u.Avatar, &u.Title,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan service: %w", err)
		}

		if pubAt.Valid {
			s.PublishedAt = &pubAt.Time
		}
		_ = json.Unmarshal(tagIDsJSON, &s.TagIDs)
		_ = json.Unmarshal(galleryImagesJSON, &s.GalleryImages)
		_ = json.Unmarshal(tagsJSON, &s.Tags)
		if u.ID != "" {
			s.Seller = &u
		}

		services = append(services, &s)
	}

	return services, total, nil
}

// GetServiceByID returns a service by ID with seller details
func (r *adminRepository) GetServiceByID(ctx context.Context, id string) (*models.Service, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	query := `
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images,
		       s.description, s.tags, s.starting_price, s.currency, s.delivery_days,
		       s.rating, s.review_count, s.order_count, s.created_at, s.updated_at, s.published_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.role, ''), COALESCE(u.avatar, ''), COALESCE(u.title, '')
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		WHERE s.id = $1;
	`

	var s models.Service
	var tagIDsJSON, galleryImagesJSON, tagsJSON []byte
	var pubAt sql.NullTime
	var u models.User

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
		&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
		&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryImagesJSON,
		&s.Description, &tagsJSON, &s.StartingPrice, &s.Currency, &s.DeliveryDays,
		&s.Rating, &s.ReviewCount, &s.OrderCount, &s.CreatedAt, &s.UpdatedAt, &pubAt,
		&u.ID, &u.Name, &u.Email, &u.Role, &u.Avatar, &u.Title,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrServiceNotFound
		}
		return nil, fmt.Errorf("failed to get service: %w", err)
	}

	if pubAt.Valid {
		s.PublishedAt = &pubAt.Time
	}
	_ = json.Unmarshal(tagIDsJSON, &s.TagIDs)
	_ = json.Unmarshal(galleryImagesJSON, &s.GalleryImages)
	_ = json.Unmarshal(tagsJSON, &s.Tags)
	if u.ID != "" {
		s.Seller = &u
	}

	return &s, nil
}

// UpdateServiceStatus updates service status
func (r *adminRepository) UpdateServiceStatus(ctx context.Context, id string, status string) error {
	if err := r.available(); err != nil {
		return err
	}

	var query string
	var err error
	var res sql.Result

	if status == "published" {
		query = `UPDATE services SET status = $1, published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $2;`
		res, err = r.db.ExecContext(ctx, query, status, id)
	} else {
		query = `UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2;`
		res, err = r.db.ExecContext(ctx, query, status, id)
	}

	if err != nil {
		return fmt.Errorf("failed to update service status: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrServiceNotFound
	}
	return nil
}

// ListProjects lists projects with filters for administration
func (r *adminRepository) ListProjects(ctx context.Context, search, status string, limit, offset int) ([]*models.Project, int, error) {
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

	if search != "" {
		where = append(where, fmt.Sprintf("(p.title ILIKE $%d OR p.description ILIKE $%d)", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	if status != "" && status != "all" {
		where = append(where, fmt.Sprintf("p.status = $%d", idx))
		args = append(args, status)
		idx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM projects p %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count projects: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT p.id, p.buyer_id, p.title, p.description, p.category_id, p.subcategory_id,
		       p.budget_type, p.budget_min, p.budget_max, p.fixed_budget,
		       p.experience_level, p.estimated_duration, p.status, p.visibility,
		       p.proposal_count, p.selected_proposal_id, p.created_at, p.updated_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.avatar, ''), COALESCE(u.role, '')
		FROM projects p
		LEFT JOIN users u ON p.buyer_id = u.id
		%s
		ORDER BY p.created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		var p models.Project
		var bMin, bMax, fBudget sql.NullFloat64
		var selPropID sql.NullString
		var u models.User

		if err := rows.Scan(
			&p.ID, &p.BuyerID, &p.Title, &p.Description, &p.CategoryID, &p.SubcategoryID,
			&p.BudgetType, &bMin, &bMax, &fBudget,
			&p.ExperienceLevel, &p.EstimatedDuration, &p.Status, &p.Visibility,
			&p.ProposalCount, &selPropID, &p.CreatedAt, &p.UpdatedAt,
			&u.ID, &u.Name, &u.Email, &u.Avatar, &u.Role,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan project: %w", err)
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
		if selPropID.Valid {
			p.SelectedProposalID = &selPropID.String
		}
		if u.ID != "" {
			p.Buyer = &u
		}

		projects = append(projects, &p)
	}

	return projects, total, nil
}

// GetProjectByID returns project by ID with buyer details
func (r *adminRepository) GetProjectByID(ctx context.Context, id string) (*models.Project, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	query := `
		SELECT p.id, p.buyer_id, p.title, p.description, p.category_id, p.subcategory_id,
		       p.budget_type, p.budget_min, p.budget_max, p.fixed_budget,
		       p.experience_level, p.estimated_duration, p.status, p.visibility,
		       p.proposal_count, p.selected_proposal_id, p.created_at, p.updated_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.avatar, ''), COALESCE(u.role, '')
		FROM projects p
		LEFT JOIN users u ON p.buyer_id = u.id
		WHERE p.id = $1;
	`

	var p models.Project
	var bMin, bMax, fBudget sql.NullFloat64
	var selPropID sql.NullString
	var u models.User

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.BuyerID, &p.Title, &p.Description, &p.CategoryID, &p.SubcategoryID,
		&p.BudgetType, &bMin, &bMax, &fBudget,
		&p.ExperienceLevel, &p.EstimatedDuration, &p.Status, &p.Visibility,
		&p.ProposalCount, &selPropID, &p.CreatedAt, &p.UpdatedAt,
		&u.ID, &u.Name, &u.Email, &u.Avatar, &u.Role,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrProjectNotFound
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
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
	if selPropID.Valid {
		p.SelectedProposalID = &selPropID.String
	}
	if u.ID != "" {
		p.Buyer = &u
	}

	return &p, nil
}

// UpdateProjectStatus changes project status
func (r *adminRepository) UpdateProjectStatus(ctx context.Context, id string, status string) error {
	if err := r.available(); err != nil {
		return err
	}

	query := `UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2;`
	res, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update project status: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrProjectNotFound
	}
	return nil
}

// GetAnalytics computes live platform aggregations using SQL queries
func (r *adminRepository) GetAnalytics(ctx context.Context) (*models.AdminAnalytics, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	var stats models.AdminAnalytics

	// Users aggregation
	userQuery := `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'active'),
			COUNT(*) FILTER (WHERE status = 'suspended'),
			COUNT(*) FILTER (WHERE role IN ('buyer', 'client')),
			COUNT(*) FILTER (WHERE role IN ('seller', 'freelancer')),
			COUNT(*) FILTER (WHERE role = 'admin')
		FROM users;
	`
	if err := r.db.QueryRowContext(ctx, userQuery).Scan(
		&stats.Users.Total,
		&stats.Users.Active,
		&stats.Users.Suspended,
		&stats.Users.Buyers,
		&stats.Users.Sellers,
		&stats.Users.Admins,
	); err != nil {
		return nil, fmt.Errorf("failed to aggregate users: %w", err)
	}

	// Services aggregation
	serviceQuery := `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'published'),
			COUNT(*) FILTER (WHERE status = 'pending_review'),
			COUNT(*) FILTER (WHERE status = 'rejected'),
			COUNT(*) FILTER (WHERE status = 'suspended')
		FROM services;
	`
	if err := r.db.QueryRowContext(ctx, serviceQuery).Scan(
		&stats.Marketplace.TotalServices,
		&stats.Marketplace.PublishedServices,
		&stats.Marketplace.PendingReview,
		&stats.Marketplace.RejectedServices,
		&stats.Marketplace.SuspendedServices,
	); err != nil {
		return nil, fmt.Errorf("failed to aggregate services: %w", err)
	}

	// Projects aggregation
	projectQuery := `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')),
			COUNT(*) FILTER (WHERE status = 'suspended')
		FROM projects;
	`
	if err := r.db.QueryRowContext(ctx, projectQuery).Scan(
		&stats.Marketplace.TotalProjects,
		&stats.Marketplace.ActiveProjects,
		&stats.Marketplace.SuspendedProjects,
	); err != nil {
		return nil, fmt.Errorf("failed to aggregate projects: %w", err)
	}

	// Contracts aggregation
	contractQuery := `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'active'),
			COUNT(*) FILTER (WHERE status = 'completed'),
			COUNT(*) FILTER (WHERE status = 'disputed')
		FROM contracts;
	`
	if err := r.db.QueryRowContext(ctx, contractQuery).Scan(
		&stats.Contracts.TotalContracts,
		&stats.Contracts.ActiveContracts,
		&stats.Contracts.CompletedContracts,
		&stats.Contracts.DisputedContracts,
	); err != nil {
		// If contracts table is empty or error, don't fail entire call
		stats.Contracts.TotalContracts = 0
	}

	// Financial aggregation
	financialQuery := `
		SELECT
			COUNT(*),
			COALESCE(SUM(amount) FILTER (WHERE status = 'released'), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0),
			COALESCE(SUM(platform_fee) FILTER (WHERE status = 'released'), 0)
		FROM payments;
	`
	if err := r.db.QueryRowContext(ctx, financialQuery).Scan(
		&stats.Financial.TotalPayments,
		&stats.Financial.ReleasedPayments,
		&stats.Financial.RefundedPayments,
		&stats.Financial.PlatformRevenue,
	); err != nil {
		stats.Financial.TotalPayments = 0
	}

	// Governance (Reports & Audit) aggregation
	govQuery := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'open'),
			COUNT(*) FILTER (WHERE status = 'under_review'),
			COUNT(*) FILTER (WHERE status = 'resolved'),
			COUNT(*) FILTER (WHERE status = 'dismissed')
		FROM reports;
	`
	if err := r.db.QueryRowContext(ctx, govQuery).Scan(
		&stats.Governance.OpenReports,
		&stats.Governance.UnderReviewReports,
		&stats.Governance.ResolvedReports,
		&stats.Governance.DismissedReports,
	); err != nil {
		stats.Governance.OpenReports = 0
	}

	var auditTotal int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM audit_logs;`).Scan(&auditTotal); err == nil {
		stats.Governance.TotalAuditLogs = auditTotal
	}

	return &stats, nil
}
