package services

import (
	"context"
	"errors"
	"testing"

	"workstream-backend/internal/models"
)

// ──────────────────────────────────────────────────────────────
// Mock recommendation repository
// ──────────────────────────────────────────────────────────────

type mockRecommendationRepo struct {
	interactionsRecorded []models.UserInteractionEvent
	services             []models.Service
}

func newMockRecommendationRepo(services []models.Service) *mockRecommendationRepo {
	return &mockRecommendationRepo{services: services}
}

func (m *mockRecommendationRepo) RecordInteraction(ctx context.Context, evt models.UserInteractionEvent) error {
	m.interactionsRecorded = append(m.interactionsRecorded, evt)
	return nil
}

func (m *mockRecommendationRepo) GetPersonalizedServices(ctx context.Context, userID string, limit int) ([]models.Service, error) {
	if limit > len(m.services) {
		return m.services, nil
	}
	return m.services[:limit], nil
}

// ──────────────────────────────────────────────────────────────
// RecordInteraction tests
// ──────────────────────────────────────────────────────────────

// TestRecommendation_RecordInteraction_Valid verifies that all valid interaction/target
// type combinations are accepted and the event is stored.
func TestRecommendation_RecordInteraction_Valid(t *testing.T) {
	validCombinations := []struct {
		iType  string
		tType  string
		tID    string
	}{
		{"view", "service", "svc_123"},
		{"click", "project", "prj_456"},
		{"bookmark", "freelancer", "usr_789"},
		{"search", "category", "cat_001"},
		{"inquire", "service", "svc_002"},
	}

	for _, c := range validCombinations {
		repo := newMockRecommendationRepo(nil)
		svc := NewRecommendationService(repo)
		ctx := context.Background()

		err := svc.RecordInteraction(ctx, models.RecordInteractionRequest{
			InteractionType: c.iType,
			TargetType:      c.tType,
			TargetID:        c.tID,
		}, "usr_buyer_1")

		if err != nil {
			t.Errorf("valid interaction (%s/%s) failed: %v", c.iType, c.tType, err)
		}
		if len(repo.interactionsRecorded) != 1 {
			t.Errorf("expected 1 event recorded, got %d", len(repo.interactionsRecorded))
		}
		evt := repo.interactionsRecorded[0]
		if evt.UserID != "usr_buyer_1" {
			t.Errorf("expected UserID=usr_buyer_1, got %q", evt.UserID)
		}
		if evt.InteractionType != c.iType {
			t.Errorf("expected InteractionType=%q, got %q", c.iType, evt.InteractionType)
		}
	}
}

// TestRecommendation_RecordInteraction_InvalidType verifies that unknown interaction
// types are rejected with ErrInvalidInteraction.
func TestRecommendation_RecordInteraction_InvalidType(t *testing.T) {
	// Note: uppercase types like "CLICK" are normalized to lowercase by the service,
	// so they are accepted. Only truly unknown type names should be tested here.
	invalidTypes := []string{"like", "share", "follow", "upvote", "", "  "}

	for _, iType := range invalidTypes {
		repo := newMockRecommendationRepo(nil)
		svc := NewRecommendationService(repo)
		ctx := context.Background()

		err := svc.RecordInteraction(ctx, models.RecordInteractionRequest{
			InteractionType: iType,
			TargetType:      "service",
			TargetID:        "svc_123",
		}, "usr_buyer_1")

		if !errors.Is(err, ErrInvalidInteraction) {
			t.Errorf("invalid interaction type %q: expected ErrInvalidInteraction, got: %v", iType, err)
		}
	}
}

// TestRecommendation_RecordInteraction_InvalidTargetType verifies unknown target types
// are rejected.
func TestRecommendation_RecordInteraction_InvalidTargetType(t *testing.T) {
	// Note: uppercase targets like "SERVICE" are normalized to lowercase, so they're valid.
	invalidTargets := []string{"order", "user", "proposal", ""}

	for _, tType := range invalidTargets {
		repo := newMockRecommendationRepo(nil)
		svc := NewRecommendationService(repo)
		ctx := context.Background()

		err := svc.RecordInteraction(ctx, models.RecordInteractionRequest{
			InteractionType: "view",
			TargetType:      tType,
			TargetID:        "svc_123",
		}, "usr_buyer_1")

		if !errors.Is(err, ErrInvalidInteraction) {
			t.Errorf("invalid target type %q: expected ErrInvalidInteraction, got: %v", tType, err)
		}
	}
}

// TestRecommendation_RecordInteraction_EmptyTargetID verifies that an empty target ID
// is rejected.
func TestRecommendation_RecordInteraction_EmptyTargetID(t *testing.T) {
	repo := newMockRecommendationRepo(nil)
	svc := NewRecommendationService(repo)
	ctx := context.Background()

	err := svc.RecordInteraction(ctx, models.RecordInteractionRequest{
		InteractionType: "view",
		TargetType:      "service",
		TargetID:        "",
	}, "usr_buyer_1")

	if !errors.Is(err, ErrInvalidInteraction) {
		t.Fatalf("empty TargetID: expected ErrInvalidInteraction, got: %v", err)
	}
}

// TestRecommendation_RecordInteraction_OversizedTargetID verifies that a target ID
// over 100 characters is rejected.
func TestRecommendation_RecordInteraction_OversizedTargetID(t *testing.T) {
	repo := newMockRecommendationRepo(nil)
	svc := NewRecommendationService(repo)
	ctx := context.Background()

	// 101-character string (must be > 100 to trigger the guard)
	bigID := "x" + "0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"
	if len(bigID) <= 100 {
		t.Fatalf("bigID construction error: length %d, need > 100", len(bigID))
	}

	err := svc.RecordInteraction(ctx, models.RecordInteractionRequest{
		InteractionType: "click",
		TargetType:      "service",
		TargetID:        bigID,
	}, "usr_buyer_1")

	if !errors.Is(err, ErrInvalidInteraction) {
		t.Fatalf("oversized TargetID: expected ErrInvalidInteraction, got: %v", err)
	}
}

// TestRecommendation_RecordInteraction_CaseInsensitive verifies that interaction types
// are normalized (case-insensitive acceptance after lowercasing).
func TestRecommendation_RecordInteraction_CaseInsensitive(t *testing.T) {
	// "VIEW" → normalized to "view" → valid
	repo := newMockRecommendationRepo(nil)
	svc := NewRecommendationService(repo)
	ctx := context.Background()

	err := svc.RecordInteraction(ctx, models.RecordInteractionRequest{
		InteractionType: "VIEW",
		TargetType:      "SERVICE",
		TargetID:        "svc_123",
	}, "usr_buyer_1")

	// Our implementation lowercases; "VIEW" → "view" (valid), "SERVICE" → "service" (valid)
	if err != nil {
		t.Fatalf("uppercase interaction type should be normalized and accepted, got: %v", err)
	}
}

// ──────────────────────────────────────────────────────────────
// GetRecommendedServices tests
// ──────────────────────────────────────────────────────────────

// TestRecommendation_GetRecommendedServices_LimitClamp verifies that limit=0 or negative
// is replaced with the default (8).
func TestRecommendation_GetRecommendedServices_LimitClamp(t *testing.T) {
	// Create 10 mock services
	var services []models.Service
	for i := 0; i < 10; i++ {
		services = append(services, models.Service{ID: "svc_" + string(rune('a'+i))})
	}

	repo := newMockRecommendationRepo(services)
	svc := NewRecommendationService(repo)
	ctx := context.Background()

	// limit=0 → default 8
	result, err := svc.GetRecommendedServices(ctx, "usr_1", 0)
	if err != nil {
		t.Fatalf("GetRecommendedServices failed: %v", err)
	}
	if len(result) != 8 {
		t.Errorf("expected 8 services (default limit), got %d", len(result))
	}

	// negative limit → default 8
	result2, err := svc.GetRecommendedServices(ctx, "usr_1", -5)
	if err != nil {
		t.Fatalf("GetRecommendedServices with negative limit failed: %v", err)
	}
	if len(result2) != 8 {
		t.Errorf("expected 8 services for negative limit, got %d", len(result2))
	}
}

// TestRecommendation_GetRecommendedServices_ExcessiveLimit verifies that limit > 50
// is replaced with the default (8).
func TestRecommendation_GetRecommendedServices_ExcessiveLimit(t *testing.T) {
	var services []models.Service
	for i := 0; i < 60; i++ {
		services = append(services, models.Service{ID: "svc_overflow"})
	}

	repo := newMockRecommendationRepo(services)
	svc := NewRecommendationService(repo)
	ctx := context.Background()

	result, err := svc.GetRecommendedServices(ctx, "usr_1", 200)
	if err != nil {
		t.Fatalf("GetRecommendedServices failed: %v", err)
	}
	// Limit > 50 → default 8
	if len(result) != 8 {
		t.Errorf("expected 8 services (clamped from 200), got %d", len(result))
	}
}

// TestRecommendation_GetRecommendedServices_ValidLimit verifies that a valid limit
// is honored as-is.
func TestRecommendation_GetRecommendedServices_ValidLimit(t *testing.T) {
	var services []models.Service
	for i := 0; i < 20; i++ {
		services = append(services, models.Service{ID: "svc_valid"})
	}

	repo := newMockRecommendationRepo(services)
	svc := NewRecommendationService(repo)
	ctx := context.Background()

	result, err := svc.GetRecommendedServices(ctx, "usr_1", 5)
	if err != nil {
		t.Fatalf("GetRecommendedServices failed: %v", err)
	}
	if len(result) != 5 {
		t.Errorf("expected 5 services, got %d", len(result))
	}
}
