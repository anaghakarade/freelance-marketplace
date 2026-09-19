package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

// RecommendationRepository defines queries for personalized discovery and interaction tracking
type RecommendationRepository interface {
	GetPersonalizedServices(ctx context.Context, userID string, limit int) ([]models.Service, error)
	RecordInteraction(ctx context.Context, event models.UserInteractionEvent) error
}

type recommendationRepository struct {
	db *database.DBWrapper
}

func NewRecommendationRepository(db *database.DBWrapper) RecommendationRepository {
	return &recommendationRepository{db: db}
}

// RecordInteraction logs an explicit interaction signal to user_interactions
func (r *recommendationRepository) RecordInteraction(ctx context.Context, event models.UserInteractionEvent) error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}

	if event.ID == "" {
		event.ID = fmt.Sprintf("evt_%d", time.Now().UnixNano())
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}

	metadataBytes, err := json.Marshal(event.Metadata)
	if err != nil {
		metadataBytes = []byte("{}")
	}

	query := `
		INSERT INTO user_interactions (id, user_id, interaction_type, target_type, target_id, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err = r.db.ExecContext(ctx, query,
		event.ID, event.UserID, event.InteractionType, event.TargetType, event.TargetID, metadataBytes, event.CreatedAt,
	)
	return err
}

// GetPersonalizedServices returns services based on user interaction signals or deterministic popularity
func (r *recommendationRepository) GetPersonalizedServices(ctx context.Context, userID string, limit int) ([]models.Service, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, ErrDatabaseUnavailable
	}

	if limit <= 0 || limit > 50 {
		limit = 8
	}

	var interactedCategories []string

	// If authenticated, discover categories from user_interactions and previous contracts
	if userID != "" {
		categoryQuery := `
			SELECT DISTINCT s.category_slug
			FROM user_interactions ui
			JOIN services s ON ui.target_id = s.id
			WHERE ui.user_id = $1 AND ui.target_type = 'service'
			ORDER BY s.category_slug
			LIMIT 5
		`
		rows, err := r.db.QueryContext(ctx, categoryQuery, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var slug string
				if err := rows.Scan(&slug); err == nil && slug != "" {
					interactedCategories = append(interactedCategories, slug)
				}
			}
		}

		// Also check contracts buyer was involved in
		if len(interactedCategories) == 0 {
			contractCatQuery := `
				SELECT DISTINCT p.category_id
				FROM contracts c
				JOIN projects p ON c.project_id = p.id
				WHERE c.buyer_id = $1
				LIMIT 3
			`
			cRows, cErr := r.db.QueryContext(ctx, contractCatQuery, userID)
			if cErr == nil {
				defer cRows.Close()
				for cRows.Next() {
					var catID string
					if err := cRows.Scan(&catID); err == nil && catID != "" {
						interactedCategories = append(interactedCategories, catID)
					}
				}
			}
		}
	}

	// Build query
	var query string
	var args []interface{}

	if len(interactedCategories) > 0 {
		// Category-aligned recommendations
		query = fmt.Sprintf(`
			SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
			       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
			       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images, s.description, s.tags,
			       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
			       s.order_count, s.created_at, s.updated_at, s.published_at,
			       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
			       COALESCE(u.role, ''), COALESCE(u.avatar, ''), COALESCE(u.title, '')
			FROM services s
			LEFT JOIN users u ON s.seller_id = u.id
			WHERE s.status = 'published' AND (s.category_slug = ANY($1) OR s.category_id = ANY($1))
			ORDER BY s.rating DESC, s.order_count DESC, s.is_featured DESC
			LIMIT $2
		`)
		args = []interface{}{interactedCategories, limit}
	} else {
		// Non-personalized fallback: Featured + highest rated + trending
		query = `
			SELECT s.id, s.title, s.slug, s.seller_id, s.category_id, s.category_slug,
			       s.subcategory_id, s.subcategory_slug, s.tag_ids, s.status, s.is_featured,
			       s.is_trending, COALESCE(s.views_count, 0), s.cover_image, s.gallery_images, s.description, s.tags,
			       s.starting_price, s.currency, s.delivery_days, s.rating, s.review_count,
			       s.order_count, s.created_at, s.updated_at, s.published_at,
			       COALESCE(u.id, ''), COALESCE(u.name, ''), COALESCE(u.email, ''),
			       COALESCE(u.role, ''), COALESCE(u.avatar, ''), COALESCE(u.title, '')
			FROM services s
			LEFT JOIN users u ON s.seller_id = u.id
			WHERE s.status = 'published'
			ORDER BY s.is_featured DESC, s.rating DESC, s.order_count DESC, s.views_count DESC
			LIMIT $1
		`
		args = []interface{}{limit}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error querying recommendations: %w", err)
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		var u models.User
		var tagIDsJSON, galleryJSON, tagsJSON string

		err := rows.Scan(
			&s.ID, &s.Title, &s.Slug, &s.SellerID, &s.CategoryID, &s.CategorySlug,
			&s.SubcategoryID, &s.SubcategorySlug, &tagIDsJSON, &s.Status, &s.IsFeatured,
			&s.IsTrending, &s.ViewsCount, &s.CoverImage, &galleryJSON, &s.Description, &tagsJSON,
			&s.StartingPrice, &s.Currency, &s.DeliveryDays, &s.Rating, &s.ReviewCount,
			&s.OrderCount, &s.CreatedAt, &s.UpdatedAt, &s.PublishedAt,
			&u.ID, &u.Name, &u.Email, &u.Role, &u.Avatar, &u.Title,
		)
		if err != nil {
			return nil, fmt.Errorf("scan recommendation row error: %w", err)
		}

		_ = json.Unmarshal([]byte(tagIDsJSON), &s.TagIDs)
		_ = json.Unmarshal([]byte(galleryJSON), &s.GalleryImages)
		_ = json.Unmarshal([]byte(tagsJSON), &s.Tags)
		s.Seller = &u

		services = append(services, s)
	}

	return services, rows.Err()
}

var _ = sql.ErrNoRows
