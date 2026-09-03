package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/middleware"
	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupTestRouter(authService *services.AuthService) *gin.Engine {
	r := gin.New()

	// Protected route
	protected := r.Group("/protected")
	protected.Use(middleware.RequireAuth(authService))
	{
		protected.GET("/user", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"userId": c.GetString("user_id"),
				"email":  c.GetString("email"),
				"role":   c.GetString("role"),
			})
		})

		// Admin only
		adminOnly := protected.Group("/admin")
		adminOnly.Use(middleware.RequireRole("admin"))
		{
			adminOnly.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"access": "admin_granted"})
			})
		}

		// Seller / Freelancer only
		sellerOnly := protected.Group("/seller")
		sellerOnly.Use(middleware.RequireRole("seller"))
		{
			sellerOnly.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"access": "seller_granted"})
			})
		}
	}

	return r
}

func TestRequireAuth_MissingHeader(t *testing.T) {
	authService := services.NewAuthService(nil, "testsecret1234567890123456789012", 24)
	router := setupTestRouter(authService)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/protected/user", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("Expected 401 Unauthorized for missing auth header, got %d", w.Code)
	}
}

func TestRequireAuth_ValidToken(t *testing.T) {
	authService := services.NewAuthService(nil, "testsecret1234567890123456789012", 24)
	router := setupTestRouter(authService)

	user := &models.User{
		ID:    "usr_buyer_1",
		Email: "buyer@workstream.io",
		Role:  "buyer",
	}
	token, err := authService.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/protected/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK with valid token, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestRequireRole_AdminAccess(t *testing.T) {
	authService := services.NewAuthService(nil, "testsecret1234567890123456789012", 24)
	router := setupTestRouter(authService)

	buyer := &models.User{ID: "usr_b", Email: "b@w.io", Role: "buyer"}
	admin := &models.User{ID: "usr_a", Email: "a@w.io", Role: "admin"}

	buyerToken, _ := authService.GenerateToken(buyer)
	adminToken, _ := authService.GenerateToken(admin)

	// Buyer accessing admin endpoint should get 403
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/protected/admin/dashboard", nil)
	req1.Header.Set("Authorization", "Bearer "+buyerToken)
	router.ServeHTTP(w1, req1)
	if w1.Code != http.StatusForbidden {
		t.Fatalf("Expected 403 Forbidden for buyer accessing admin endpoint, got %d", w1.Code)
	}

	// Admin accessing admin endpoint should get 200
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/protected/admin/dashboard", nil)
	req2.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for admin accessing admin endpoint, got %d", w2.Code)
	}
}

func TestRequireRole_FreelancerAliasSupport(t *testing.T) {
	authService := services.NewAuthService(nil, "testsecret1234567890123456789012", 24)
	router := setupTestRouter(authService)

	// User created with role "seller"
	seller := &models.User{ID: "usr_s", Email: "s@w.io", Role: "seller"}
	sellerToken, _ := authService.GenerateToken(seller)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/protected/seller/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+sellerToken)
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for seller accessing seller endpoint, got %d", w.Code)
	}
}
