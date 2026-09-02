package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthHandler handles system health status checks
type HealthHandler struct{}

// NewHealthHandler creates a new HealthHandler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// CheckHealth returns system status
// GET /api/health
func (h *HealthHandler) CheckHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "WorkStream API is running",
	})
}
