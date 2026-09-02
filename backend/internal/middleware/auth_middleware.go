package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/handlers"
	"workstream-backend/internal/services"
)

// RequireAuth validates the JWT Bearer token in the Authorization header.
// On success, it injects user_id, email, and role into the Gin context.
// On failure, it aborts with 401 Unauthorized.
func RequireAuth(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			handlers.RespondError(c, http.StatusUnauthorized, "Authentication required", "No Authorization header provided")
			c.Abort()
			return
		}

		// Expect format: "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			handlers.RespondError(c, http.StatusUnauthorized, "Authentication required", "Invalid Authorization header format. Expected: Bearer <token>")
			c.Abort()
			return
		}

		tokenStr := strings.TrimSpace(parts[1])
		if tokenStr == "" {
			handlers.RespondError(c, http.StatusUnauthorized, "Authentication required", "Empty token provided")
			c.Abort()
			return
		}

		claims, err := authService.ValidateToken(tokenStr)
		if err != nil {
			if errors.Is(err, services.ErrInvalidToken) {
				handlers.RespondError(c, http.StatusUnauthorized, "Token invalid or expired", "Please log in again")
			} else {
				handlers.RespondError(c, http.StatusUnauthorized, "Authentication failed", err.Error())
			}
			c.Abort()
			return
		}

		// Inject claims into context for downstream handlers
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// RequireRole checks that the authenticated user has one of the permitted roles.
// Must be used AFTER RequireAuth in the middleware chain.
// Aborts with 403 Forbidden if the role does not match.
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(allowedRoles))
	for _, r := range allowedRoles {
		// Normalize: seller and freelancer are equivalent
		if strings.EqualFold(r, "freelancer") {
			allowed["seller"] = true
		}
		allowed[strings.ToLower(r)] = true
	}

	return func(c *gin.Context) {
		role := strings.ToLower(c.GetString("role"))
		if role == "" {
			handlers.RespondError(c, http.StatusForbidden, "Forbidden", "No role information in token")
			c.Abort()
			return
		}

		if !allowed[role] {
			handlers.RespondError(c, http.StatusForbidden, "Forbidden", "Your role does not have access to this resource")
			c.Abort()
			return
		}

		c.Next()
	}
}
