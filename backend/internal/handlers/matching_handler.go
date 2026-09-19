package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

type MatchingHandler struct {
	matchingService services.MatchingService
	projectRepo     repositories.ProjectRepository
}

func NewMatchingHandler(
	matchingService services.MatchingService,
	projectRepo repositories.ProjectRepository,
) *MatchingHandler {
	return &MatchingHandler{
		matchingService: matchingService,
		projectRepo:     projectRepo,
	}
}

// GetProjectMatches handles GET /api/projects/:id/matches
func (h *MatchingHandler) GetProjectMatches(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("role")
	if userID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	projectID := strings.TrimSpace(c.Param("id"))
	if projectID == "" {
		RespondError(c, http.StatusBadRequest, "Project ID is required")
		return
	}

	// 1. Retrieve project
	project, err := h.projectRepo.GetByID(c.Request.Context(), projectID)
	if err != nil {
		RespondError(c, http.StatusNotFound, "Project not found")
		return
	}

	// 2. Authorization check: Requester must be project owner (buyer) or admin
	if role != "admin" && project.BuyerID != userID {
		RespondError(c, http.StatusForbidden, "You are not authorized to view talent matches for this project")
		return
	}

	page := 1
	if v := c.Query("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}

	limit := 10
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}

	// 3. Compute and return matches
	matches, err := h.matchingService.GetMatchesForProject(c.Request.Context(), project, page, limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to compute talent matches: "+err.Error())
		return
	}

	RespondSuccess(c, matches)
}
