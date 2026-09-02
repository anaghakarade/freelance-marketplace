package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
)

// RespondJSON sends a JSON response with the given status code
func RespondJSON(c *gin.Context, status int, data interface{}) {
	c.JSON(status, data)
}

// RespondSuccess sends a 200 OK JSON response wrapped in APIResponse
func RespondSuccess(c *gin.Context, data interface{}, message ...string) {
	msg := "Success"
	if len(message) > 0 {
		msg = message[0]
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    data,
		Message: msg,
	})
}

// RespondError sends a formatted JSON error response
func RespondError(c *gin.Context, status int, message string, details ...string) {
	detailMsg := ""
	if len(details) > 0 {
		detailMsg = details[0]
	}
	c.JSON(status, models.APIErrorResponse{
		Error:   true,
		Message: message,
		Details: detailMsg,
	})
}
