package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthChecker allows pinging backend dependencies like PostgreSQL
type HealthChecker interface {
	PingContext(ctx context.Context) error
}

// HealthHandler handles system health status checks
type HealthHandler struct {
	checker HealthChecker
}

// NewHealthHandler creates a new HealthHandler with an optional HealthChecker
func NewHealthHandler(checkers ...HealthChecker) *HealthHandler {
	var checker HealthChecker
	if len(checkers) > 0 {
		checker = checkers[0]
	}
	return &HealthHandler{checker: checker}
}

// CheckHealth returns system status distinguishing application liveness and database readiness
// GET /api/health
func (h *HealthHandler) CheckHealth(c *gin.Context) {
	dbStatus := "connected"
	overallStatus := "ok"
	message := "WorkStream API is running"

	if h.checker != nil {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := h.checker.PingContext(ctx); err != nil {
			dbStatus = "disconnected"
			overallStatus = "degraded"
			message = "WorkStream API is running (database unavailable)"
		}
	} else {
		dbStatus = "unconfigured"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   overallStatus,
		"message":  message,
		"database": dbStatus,
	})
}
