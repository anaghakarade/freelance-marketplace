package routes

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"workstream-backend/internal/config"
	"workstream-backend/internal/handlers"
	"workstream-backend/internal/middleware"
	"workstream-backend/internal/services"
)

// SetupRouter initializes the Gin router, middleware, and route groupings
func SetupRouter(
	cfg *config.Config,
	healthHandler *handlers.HealthHandler,
	categoryHandler *handlers.CategoryHandler,
	serviceHandler *handlers.ServiceHandler,
	authHandler *handlers.AuthHandler,
	authService *services.AuthService,
) *gin.Engine {
	router := gin.New()

	// Standard Gin middlewares
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Environment-driven CORS configuration
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORSAllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// API Route Group
	api := router.Group("/api")
	{
		// Health Check
		api.GET("/health", healthHandler.CheckHealth)

		// ─── Auth Routes ──────────────────────────────────────────────────────
		auth := api.Group("/auth")
		{
			// Public routes (no authentication required)
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout) // stateless; client clears token

			// Protected route (requires valid JWT)
			auth.GET("/me", middleware.RequireAuth(authService), authHandler.Me)
		}

		// ─── Categories ───────────────────────────────────────────────────────
		categories := api.Group("/categories")
		{
			categories.GET("", categoryHandler.GetAll)
			categories.GET("/:slug", categoryHandler.GetBySlug)
			categories.GET("/:slug/subcategories", categoryHandler.GetSubcategories)
		}

		// ─── Services ─────────────────────────────────────────────────────────
		services := api.Group("/services")
		{
			services.GET("", serviceHandler.GetAll)
			services.GET("/:id", serviceHandler.GetByID)
		}
	}

	return router
}
