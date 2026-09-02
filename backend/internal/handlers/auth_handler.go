package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

// AuthHandler handles all /api/auth/* routes
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles POST /api/auth/register
// Creates a new buyer or seller account. Admin registration is rejected.
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	resp, err := h.authService.Register(&req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAdminRegistration):
			RespondError(c, http.StatusBadRequest, "Registration not allowed", err.Error())
		case errors.Is(err, repositories.ErrEmailAlreadyExists):
			RespondError(c, http.StatusConflict, "Email already registered", "An account with this email address already exists")
		default:
			RespondError(c, http.StatusBadRequest, "Registration failed", err.Error())
		}
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Account created successfully",
		Data:    resp,
	})
}

// Login handles POST /api/auth/login
// Validates credentials and returns a signed JWT on success.
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	resp, err := h.authService.Login(&req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidCredentials):
			RespondError(c, http.StatusUnauthorized, "Invalid credentials", "The email or password you entered is incorrect")
		case errors.Is(err, services.ErrAccountSuspended):
			RespondError(c, http.StatusForbidden, "Account suspended", err.Error())
		case errors.Is(err, services.ErrAccountInactive):
			RespondError(c, http.StatusForbidden, "Account inactive", err.Error())
		default:
			RespondError(c, http.StatusInternalServerError, "Login failed", err.Error())
		}
		return
	}

	RespondSuccess(c, resp, "Login successful")
}

// Me handles GET /api/auth/me
// Returns the currently authenticated user's profile.
// Requires RequireAuth middleware to be applied to this route.
func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required", "No user context in request")
		return
	}

	user, err := h.authService.GetCurrentUser(userID)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			RespondError(c, http.StatusNotFound, "User not found", "The authenticated user no longer exists")
		} else {
			RespondError(c, http.StatusInternalServerError, "Failed to fetch user", err.Error())
		}
		return
	}

	RespondSuccess(c, user, "User profile retrieved")
}

// Logout handles POST /api/auth/logout
// Server-side logout is a no-op for stateless JWT auth.
// The client must discard the token on its side.
func (h *AuthHandler) Logout(c *gin.Context) {
	// Stateless JWT: no server-side session to invalidate.
	// Client is responsible for clearing the token from storage.
	RespondSuccess(c, gin.H{"message": "Logged out successfully"}, "Logged out")
}
