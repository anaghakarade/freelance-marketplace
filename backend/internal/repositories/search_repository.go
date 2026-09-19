package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

// SearchRepository defines database search queries
type SearchRepository interface {
	SearchServices(ctx context.Context, p models.ServiceSearchParams) ([]models.ServiceSearchResult, int, error)
	SearchFreelancers(ctx context.Context, p models.FreelancerSearchParams) ([]models.FreelancerSearchResult, int, error)
	SearchProjects(ctx context.Context, p models.ProjectSearchParams) ([]models.Project, int, error)
}

type searchRepository struct {
	db *database.DBWrapper
}

func NewSearchRepository(db *database.DBWrapper) SearchRepository {
	return &searchRepository{db: db}
}

// SearchServices executes an advanced service query with relevance scoring and filters
func (r *searchRepository) SearchServices(ctx context.Context, p models.ServiceSearchParams) ([]models.ServiceSearchResult, int, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, 0, ErrDatabaseUnavailable
	}

	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}

	where := []string{"s.status = 'published'"}
	args := []interface{}{}
	idx := 1

	qClean := strings.TrimSpace(p.Query)
	var relevanceExpr string

	if qClean != "" {
		where = append(where, fmt.Sprintf("(s.title ILIKE $%d OR s.description ILIKE $%d OR s.tags::text ILIKE $%d OR s.category_slug ILIKE $%d)", idx, idx, idx, idx))
		args = append(args, "%"+qClean+"%")
		idx++

		// Calculate relevance score: Title (+50), Tags (+30), Description (+15), Rating bonus (up to 25)
		relevanceExpr = fmt.Sprintf(`
			(CASE WHEN s.title ILIKE $%d THEN 50.0 ELSE 0.0 END +
			 CASE WHEN s.tags::text ILIKE $%d THEN 30.0 ELSE 0.0 END +
			 CASE WHEN s.description ILIKE $%d THEN 15.0 ELSE 0.0 END +
			 (COALESCE(s.rating, 0) * 5.0))`, idx-1, idx-1, idx-1)
	} else {
		relevanceExpr = "(COALESCE(s.rating, 0) * 10.0 + LEAST(COALESCE(s.order_count, 0), 20.0))"
	}

	if p.Category != "" {
		where = append(where, fmt.Sprintf("(s.category_slug = $%d OR s.category_id = $%d)", idx, idx))
		args = append(args, p.Category)
		idx++
	}

	if p.Subcategory != "" {
		where = append(where, fmt.Sprintf("(s.subcategory_slug = $%d OR s.subcategory_id = $%d)", idx, idx))
		args = append(args, p.Subcategory)
		idx++
	}

	if p.MinPrice != nil {
		where = append(where, fmt.Sprintf("s.starting_price >= $%d", idx))
		args = append(args, *p.MinPrice)
		idx++
	}

	if p.MaxPrice != nil {
		where = append(where, fmt.Sprintf("s.starting_price <= $%d", idx))
		args = append(args, *p.MaxPrice)
		idx++
	}

	if p.MinRating != nil {
		where = append(where, fmt.Sprintf("s.rating >= $%d", idx))
		args = append(args, *p.MinRating)
		idx++
	}

	if p.MaxDeliveryTime != nil {
		where = append(where, fmt.Sprintf("s.delivery_days <= $%d", idx))
		args = append(args, *p.MaxDeliveryTime)
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM services s WHERE %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("error counting services: %w", err)
	}

	// Determine sorting
	orderBy := fmt.Sprintf("%s DESC, s.rating DESC", relevanceExpr)
	switch strings.ToLower(p.Sort) {
	case "rating":
		orderBy = "s.rating DESC, s.review_count DESC"
	case "price_asc":
		orderBy = "s.starting_price ASC"
	case "price_desc":
		orderBy = "s.starting_price DESC"
	case "newest":
		orderBy = "s.created_at DESC"
	case "orders":
		orderBy = "s.order_count DESC"
	}

	offset := (p.Page - 1) * p.Limit
	selectQuery := fmt.Sprintf(`
		SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
		       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
		       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images, s.description, s.tags,
		       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
		       s.order_count, s.created_at, s.updated_at, s.published_at,
		       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
		       COALESCE(u.role, ''), COALESCE(u.avatar, ''), COALESCE(u.title, ''),
		       %s AS relevance_score
		FROM services s
		LEFT JOIN users u ON s.seller_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, relevanceExpr, whereClause, orderBy, idx, idx+1)

	queryArgs := append(args, p.Limit, offset)
	rows, err := r.db.QueryContext(ctx, selectQuery, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("error querying services: %w", err)
	}
	defer rows.Close()

	var results []models.ServiceSearchResult
	for rows.Next() {
		var s models.Service
		var u models.User
		var tagIDsJSON, galleryJSON, tagsJSON string
		var relevance float64

		err := rows.Scan(
			&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
			&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
			&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryJSON, &s.Description, &tagsJSON,
			&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
			&s.OrderCount, &s.CreatedAt, &s.UpdatedAt, &s.PublishedAt,
			&u.ID, &u.Name, &u.Email, &u.Role, &u.Avatar, &u.Title,
			&relevance,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan service row error: %w", err)
		}

		_ = json.Unmarshal([]byte(tagIDsJSON), &s.TagIDs)
		_ = json.Unmarshal([]byte(galleryJSON), &s.GalleryImages)
		_ = json.Unmarshal([]byte(tagsJSON), &s.Tags)
		s.Seller = &u

		var highlights []string
		if qClean != "" {
			if strings.Contains(strings.ToLower(s.Title), strings.ToLower(qClean)) {
				highlights = append(highlights, "Matched title")
			}
			for _, t := range s.Tags {
				if strings.Contains(strings.ToLower(t), strings.ToLower(qClean)) {
					highlights = append(highlights, fmt.Sprintf("Tag: %s", t))
				}
			}
		}

		results = append(results, models.ServiceSearchResult{
			Service:        s,
			RelevanceScore: relevance,
			Highlights:     highlights,
		})
	}

	return results, total, rows.Err()
}

// SearchFreelancers executes query filters against the active freelancer directory
func (r *searchRepository) SearchFreelancers(ctx context.Context, p models.FreelancerSearchParams) ([]models.FreelancerSearchResult, int, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, 0, ErrDatabaseUnavailable
	}

	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}

	where := []string{"u.is_active = true", "u.status = 'active'", "LOWER(u.role) IN ('freelancer','seller')"}
	args := []interface{}{}
	idx := 1

	if p.Query != "" {
		where = append(where, fmt.Sprintf("(u.name ILIKE $%d OR u.title ILIKE $%d OR u.about ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+p.Query+"%")
		idx++
	}

	if p.Skill != "" {
		where = append(where, fmt.Sprintf("u.skills::text ILIKE $%d", idx))
		args = append(args, "%"+p.Skill+"%")
		idx++
	}

	if p.Category != "" {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM services s WHERE s.seller_id=u.id AND s.status='published' AND (s.category_slug=$%d OR s.category_id=$%d))", idx, idx))
		args = append(args, p.Category)
		idx++
	}

	if p.MinRating != nil {
		where = append(where, fmt.Sprintf("COALESCE(rv.average_rating, 0) >= $%d", idx))
		args = append(args, *p.MinRating)
		idx++
	}

	if p.MinCompleted != nil {
		where = append(where, fmt.Sprintf("COALESCE(cc.completed, 0) >= $%d", idx))
		args = append(args, *p.MinCompleted)
		idx++
	}

	if p.MinPrice != nil {
		where = append(where, fmt.Sprintf("u.starting_price >= $%d", idx))
		args = append(args, *p.MinPrice)
		idx++
	}

	if p.MaxPrice != nil {
		where = append(where, fmt.Sprintf("u.starting_price <= $%d", idx))
		args = append(args, *p.MaxPrice)
		idx++
	}

	if p.Tier != "" {
		where = append(where, fmt.Sprintf("tier.growth_tier = $%d", idx))
		args = append(args, p.Tier)
		idx++
	}

	baseQuery := `
		FROM users u
		LEFT JOIN (
			SELECT reviewee_id, AVG(rating) average_rating, COUNT(*) rating_count
			FROM reviews
			WHERE deleted_at IS NULL
			GROUP BY reviewee_id
		) rv ON rv.reviewee_id = u.id
		LEFT JOIN (
			SELECT freelancer_id, COUNT(*) completed
			FROM contracts
			WHERE status = 'completed'
			GROUP BY freelancer_id
		) cc ON cc.freelancer_id = u.id
		CROSS JOIN LATERAL (
			SELECT CASE
				WHEN COALESCE(cc.completed, 0) >= 20 AND COALESCE(rv.rating_count, 0) >= 15 AND COALESCE(rv.average_rating, 0) >= 4.8 THEN 'Top Performer'
				WHEN COALESCE(cc.completed, 0) >= 10 AND COALESCE(rv.rating_count, 0) >= 8 AND COALESCE(rv.average_rating, 0) >= 4.5 THEN 'Trusted'
				WHEN COALESCE(cc.completed, 0) >= 5 AND COALESCE(rv.rating_count, 0) >= 3 AND COALESCE(rv.average_rating, 0) >= 4.0 THEN 'Established'
				WHEN COALESCE(cc.completed, 0) >= 1 THEN 'Rising'
				ELSE 'New'
			END growth_tier
		) tier
		WHERE ` + strings.Join(where, " AND ")

	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	orderBy := "match_score DESC, u.created_at DESC"
	switch strings.ToLower(p.Sort) {
	case "rating":
		orderBy = "COALESCE(rv.average_rating, 0) DESC, COALESCE(rv.rating_count, 0) DESC"
	case "completed":
		orderBy = "COALESCE(cc.completed, 0) DESC"
	case "price_asc":
		orderBy = "u.starting_price ASC"
	case "newest":
		orderBy = "u.created_at DESC"
	}

	scoreExpr := `(LEAST(COALESCE(rv.average_rating, 0) * 10, 50) + LEAST(COALESCE(cc.completed, 0) * 2, 30))`

	selectQuery := fmt.Sprintf(`
		SELECT u.id, u.name, u.email, u.role, u.account_type, COALESCE(u.avatar, ''),
		       COALESCE(u.title, ''), COALESCE(u.location, ''), COALESCE(u.skills, '[]'::jsonb)::text,
		       COALESCE(u.about, ''), COALESCE(u.starting_price, 0), u.created_at,
		       COALESCE(rv.average_rating, 0), COALESCE(rv.rating_count, 0),
		       COALESCE(cc.completed, 0), tier.growth_tier, %s AS match_score
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, scoreExpr, baseQuery, orderBy, idx, idx+1)

	offset := (p.Page - 1) * p.Limit
	queryArgs := append(args, p.Limit, offset)

	rows, err := r.db.QueryContext(ctx, selectQuery, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []models.FreelancerSearchResult
	for rows.Next() {
		var v models.FreelancerSearchResult
		var skillsJSON string
		err := rows.Scan(
			&v.User.ID, &v.User.Name, &v.User.Email, &v.User.Role, &v.User.AccountType,
			&v.User.Avatar, &v.User.Title, &v.User.Location, &skillsJSON, &v.User.About,
			&v.User.StartingPrice, &v.User.CreatedAt, &v.AverageRating, &v.RatingCount,
			&v.Completed, &v.GrowthTier, &v.MatchScore,
		)
		if err != nil {
			return nil, 0, err
		}

		_ = json.Unmarshal([]byte(skillsJSON), &v.User.Skills)
		v.User.Rating = v.AverageRating
		v.User.ReviewsCount = v.RatingCount
		v.User.CompletedProjects = v.Completed

		if p.Category != "" {
			v.MatchReasons = append(v.MatchReasons, "Category match")
		}
		if p.Skill != "" {
			v.MatchReasons = append(v.MatchReasons, "Skill match")
		}
		if v.AverageRating >= 4.5 {
			v.MatchReasons = append(v.MatchReasons, "High client satisfaction")
		}
		if v.Completed > 0 {
			v.MatchReasons = append(v.MatchReasons, fmt.Sprintf("%d completed contracts", v.Completed))
		}

		results = append(results, v)
	}

	return results, total, rows.Err()
}

// SearchProjects executes search across open buyer projects
func (r *searchRepository) SearchProjects(ctx context.Context, p models.ProjectSearchParams) ([]models.Project, int, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, 0, ErrDatabaseUnavailable
	}

	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}

	where := []string{"p.status = 'open'"}
	args := []interface{}{}
	idx := 1

	if p.Query != "" {
		where = append(where, fmt.Sprintf("(p.title ILIKE $%d OR p.description ILIKE $%d)", idx, idx))
		args = append(args, "%"+p.Query+"%")
		idx++
	}

	if p.Category != "" {
		where = append(where, fmt.Sprintf("(c.slug = $%d OR p.category_id = $%d)", idx, idx))
		args = append(args, p.Category)
		idx++
	}

	if p.Skill != "" {
		where = append(where, fmt.Sprintf("p.skills::text ILIKE $%d", idx))
		args = append(args, "%"+p.Skill+"%")
		idx++
	}

	if p.MinBudget != nil {
		where = append(where, fmt.Sprintf("(p.fixed_budget >= $%d OR p.budget_min >= $%d)", idx, idx))
		args = append(args, *p.MinBudget)
		idx++
	}

	if p.MaxBudget != nil {
		where = append(where, fmt.Sprintf("(p.fixed_budget <= $%d OR p.budget_max <= $%d)", idx, idx))
		args = append(args, *p.MaxBudget)
		idx++
	}

	if p.ExperienceLevel != "" {
		where = append(where, fmt.Sprintf("p.experience_level = $%d", idx))
		args = append(args, p.ExperienceLevel)
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM projects p
		JOIN categories c ON p.category_id = c.id
		WHERE %s
	`, whereClause)

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	orderBy := "p.created_at DESC"
	switch strings.ToLower(p.Sort) {
	case "budget_high":
		orderBy = "COALESCE(p.fixed_budget, p.budget_max, 0) DESC"
	case "budget_low":
		orderBy = "COALESCE(p.fixed_budget, p.budget_min, 0) ASC"
	case "proposals":
		orderBy = "p.proposal_count DESC"
	}

	offset := (p.Page - 1) * p.Limit
	selectQuery := fmt.Sprintf(`
		SELECT p.id, p.buyer_id, p.title, p.description, p.category_id, c.slug, c.name,
		       p.subcategory_id, COALESCE(sc.slug, ''), COALESCE(sc.name, ''),
		       p.skills, p.budget_type, p.budget_min, p.budget_max, p.fixed_budget,
		       p.experience_level, p.estimated_duration, p.status, p.visibility,
		       p.proposal_count, p.created_at, p.updated_at,
		       u.id, u.name, u.email, u.role, COALESCE(u.avatar, '')
		FROM projects p
		JOIN categories c ON p.category_id = c.id
		LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
		JOIN users u ON p.buyer_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, idx, idx+1)

	queryArgs := append(args, p.Limit, offset)
	rows, err := r.db.QueryContext(ctx, selectQuery, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var pr models.Project
		var u models.User
		var skillsJSON string

		err := rows.Scan(
			&pr.ID, &pr.BuyerID, &pr.Title, &pr.Description, &pr.CategoryID, &pr.CategorySlug, &pr.CategoryName,
			&pr.SubcategoryID, &pr.SubcategorySlug, &pr.SubcategoryName,
			&skillsJSON, &pr.BudgetType, &pr.BudgetMin, &pr.BudgetMax, &pr.FixedBudget,
			&pr.ExperienceLevel, &pr.EstimatedDuration, &pr.Status, &pr.Visibility,
			&pr.ProposalCount, &pr.CreatedAt, &pr.UpdatedAt,
			&u.ID, &u.Name, &u.Email, &u.Role, &u.Avatar,
		)
		if err != nil {
			return nil, 0, err
		}

		_ = json.Unmarshal([]byte(skillsJSON), &pr.Skills)
		pr.Buyer = &u
		projects = append(projects, pr)
	}

	return projects, total, rows.Err()
}

var _ = sql.ErrNoRows
