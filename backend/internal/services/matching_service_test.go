package services_test

import (
	"context"
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

func TestSkillNormalization(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"React.js", "react"},
		{"ReactJS", "react"},
		{"react js", "react"},
		{"Node.js", "node"},
		{"NodeJS", "node"},
		{"TypeScript.js", "typescript"},
		{"TS", "typescript"},
		{"Golang", "go"},
		{"Go Lang", "go"},
		{"Postgres", "postgresql"},
		{"PostgreSQL", "postgresql"},
		{"UI/UX", "ui/ux"},
		{"UI-UX", "ui/ux"},
		{"Three.js", "three.js"},
		{"ThreeJS", "three.js"},
		{"Tailwind CSS", "tailwindcss"},
	}

	for _, tt := range tests {
		normalized := services.NormalizeSkill(tt.input)
		if normalized != tt.expected {
			t.Errorf("NormalizeSkill(%q) = %q; expected %q", tt.input, normalized, tt.expected)
		}
	}
}

func TestSkillMatching(t *testing.T) {
	required := []string{"React", "TypeScript", "Node.js", "GraphQL"}
	candidateSkills := []string{"React.js", "TS", "PostgreSQL"}

	score, matched, missing := services.MatchSkills(required, candidateSkills)

	// React and TypeScript should match (2 out of 4 = 50%)
	if score != 50.0 {
		t.Errorf("expected score 50.0, got %f", score)
	}
	if len(matched) != 2 {
		t.Errorf("expected 2 matched skills, got %d (%v)", len(matched), matched)
	}
	if len(missing) != 2 {
		t.Errorf("expected 2 missing skills, got %d (%v)", len(missing), missing)
	}

	// Test zero match
	zeroScore, zeroMatched, zeroMissing := services.MatchSkills(required, []string{"Python", "Django"})
	if zeroScore != 0.0 || len(zeroMatched) != 0 || len(zeroMissing) != 4 {
		t.Errorf("expected zero match, got score %f, matched %v", zeroScore, zeroMatched)
	}

	// Test full match
	fullCandidate := []string{"React", "TypeScript", "Node.js", "GraphQL", "AWS"}
	fullScore, fullMatched, fullMissing := services.MatchSkills(required, fullCandidate)
	if fullScore != 100.0 || len(fullMatched) != 4 || len(fullMissing) != 0 {
		t.Errorf("expected 100%% match, got score %f, matched %v", fullScore, fullMatched)
	}
}

func TestMatchScoring_Deterministic(t *testing.T) {
	budget := 1500.0
	project := &models.Project{
		ID:          "proj_test_1",
		BuyerID:     "usr_buyer_1",
		Title:       "Full-Stack Web App",
		Skills:      []string{"React", "Node.js", "PostgreSQL"},
		FixedBudget: &budget,
	}

	candidate := models.FreelancerSearchResult{
		User: models.User{
			ID:            "usr_fl_1",
			Name:          "Alice Dev",
			Skills:        []string{"React.js", "NodeJS", "Postgres"},
			StartingPrice: 1200.0, // under budget -> budgetScore = 100
		},
		GrowthTier:    "Top Performer", // trustScore = 90
		AverageRating: 5.0,             // ratingScore = 100
		RatingCount:   12,
		Completed:     10, // experienceScore = 100
	}

	matchingSvc := services.NewMatchingService(nil, nil)

	// Run 5 times to verify determinism
	var firstScore int
	for i := 0; i < 5; i++ {
		match := matchingSvc.ScoreFreelancer(project, candidate)

		// Expected breakdown:
		// skill: 100 * 0.40 = 40
		// trust: 90 * 0.20 = 18
		// rating: 100 * 0.15 = 15
		// experience: 100 * 0.15 = 15
		// budget: 100 * 0.10 = 10
		// Total: 40 + 18 + 15 + 15 + 10 = 98
		if i == 0 {
			firstScore = match.MatchScore
			if match.MatchScore != 98 {
				t.Errorf("expected score 98, got %d (breakdown: %+v)", match.MatchScore, match.Breakdown)
			}
			if len(match.Reasons) == 0 {
				t.Errorf("expected explainable reasons, got empty array")
			}
			if len(match.MatchedSkills) != 3 {
				t.Errorf("expected 3 matched skills, got %d", len(match.MatchedSkills))
			}
		} else {
			if match.MatchScore != firstScore {
				t.Errorf("non-deterministic score on iteration %d: got %d, want %d", i, match.MatchScore, firstScore)
			}
		}
	}
}

func TestTrustTierMapping(t *testing.T) {
	matchingSvc := services.NewMatchingService(nil, nil)
	project := &models.Project{Title: "Design Task"}

	tiers := map[string]float64{
		"Elite":         100.0,
		"Top Performer": 90.0,
		"Trusted":       75.0,
		"Rising":        60.0,
		"New":           40.0,
	}

	for tier, expectedTrust := range tiers {
		cand := models.FreelancerSearchResult{
			User:       models.User{ID: "u1"},
			GrowthTier: tier,
		}
		match := matchingSvc.ScoreFreelancer(project, cand)
		if match.Breakdown.Trust != expectedTrust {
			t.Errorf("for tier %q, expected trust %f, got %f", tier, expectedTrust, match.Breakdown.Trust)
		}
	}
}

func TestBudgetCompatibility(t *testing.T) {
	matchingSvc := services.NewMatchingService(nil, nil)
	budget := 1000.0
	project := &models.Project{
		FixedBudget: &budget,
	}

	// 1. Within budget ($900 <= $1000) -> 100
	c1 := matchingSvc.ScoreFreelancer(project, models.FreelancerSearchResult{User: models.User{StartingPrice: 900}})
	if c1.Breakdown.Budget != 100.0 {
		t.Errorf("expected budget score 100 for <= budget, got %f", c1.Breakdown.Budget)
	}

	// 2. Slightly above budget ($1200 <= $1250) -> 80
	c2 := matchingSvc.ScoreFreelancer(project, models.FreelancerSearchResult{User: models.User{StartingPrice: 1200}})
	if c2.Breakdown.Budget != 80.0 {
		t.Errorf("expected budget score 80 for within 25%%, got %f", c2.Breakdown.Budget)
	}

	// 3. Moderately above ($1400 <= $1500) -> 60
	c3 := matchingSvc.ScoreFreelancer(project, models.FreelancerSearchResult{User: models.User{StartingPrice: 1400}})
	if c3.Breakdown.Budget != 60.0 {
		t.Errorf("expected budget score 60 for within 50%%, got %f", c3.Breakdown.Budget)
	}

	// 4. Well above ($2000 > $1500) -> 40
	c4 := matchingSvc.ScoreFreelancer(project, models.FreelancerSearchResult{User: models.User{StartingPrice: 2000}})
	if c4.Breakdown.Budget != 40.0 {
		t.Errorf("expected budget score 40 for > 50%% over budget, got %f", c4.Breakdown.Budget)
	}
}

var _ = time.Now
var _ = context.Background
