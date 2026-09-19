package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	ErrInvalidInteraction = errors.New("invalid interaction payload")
)

// RecommendationService defines logic for personalized discovery and engagement tracking
type RecommendationService interface {
	GetRecommendedServices(ctx context.Context, userID string, limit int) ([]models.Service, error)
	RecordInteraction(ctx context.Context, req models.RecordInteractionRequest, userID string) error
}

type recommendationService struct {
	repo repositories.RecommendationRepository
}

func NewRecommendationService(repo repositories.RecommendationRepository) RecommendationService {
	return &recommendationService{repo: repo}
}

func (s *recommendationService) GetRecommendedServices(ctx context.Context, userID string, limit int) ([]models.Service, error) {
	if limit <= 0 || limit > 50 {
		limit = 8
	}
	return s.repo.GetPersonalizedServices(ctx, userID, limit)
}

var validInteractionTypes = map[string]bool{
	"view":    true,
	"click":   true,
	"bookmark": true,
	"search":  true,
	"inquire": true,
}

var validTargetTypes = map[string]bool{
	"service":    true,
	"project":    true,
	"category":   true,
	"freelancer": true,
}

func (s *recommendationService) RecordInteraction(ctx context.Context, req models.RecordInteractionRequest, userID string) error {
	iType := strings.ToLower(strings.TrimSpace(req.InteractionType))
	tType := strings.ToLower(strings.TrimSpace(req.TargetType))
	tID := strings.TrimSpace(req.TargetID)

	if !validInteractionTypes[iType] || !validTargetTypes[tType] || tID == "" || len(tID) > 100 {
		return ErrInvalidInteraction
	}

	event := models.UserInteractionEvent{
		ID:              fmt.Sprintf("evt_%d", time.Now().UnixNano()),
		UserID:          userID,
		InteractionType: iType,
		TargetType:      tType,
		TargetID:        tID,
		Metadata:        req.Metadata,
		CreatedAt:       time.Now(),
	}

	return s.repo.RecordInteraction(ctx, event)
}
