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
	projectHandler *handlers.ProjectHandler,
	proposalHandler *handlers.ProposalHandler,
	contractHandler *handlers.ContractHandler,
	paymentHandler *handlers.PaymentHandler,
	communicationHandler *handlers.CommunicationHandler,
	reviewHandler *handlers.ReviewHandler,
	freelancerDiscoveryHandler *handlers.FreelancerDiscoveryHandler,
	adminHandler *handlers.AdminHandler,
	searchHandler *handlers.SearchHandler,
	matchingHandler *handlers.MatchingHandler,
	recommendationHandler *handlers.RecommendationHandler,
) *gin.Engine {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()

	// Standard Gin middlewares
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Phase 11: Security Headers & Request Body Limits
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.RequestBodyLimit(2 * 1024 * 1024)) // 2MB max request body

	// Environment-driven CORS configuration
	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	hasWildcard := false
	for _, o := range cfg.CORSAllowedOrigins {
		if o == "*" {
			hasWildcard = true
			break
		}
	}

	if hasWildcard || len(cfg.CORSAllowedOrigins) == 0 {
		corsConfig.AllowOriginFunc = func(origin string) bool { return true }
	} else {
		corsConfig.AllowOriginFunc = func(origin string) bool {
			for _, allowed := range cfg.CORSAllowedOrigins {
				if allowed == origin {
					return true
				}
			}
			// Automatically allow Render deployments and local dev
			return strings.HasSuffix(origin, ".onrender.com") ||
				strings.HasPrefix(origin, "http://localhost:") ||
				strings.HasPrefix(origin, "http://127.0.0.1:")
		}
	}
	router.Use(cors.New(corsConfig))

	// Phase 11: Rate Limiters for sensitive endpoints
	authLimiter := middleware.NewRateLimiter(60, 20)      // 60 req/min, burst 20
	reportLimiter := middleware.NewRateLimiter(30, 10)    // 30 req/min, burst 10
	eventLimiter := middleware.NewRateLimiter(120, 40)    // 120 req/min, burst 40

	// API Route Group
	api := router.Group("/api")
	{
		// Health Check
		api.GET("/health", healthHandler.CheckHealth)

		// ─── Auth Routes ──────────────────────────────────────────────────────
		auth := api.Group("/auth")
		{
			auth.POST("/register", authLimiter.Limit(), authHandler.Register)
			auth.POST("/login", authLimiter.Limit(), authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
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
		servicesGroup := api.Group("/services")
		{
			servicesGroup.GET("", serviceHandler.GetAll)
			servicesGroup.GET("/:id", serviceHandler.GetByID)

			// Seller / Admin Operations on Services
			sellerServices := servicesGroup.Group("", middleware.RequireAuth(authService), middleware.RequireRole("seller", "freelancer", "admin"))
			{
				sellerServices.POST("", serviceHandler.Create)
				sellerServices.PATCH("/:id", serviceHandler.Update)
				sellerServices.POST("/:id/publish", serviceHandler.Publish)
				sellerServices.POST("/:id/archive", serviceHandler.Archive)
				sellerServices.DELETE("/:id", serviceHandler.Delete)
			}
		}

		// ─── Seller Dedicated Endpoints ──────────────────────────────────────
		sellerGroup := api.Group("/seller", middleware.RequireAuth(authService), middleware.RequireRole("seller", "freelancer", "admin"))
		{
			sellerGroup.GET("/services", serviceHandler.GetMyServices)
		}

		// ─── Buyer Projects (Phase 5) ─────────────────────────────────────────
		api.GET("/projects", middleware.OptionalAuth(authService), projectHandler.GetAll)
		api.GET("/projects/:id", middleware.OptionalAuth(authService), projectHandler.GetByID)
		api.GET("/freelancers", freelancerDiscoveryHandler.Search)

		buyerProjects := api.Group("/projects", middleware.RequireAuth(authService), middleware.RequireRole("buyer", "admin"))
		{
			buyerProjects.POST("", projectHandler.Create)
			buyerProjects.GET("/my", projectHandler.GetMyProjects)
			buyerProjects.PUT("/:id", projectHandler.Update)
			buyerProjects.PATCH("/:id/status", projectHandler.UpdateStatus)
			buyerProjects.DELETE("/:id", projectHandler.Delete)
			buyerProjects.GET("/:id/proposals", proposalHandler.GetProjectProposals)
		}

		buyerProposals := api.Group("/proposals", middleware.RequireAuth(authService), middleware.RequireRole("buyer", "admin"))
		{
			buyerProposals.PATCH("/:id/shortlist", proposalHandler.Shortlist)
			buyerProposals.PATCH("/:id/reject", proposalHandler.Reject)
			buyerProposals.PATCH("/:id/accept", proposalHandler.Accept)
		}

		freelancerProposals := api.Group("", middleware.RequireAuth(authService), middleware.RequireRole("freelancer", "seller", "admin"))
		{
			freelancerProposals.POST("/projects/:id/proposals", proposalHandler.Create)
			freelancerProposals.GET("/proposals/my", proposalHandler.GetMyProposals)
			freelancerProposals.DELETE("/proposals/:id", proposalHandler.Withdraw)
		}

		// ─── Contracts & Milestones (Phase 6A/6B) ─────────────────────────────
		contracts := api.Group("", middleware.RequireAuth(authService))
		{
			contracts.GET("/contracts", contractHandler.GetContracts)
			contracts.GET("/contracts/:id", contractHandler.GetContractByID)
			contracts.GET("/projects/:id/contract", contractHandler.GetProjectContract)
			contracts.POST("/contracts/:id/milestones", contractHandler.CreateMilestone)
			contracts.GET("/contracts/:id/milestones", contractHandler.GetMilestones)
			contracts.GET("/milestones/:id", contractHandler.GetMilestoneByID)
			contracts.PATCH("/milestones/:id", contractHandler.UpdateMilestone)
			contracts.POST("/milestones/:id/start", contractHandler.StartMilestone)
			contracts.POST("/milestones/:id/submissions", contractHandler.SubmitMilestone)
			contracts.POST("/milestones/:id/approve", contractHandler.ApproveMilestone)
			contracts.POST("/milestones/:id/request-revision", contractHandler.RequestRevision)
			contracts.GET("/milestones/:id/submissions", contractHandler.GetSubmissions)
			contracts.POST("/milestones/:id/fund", paymentHandler.Fund)
			contracts.POST("/payments/:id/release", paymentHandler.Release)
			contracts.POST("/payments/:id/refund", paymentHandler.Refund)
			contracts.GET("/payments/:id", paymentHandler.Get)
			contracts.GET("/contracts/:id/payments", paymentHandler.ByContract)
			contracts.GET("/milestones/:id/payment", paymentHandler.ByMilestone)
			contracts.GET("/me/payments", paymentHandler.Mine)
			contracts.GET("/me/earnings", paymentHandler.Earnings)
			contracts.GET("/me/wallet", paymentHandler.Wallet)
			contracts.GET("/me/ledger", paymentHandler.Ledger)
		}

		// ─── Communication (Phase 7) ──────────────────────────────────────────
		communication := api.Group("", middleware.RequireAuth(authService))
		{
			communication.GET("/notifications", communicationHandler.Notifications)
			communication.PATCH("/notifications/:id/read", communicationHandler.MarkRead)
			communication.POST("/notifications/read-all", communicationHandler.MarkAllRead)
			communication.GET("/conversations", communicationHandler.ListConversations)
			communication.POST("/conversations", communicationHandler.CreateConversation)
			communication.GET("/conversations/:id", communicationHandler.Conversation)
			communication.GET("/conversations/:id/messages", communicationHandler.Messages)
			communication.POST("/conversations/:id/messages", communicationHandler.SendMessage)
			communication.PATCH("/conversations/:id/messages/read", communicationHandler.MarkMessagesRead)
			communication.GET("/projects/:id/activity", communicationHandler.Activity("project"))
			communication.GET("/contracts/:id/activity", communicationHandler.Activity("contract"))
			communication.GET("/milestones/:id/activity", communicationHandler.Activity("milestone"))
		}

		// ─── Reviews & Trust (Phase 8) ────────────────────────────────────────
		reviews := api.Group("", middleware.RequireAuth(authService))
		{
			reviews.POST("/reviews", reviewHandler.Create)
			reviews.GET("/reviews/:id", reviewHandler.Get)
			reviews.PATCH("/reviews/:id", reviewHandler.Update)
			reviews.DELETE("/reviews/:id", reviewHandler.Delete)
			reviews.GET("/users/:id/reviews", reviewHandler.List)
			reviews.GET("/contracts/:id/review-eligibility", reviewHandler.Eligibility)
			reviews.GET("/users/:id/trust", reviewHandler.Trust)
		}

		// ─── User Reporting & Admin Governance (Phase 9) ──────────────────────
		api.POST("/reports", reportLimiter.Limit(), middleware.RequireAuth(authService), adminHandler.CreateReport)

		admin := api.Group("/admin", middleware.RequireAuth(authService), middleware.RequireRole("admin"))
		{
			admin.GET("/analytics", adminHandler.GetAnalytics)

			admin.GET("/users", adminHandler.ListUsers)
			admin.GET("/users/:id", adminHandler.GetUser)
			admin.PATCH("/users/:id/suspend", adminHandler.SuspendUser)
			admin.PATCH("/users/:id/reactivate", adminHandler.ReactivateUser)

			admin.GET("/services", adminHandler.ListServices)
			admin.GET("/services/:id", adminHandler.GetService)
			admin.PATCH("/services/:id/approve", adminHandler.ApproveService)
			admin.PATCH("/services/:id/reject", adminHandler.RejectService)
			admin.PATCH("/services/:id/suspend", adminHandler.SuspendService)

			admin.GET("/projects", adminHandler.ListProjects)
			admin.GET("/projects/:id", adminHandler.GetProject)
			admin.PATCH("/projects/:id/suspend", adminHandler.SuspendProject)

			admin.GET("/reports", adminHandler.ListReports)
			admin.GET("/reports/:id", adminHandler.GetReport)
			admin.PATCH("/reports/:id/review", adminHandler.ReviewReport)
			admin.PATCH("/reports/:id/resolve", adminHandler.ResolveReport)
			admin.PATCH("/reports/:id/dismiss", adminHandler.DismissReport)

			admin.GET("/audit-logs", adminHandler.ListAuditLogs)
		}

		// ─── Intelligent Search (Phase 10) ────────────────────────────────────
		search := api.Group("/search")
		{
			search.GET("/services", searchHandler.SearchServices)
			search.GET("/freelancers", searchHandler.SearchFreelancers)
			search.GET("/projects", searchHandler.SearchProjects)
		}

		// ─── Project Talent Matching (Phase 10) ───────────────────────────────
		api.GET("/projects/:id/matches", middleware.RequireAuth(authService), matchingHandler.GetProjectMatches)

		// ─── Personalized Recommendations (Phase 10) ─────────────────────────
		recommendations := api.Group("/recommendations")
		{
			recommendations.GET("/services", middleware.OptionalAuth(authService), recommendationHandler.GetRecommendedServices)
			recommendations.POST("/events", eventLimiter.Limit(), middleware.OptionalAuth(authService), recommendationHandler.RecordInteraction)
		}
	}

	return router
}
