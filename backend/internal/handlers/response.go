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

// RespondCreated sends a 201 Created JSON response wrapped in APIResponse
func RespondCreated(c *gin.Context, data interface{}, message ...string) {
	msg := "Resource created successfully"
	if len(message) > 0 {
		msg = message[0]
	}
	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    data,
		Message: msg,
	})
}

// RespondError sends a formatted JSON error response.
// For internal server errors (>= 500), raw diagnostic details are sanitized to prevent information disclosure.
func RespondError(c *gin.Context, status int, message string, details ...string) {
	detailMsg := ""
	if len(details) > 0 {
		detailMsg = details[0]
	}
	if status >= 500 {
		detailMsg = "An internal server error occurred. Please contact support if this continues."
	}
	c.JSON(status, models.APIErrorResponse{
		Success: false,
		Message: message,
		Details: detailMsg,
	})
}

// RespondValidationError sends a 400 Bad Request with field-level errors map
func RespondValidationError(c *gin.Context, message string, validationErrors map[string]string) {
	c.JSON(http.StatusBadRequest, models.APIErrorResponse{
		Success: false,
		Message: message,
		Errors:  validationErrors,
	})
}
