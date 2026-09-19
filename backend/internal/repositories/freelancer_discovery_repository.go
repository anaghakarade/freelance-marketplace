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

type FreelancerSearchFilter struct {
	Query, Category, Skill, Tier, Sort string
	MinRating                          *float64
	Page, Limit                        int
}
type FreelancerDiscoveryRepository struct{ db *database.DBWrapper }

func NewFreelancerDiscoveryRepository(db *database.DBWrapper) *FreelancerDiscoveryRepository {
	return &FreelancerDiscoveryRepository{db: db}
}

func (r *FreelancerDiscoveryRepository) Search(ctx context.Context, f FreelancerSearchFilter) ([]models.FreelancerSearchResult, int, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, 0, ErrDatabaseUnavailable
	}
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 20
	}
	where := []string{"u.is_active = true", "u.status = 'active'", "LOWER(u.role) IN ('freelancer','seller')"}
	args := []interface{}{}
	idx := 1
	if f.Query != "" {
		where = append(where, fmt.Sprintf("(u.name ILIKE $%d OR u.title ILIKE $%d OR u.about ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+f.Query+"%")
		idx++
	}
	if f.Skill != "" {
		where = append(where, fmt.Sprintf("u.skills::text ILIKE $%d", idx))
		args = append(args, "%"+f.Skill+"%")
		idx++
	}
	if f.Category != "" {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM services s WHERE s.seller_id=u.id AND s.status='published' AND s.category_slug=$%d)", idx))
		args = append(args, f.Category)
		idx++
	}
	if f.MinRating != nil {
		where = append(where, fmt.Sprintf("COALESCE(rv.average_rating,0)>=$%d", idx))
		args = append(args, *f.MinRating)
		idx++
	}
	if f.Tier != "" {
		where = append(where, fmt.Sprintf("tier.growth_tier=$%d", idx))
		args = append(args, f.Tier)
		idx++
	}
	base := `FROM users u LEFT JOIN (SELECT reviewee_id,AVG(rating) average_rating,COUNT(*) rating_count FROM reviews WHERE deleted_at IS NULL GROUP BY reviewee_id) rv ON rv.reviewee_id=u.id LEFT JOIN (SELECT freelancer_id,COUNT(*) completed FROM contracts WHERE status='completed' GROUP BY freelancer_id) cc ON cc.freelancer_id=u.id CROSS JOIN LATERAL (SELECT CASE WHEN COALESCE(cc.completed,0)>=20 AND COALESCE(rv.rating_count,0)>=15 AND COALESCE(rv.average_rating,0)>=4.8 THEN 'Top Performer' WHEN COALESCE(cc.completed,0)>=10 AND COALESCE(rv.rating_count,0)>=8 AND COALESCE(rv.average_rating,0)>=4.5 THEN 'Trusted' WHEN COALESCE(cc.completed,0)>=5 AND COALESCE(rv.rating_count,0)>=3 AND COALESCE(rv.average_rating,0)>=4 THEN 'Established' WHEN COALESCE(cc.completed,0)>=1 THEN 'Rising' ELSE 'New' END growth_tier) tier WHERE ` + strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) "+base, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := "match_score DESC, u.created_at DESC"
	switch f.Sort {
	case "rating":
		order = "COALESCE(rv.average_rating,0) DESC, COALESCE(rv.rating_count,0) DESC"
	case "completed":
		order = "COALESCE(cc.completed,0) DESC"
	case "newest":
		order = "u.created_at DESC"
	}
	categoryScore, skillScore := 0, 0
	if f.Category != "" {
		categoryScore = 30
	}
	if f.Skill != "" {
		skillScore = 20
	}
	// Factors are deterministic and explainable: requested category (+30), requested skill (+20), rating (max +50), and completed contracts (max +20).
	score := fmt.Sprintf(`(%d + %d + LEAST(COALESCE(rv.average_rating,0)*10,50) + LEAST(COALESCE(cc.completed,0)*2,20))`, categoryScore, skillScore)
	query := fmt.Sprintf(`SELECT u.id,u.name,u.email,u.role,u.account_type,COALESCE(u.avatar,''),COALESCE(u.title,''),COALESCE(u.location,''),COALESCE(u.skills,'[]'::jsonb)::text,u.created_at,COALESCE(rv.average_rating,0),COALESCE(rv.rating_count,0),COALESCE(cc.completed,0),tier.growth_tier,%s AS match_score %s ORDER BY %s LIMIT $%d OFFSET $%d`, score, base, order, idx, idx+1)
	queryArgs := append(args, f.Limit, (f.Page-1)*f.Limit)
	rows, err := r.db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []models.FreelancerSearchResult{}
	for rows.Next() {
		var v models.FreelancerSearchResult
		var skills string
		if err = rows.Scan(&v.User.ID, &v.User.Name, &v.User.Email, &v.User.Role, &v.User.AccountType, &v.User.Avatar, &v.User.Title, &v.User.Location, &skills, &v.User.CreatedAt, &v.AverageRating, &v.RatingCount, &v.Completed, &v.GrowthTier, &v.MatchScore); err != nil {
			return nil, 0, err
		}
		_ = json.Unmarshal([]byte(skills), &v.User.Skills)
		if f.Category != "" {
			v.MatchReasons = append(v.MatchReasons, "category match")
		}
		if f.Skill != "" {
			v.MatchReasons = append(v.MatchReasons, "skill match")
		}
		if v.AverageRating > 0 {
			v.MatchReasons = append(v.MatchReasons, "review rating")
		}
		if v.Completed > 0 {
			v.MatchReasons = append(v.MatchReasons, "completed contracts")
		}
		out = append(out, v)
	}
	return out, total, rows.Err()
}

var _ = sql.ErrNoRows
