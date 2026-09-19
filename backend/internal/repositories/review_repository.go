package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	ErrReviewForbidden = errors.New("review forbidden")
	ErrReviewNotFound  = errors.New("review not found")
	ErrReviewDuplicate = errors.New("review already exists")
)

type ReviewStore interface {
	Eligibility(ctx context.Context, contractID, userID string) (revieweeID string, eligible bool, err error)
	Create(ctx context.Context, review *models.ContractReview) error
	Get(ctx context.Context, id string) (*models.ContractReview, error)
	List(ctx context.Context, userID string, limit, offset int) ([]models.ContractReview, error)
	Update(ctx context.Context, id, userID string, rating int, comment string) (*models.ContractReview, error)
	Delete(ctx context.Context, id, userID string) error
	Trust(ctx context.Context, userID string) (*models.TrustProfile, error)
}

type ReviewRepository struct{ db *database.DBWrapper }

func NewReviewRepository(db *database.DBWrapper) *ReviewRepository {
	return &ReviewRepository{db}
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505"
}

func DetermineGrowthTier(completedProjects, ratingCount int, averageRating float64) string {
	if completedProjects >= 20 && ratingCount >= 15 && averageRating >= 4.8 {
		return "Top Performer"
	}
	if completedProjects >= 10 && ratingCount >= 8 && averageRating >= 4.5 {
		return "Trusted"
	}
	if completedProjects >= 5 && ratingCount >= 3 && averageRating >= 4 {
		return "Established"
	}
	if completedProjects >= 1 {
		return "Rising"
	}
	return "New"
}

func percentRate(numerator, denominator int) *float64 {
	if denominator <= 0 {
		return nil
	}
	value := float64(numerator) * 100 / float64(denominator)
	return &value
}

func (r *ReviewRepository) eligible(c context.Context, contract, user string) (string, string, string, error) {
	var project, buyer, freelancer, status string
	e := r.db.QueryRowContext(c, `SELECT project_id,buyer_id,freelancer_id,status FROM contracts WHERE id=$1`, contract).Scan(&project, &buyer, &freelancer, &status)
	if errors.Is(e, sql.ErrNoRows) {
		return "", "", "", e
	}
	if e != nil {
		return "", "", "", e
	}
	if status != "completed" || (user != buyer && user != freelancer) {
		return "", "", "", ErrReviewForbidden
	}
	if user == buyer {
		return project, freelancer, buyer, nil
	}
	return project, buyer, freelancer, nil
}

func (r *ReviewRepository) Create(c context.Context, v *models.ContractReview) error {
	if v.ProjectID == "" {
		if e := r.db.QueryRowContext(c, `SELECT project_id FROM contracts WHERE id=$1`, v.ContractID).Scan(&v.ProjectID); e != nil {
			return e
		}
	}
	tx, e := r.db.BeginTx(c, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(c, `INSERT INTO reviews(id,reviewer_id,reviewee_id,project_id,contract_id,rating,comment,is_verified) VALUES($1,$2,$3,$4,$5,$6,$7,true)`, v.ID, v.ReviewerID, v.RevieweeID, v.ProjectID, v.ContractID, v.Rating, v.Comment); e != nil {
		if isUniqueViolation(e) {
			return ErrReviewDuplicate
		}
		return e
	}
	if _, e = tx.ExecContext(c, `INSERT INTO notifications(id,user_id,type,title,message,entity_type,entity_id) VALUES($1,$2,'new_review','New review','You received a new review for a completed project.','review',$3)`, fmt.Sprintf("ntf_review_%s", v.ID), v.RevieweeID, v.ID); e != nil {
		return e
	}
	metadata, _ := json.Marshal(map[string]interface{}{
		"review_id":   v.ID,
		"rating":      v.Rating,
		"project_id":  v.ProjectID,
		"contract_id": v.ContractID,
	})
	if _, e = tx.ExecContext(c, `INSERT INTO activity_events(id,actor_id,entity_type,entity_id,action,description,metadata) VALUES($1,$2,'contract',$3,'review_created','A participant left a review for the completed project.',$4)`, fmt.Sprintf("act_review_%s", v.ID), v.ReviewerID, v.ContractID, metadata); e != nil {
		return e
	}
	if e = tx.Commit(); e != nil {
		return e
	}
	loaded, e := r.Get(c, v.ID)
	if e == nil {
		*v = *loaded
	}
	return nil
}

func (r *ReviewRepository) Eligibility(c context.Context, contract, user string) (string, bool, error) {
	_, reviewee, _, e := r.eligible(c, contract, user)
	if e != nil {
		return "", false, e
	}
	var exists bool
	e = r.db.QueryRowContext(c, `SELECT EXISTS(SELECT 1 FROM reviews WHERE contract_id=$1 AND reviewer_id=$2)`, contract, user).Scan(&exists)
	return reviewee, !exists, e
}

func (r *ReviewRepository) Trust(c context.Context, user string) (*models.TrustProfile, error) {
	p := &models.TrustProfile{Distribution: map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}
	e := r.db.QueryRowContext(c, `SELECT COALESCE(AVG(rating),0),COUNT(*),COUNT(*) FILTER(WHERE is_verified) FROM reviews WHERE reviewee_id=$1 AND deleted_at IS NULL`, user).Scan(&p.AverageRating, &p.RatingCount, &p.VerifiedReviewCount)
	if e != nil {
		return nil, e
	}
	rows, e := r.db.QueryContext(c, `SELECT rating,COUNT(*) FROM reviews WHERE reviewee_id=$1 AND deleted_at IS NULL GROUP BY rating`, user)
	if e == nil {
		defer rows.Close()
		for rows.Next() {
			var rating, count int
			_ = rows.Scan(&rating, &count)
			p.Distribution[rating] = count
		}
	}
	_ = r.db.QueryRowContext(c, `SELECT COUNT(*) FROM contracts WHERE (buyer_id=$1 OR freelancer_id=$1) AND status='completed'`, user).Scan(&p.CompletedProjects)
	var terminal int
	if r.db.QueryRowContext(c, `SELECT COUNT(*) FROM contracts WHERE (buyer_id=$1 OR freelancer_id=$1) AND status IN ('completed','cancelled','disputed')`, user).Scan(&terminal) == nil {
		p.CompletionRate = percentRate(p.CompletedProjects, terminal)
	}
	var repeated, counterparts int
	if r.db.QueryRowContext(c, `WITH counterparts AS (SELECT CASE WHEN freelancer_id=$1 THEN buyer_id ELSE freelancer_id END counterpart FROM contracts WHERE (buyer_id=$1 OR freelancer_id=$1) AND status='completed') SELECT COUNT(*),COUNT(*) FILTER (WHERE n >= 2) FROM (SELECT counterpart,COUNT(*) n FROM counterparts GROUP BY counterpart) x`, user).Scan(&counterparts, &repeated) == nil {
		p.RepeatClientRate = percentRate(repeated, counterparts)
	}
	var onTime, dated int
	if r.db.QueryRowContext(c, `SELECT COUNT(*) FILTER (WHERE m.completed_at <= m.due_date), COUNT(*) FROM milestones m INNER JOIN contracts c ON c.id = m.contract_id WHERE c.freelancer_id=$1 AND m.status='approved' AND m.due_date IS NOT NULL AND m.completed_at IS NOT NULL`, user).Scan(&onTime, &dated) == nil {
		p.OnTimeDeliveryRate = percentRate(onTime, dated)
	}
	var response *float64
	if r.db.QueryRowContext(c, `WITH ordered AS (SELECT m.conversation_id, m.sender_id, m.created_at, LAG(m.sender_id) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at, m.id) AS prev_sender, LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at, m.id) AS prev_at FROM messages m INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = $1) SELECT AVG(EXTRACT(EPOCH FROM (created_at - prev_at)) / 60.0) FROM ordered WHERE sender_id=$1 AND prev_sender IS NOT NULL AND prev_sender <> $1`, user).Scan(&response) == nil {
		p.ResponseTimeMinutes = response
	}
	p.GrowthTier = DetermineGrowthTier(p.CompletedProjects, p.RatingCount, p.AverageRating)
	return p, nil
}

func (r *ReviewRepository) Get(c context.Context, id string) (*models.ContractReview, error) {
	v := &models.ContractReview{}
	e := r.db.QueryRowContext(c, `SELECT id,reviewer_id,reviewee_id,project_id,contract_id,rating,comment,is_verified,created_at,updated_at FROM reviews WHERE id=$1 AND deleted_at IS NULL`, id).Scan(&v.ID, &v.ReviewerID, &v.RevieweeID, &v.ProjectID, &v.ContractID, &v.Rating, &v.Comment, &v.IsVerified, &v.CreatedAt, &v.UpdatedAt)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, ErrReviewNotFound
	}
	return v, e
}

func (r *ReviewRepository) List(c context.Context, u string, l, o int) ([]models.ContractReview, error) {
	rows, e := r.db.QueryContext(c, `SELECT id,reviewer_id,reviewee_id,project_id,contract_id,rating,comment,is_verified,created_at,updated_at FROM reviews WHERE reviewee_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3`, u, l, o)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []models.ContractReview{}
	for rows.Next() {
		v := models.ContractReview{}
		if e = rows.Scan(&v.ID, &v.ReviewerID, &v.RevieweeID, &v.ProjectID, &v.ContractID, &v.Rating, &v.Comment, &v.IsVerified, &v.CreatedAt, &v.UpdatedAt); e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *ReviewRepository) Update(c context.Context, id, u string, rating int, comment string) (*models.ContractReview, error) {
	v, e := r.Get(c, id)
	if e != nil {
		return nil, e
	}
	if v.ReviewerID != u {
		return nil, ErrReviewForbidden
	}
	_, e = r.db.ExecContext(c, `UPDATE reviews SET rating=$1,comment=$2,updated_at=NOW() WHERE id=$3 AND deleted_at IS NULL`, rating, comment, id)
	if e != nil {
		return nil, e
	}
	return r.Get(c, id)
}

func (r *ReviewRepository) Delete(c context.Context, id, u string) error {
	v, e := r.Get(c, id)
	if e != nil {
		return e
	}
	if v.ReviewerID != u {
		return ErrReviewForbidden
	}
	_, e = r.db.ExecContext(c, `UPDATE reviews SET deleted_at=$1,updated_at=$1 WHERE id=$2 AND deleted_at IS NULL`, time.Now().UTC(), id)
	return e
}
