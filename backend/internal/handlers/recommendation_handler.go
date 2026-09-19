package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

type RecommendationHandler struct {
	recommendationService services.RecommendationService
}

func NewRecommendationHandler(recommendationService services.RecommendationService) *RecommendationHandler {
	return &RecommendationHandler{recommendationService: recommendationService}
}

// GetRecommendedServices handles GET /api/recommendations/services
func (h *RecommendationHandler) GetRecommendedServices(c *gin.Context) {
	userID := c.GetString("user_id")

	limit := 8
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}

	services, err := h.recommendationService.GetRecommendedServices(c.Request.Context(), userID, limit)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to load recommendations: "+err.Error())
		return
	}

	RespondSuccess(c, gin.H{
		"services": services,
		"limit":    limit,
	})
}

// RecordInteraction handles POST /api/recommendations/events
func (h *RecommendationHandler) RecordInteraction(c *gin.Context) {
	var req models.RecordInteractionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid interaction payload: "+err.Error())
		return
	}

	userID := c.GetString("user_id")

	if err := h.recommendationService.RecordInteraction(c.Request.Context(), req, userID); err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to record interaction: "+err.Error())
		return
	}

	RespondSuccess(c, gin.H{
		"recorded": true,
	})
}
