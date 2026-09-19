package services

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

// Configurable weights for deterministic explainable matching
const (
	WeightSkill      = 0.40
	WeightTrust      = 0.20
	WeightRating     = 0.15
	WeightExperience = 0.15
	WeightBudget     = 0.10
)

// MatchingService defines operations for project-to-freelancer matching
type MatchingService interface {
	GetMatchesForProject(ctx context.Context, project *models.Project, page, limit int) (*models.ProjectMatchesResponse, error)
	ScoreFreelancer(project *models.Project, candidate models.FreelancerSearchResult) models.ProjectFreelancerMatch
}

type matchingService struct {
	freelancerRepo *repositories.FreelancerDiscoveryRepository
	reviewRepo     repositories.ReviewStore
}

func NewMatchingService(
	freelancerRepo *repositories.FreelancerDiscoveryRepository,
	reviewRepo repositories.ReviewStore,
) MatchingService {
	return &matchingService{
		freelancerRepo: freelancerRepo,
		reviewRepo:     reviewRepo,
	}
}

// ScoreFreelancer computes the deterministic explainable match score for a candidate
func (s *matchingService) ScoreFreelancer(project *models.Project, candidate models.FreelancerSearchResult) models.ProjectFreelancerMatch {
	// 1. Skill Score (40%)
	skillScore, matchedSkills, missingSkills := MatchSkills(project.Skills, candidate.User.Skills)

	// 2. Trust Score (20%) — Mapped from Phase 8 Trust Profile / Growth Tier
	trustScore := 40.0 // Default for New/Unrated
	switch strings.ToLower(candidate.GrowthTier) {
	case "elite":
		trustScore = 100.0
	case "top performer", "top rated":
		trustScore = 90.0
	case "trusted", "established":
		trustScore = 75.0
	case "rising":
		trustScore = 60.0
	default:
		trustScore = 40.0
	}

	// 3. Rating Score (15%)
	ratingScore := 60.0 // Baseline for unrated freelancers
	if candidate.AverageRating > 0 {
		ratingScore = math.Min(100.0, (candidate.AverageRating/5.0)*100.0)
	}

	// 4. Experience Score (15%)
	completedCount := candidate.Completed
	if completedCount == 0 && candidate.User.CompletedProjects > 0 {
		completedCount = candidate.User.CompletedProjects
	}
	experienceScore := math.Min(100.0, float64(completedCount*10))
	if completedCount == 0 {
		experienceScore = 30.0 // Entry level baseline
	}

	// 5. Budget Score (10%)
	budgetScore := 100.0
	var projectBudget float64
	if project.FixedBudget != nil && *project.FixedBudget > 0 {
		projectBudget = *project.FixedBudget
	} else if project.BudgetMax != nil && *project.BudgetMax > 0 {
		projectBudget = *project.BudgetMax
	}

	flRate := candidate.User.StartingPrice
	if projectBudget > 0 && flRate > 0 {
		if flRate <= projectBudget {
			budgetScore = 100.0
		} else if flRate <= projectBudget*1.25 {
			budgetScore = 80.0
		} else if flRate <= projectBudget*1.50 {
			budgetScore = 60.0
		} else {
			budgetScore = 40.0
		}
	}

	// Calculate Final Weighted Composite Score (0 - 100)
	rawFinal := (skillScore * WeightSkill) +
		(trustScore * WeightTrust) +
		(ratingScore * WeightRating) +
		(experienceScore * WeightExperience) +
		(budgetScore * WeightBudget)

	finalScore := int(math.Round(rawFinal))
	if finalScore > 100 {
		finalScore = 100
	} else if finalScore < 0 {
		finalScore = 0
	}

	// Generate Deterministic, Explainable Reasons
	var reasons []string
	if len(matchedSkills) > 0 {
		if len(missingSkills) == 0 && len(project.Skills) > 0 {
			reasons = append(reasons, fmt.Sprintf("Full match on all required skills (%s)", strings.Join(matchedSkills, ", ")))
		} else {
			reasons = append(reasons, fmt.Sprintf("Matched %d of %d skills (%s)", len(matchedSkills), len(project.Skills), strings.Join(matchedSkills, ", ")))
		}
	} else if len(project.Skills) == 0 {
		reasons = append(reasons, "Relevant domain expertise and profile match")
	}

	if candidate.GrowthTier != "" && candidate.GrowthTier != "New" {
		reasons = append(reasons, fmt.Sprintf("%s trust profile with verified track record", candidate.GrowthTier))
	}

	if candidate.AverageRating >= 4.5 {
		reasons = append(reasons, fmt.Sprintf("%.1f average rating across client reviews", candidate.AverageRating))
	}

	if completedCount > 0 {
		reasons = append(reasons, fmt.Sprintf("%d completed freelance contracts", completedCount))
	}

	if projectBudget > 0 && flRate > 0 && flRate <= projectBudget {
		reasons = append(reasons, "Starting rates fully align with project budget")
	}

	return models.ProjectFreelancerMatch{
		Freelancer: candidate,
		MatchScore: finalScore,
		Breakdown: models.MatchBreakdown{
			SkillMatch: math.Round(skillScore),
			Trust:      math.Round(trustScore),
			Rating:     math.Round(ratingScore),
			Experience: math.Round(experienceScore),
			Budget:     math.Round(budgetScore),
		},
		Reasons:       reasons,
		MatchedSkills: matchedSkills,
		MissingSkills: missingSkills,
	}
}

// GetMatchesForProject retrieves candidate talent, scores each candidate, and ranks them
func (s *matchingService) GetMatchesForProject(ctx context.Context, project *models.Project, page, limit int) (*models.ProjectMatchesResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	// 1. Retrieve candidates from repository
	// We query a broad pool of active freelancers (up to 100) to score and rank
	filter := repositories.FreelancerSearchFilter{
		Page:  1,
		Limit: 100,
	}
	if project.CategorySlug != "" {
		filter.Category = project.CategorySlug
	}

	candidates, _, err := s.freelancerRepo.Search(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve candidate freelancers: %w", err)
	}

	// If category-specific query had fewer than 5 candidates, query general talent pool
	if len(candidates) < 5 {
		broadFilter := repositories.FreelancerSearchFilter{
			Page:  1,
			Limit: 100,
		}
		broader, _, bErr := s.freelancerRepo.Search(ctx, broadFilter)
		if bErr == nil && len(broader) > len(candidates) {
			seen := make(map[string]bool)
			for _, c := range candidates {
				seen[c.User.ID] = true
			}
			for _, b := range broader {
				if !seen[b.User.ID] {
					candidates = append(candidates, b)
					seen[b.User.ID] = true
				}
			}
		}
	}

	// 2. Score each candidate
	var matches []models.ProjectFreelancerMatch
	for _, cand := range candidates {
		match := s.ScoreFreelancer(project, cand)
		matches = append(matches, match)
	}

	// 3. Rank candidates by MatchScore descending
	sort.Slice(matches, func(i, j int) bool {
		if matches[i].MatchScore != matches[j].MatchScore {
			return matches[i].MatchScore > matches[j].MatchScore
		}
		// Tie-breaker: AverageRating descending
		return matches[i].Freelancer.AverageRating > matches[j].Freelancer.AverageRating
	})

	total := len(matches)
	start := (page - 1) * limit
	end := start + limit

	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	pagedMatches := matches[start:end]

	return &models.ProjectMatchesResponse{
		ProjectID:   project.ID,
		ProjectName: project.Title,
		Matches:     pagedMatches,
		Total:       total,
		Page:        page,
		Limit:       limit,
	}, nil
}
