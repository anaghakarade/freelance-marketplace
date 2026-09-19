package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"workstream-backend/internal/config"
	"workstream-backend/internal/database"
	"workstream-backend/internal/handlers"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/routes"
	"workstream-backend/internal/services"
)

func main() {
	log.Println("=================================================")
	log.Println("  WorkStream Backend - Phase 10 Search & Matching")
	log.Println("=================================================")

	// 1. Load Configuration
	cfg := config.Load()
	log.Printf("[Config] Server configured for PORT: %s", cfg.Port)
	log.Printf("[Config] JWT expiration: %dh", cfg.JWTExpirationHours)

	// 2. Initialize PostgreSQL Database Connection
	db, err := database.Connect(cfg)
	if err != nil {
		log.Printf("[Database WARNING] Could not connect to PostgreSQL: %v", err)
		log.Println("[Database WARNING] Ensure PostgreSQL is running and credentials in .env are correct.")
	} else {
		defer func() {
			if err := db.Close(); err != nil {
				log.Printf("[Database ERROR] Error closing database: %v", err)
			}
		}()
	}

	// 3. Initialize Repositories (data layer)
	categoryRepo := repositories.NewCategoryRepository(db)
	serviceRepo := repositories.NewServiceRepository(db)
	userRepo := repositories.NewUserRepository(db)
	projectRepo := repositories.NewProjectRepository(db)
	proposalRepo := repositories.NewProposalRepository(db)
	contractRepo := repositories.NewContractRepository(db)
	milestoneRepo := repositories.NewMilestoneRepository(db)
	paymentRepo := repositories.NewPaymentRepository(db)
	communicationRepo := repositories.NewCommunicationRepository(db)
	reviewRepo := repositories.NewReviewRepository(db)
	freelancerDiscoveryRepo := repositories.NewFreelancerDiscoveryRepository(db)
	adminRepo := repositories.NewAdminRepository(db)
	reportRepo := repositories.NewReportRepository(db)
	auditRepo := repositories.NewAuditRepository(db)
	searchRepo := repositories.NewSearchRepository(db)
	recommendationRepo := repositories.NewRecommendationRepository(db)

	// 4. Initialize Services (business logic layer)
	categoryService := services.NewCategoryService(categoryRepo)
	serviceService := services.NewServiceService(serviceRepo, categoryRepo)
	authService := services.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpirationHours)
	projectService := services.NewProjectService(projectRepo, proposalRepo, categoryRepo, userRepo)
	contractService := services.NewContractService(contractRepo, milestoneRepo, projectRepo)
	paymentService := services.NewPaymentService(paymentRepo, milestoneRepo, contractRepo)
	communicationService := services.NewCommunicationService(communicationRepo)
	adminService := services.NewAdminService(adminRepo, reportRepo, auditRepo, communicationRepo)
	searchService := services.NewSearchService(searchRepo)
	matchingService := services.NewMatchingService(freelancerDiscoveryRepo, reviewRepo)
	recommendationService := services.NewRecommendationService(recommendationRepo)

	// 5. Initialize Handlers (presentation / HTTP layer)
	healthHandler := handlers.NewHealthHandler(db)
	categoryHandler := handlers.NewCategoryHandler(categoryService)
	serviceHandler := handlers.NewServiceHandler(serviceService)
	authHandler := handlers.NewAuthHandler(authService)
	projectHandler := handlers.NewProjectHandler(projectService)
	proposalHandler := handlers.NewProposalHandler(projectService)
	contractHandler := handlers.NewContractHandler(contractService)
	paymentHandler := handlers.NewPaymentHandler(paymentService)
	communicationHandler := handlers.NewCommunicationHandler(communicationService)
	reviewHandler := handlers.NewReviewHandler(reviewRepo)
	freelancerDiscoveryHandler := handlers.NewFreelancerDiscoveryHandler(freelancerDiscoveryRepo)
	adminHandler := handlers.NewAdminHandler(adminService)
	searchHandler := handlers.NewSearchHandler(searchService)
	matchingHandler := handlers.NewMatchingHandler(matchingService, projectRepo)
	recommendationHandler := handlers.NewRecommendationHandler(recommendationService)

	// 6. Setup Router & Routes
	router := routes.SetupRouter(
		cfg,
		healthHandler,
		categoryHandler,
		serviceHandler,
		authHandler,
		authService,
		projectHandler,
		proposalHandler,
		contractHandler,
		paymentHandler,
		communicationHandler,
		reviewHandler,
		freelancerDiscoveryHandler,
		adminHandler,
		searchHandler,
		matchingHandler,
		recommendationHandler,
	)

	// 7. Setup HTTP Server
	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 8. Start HTTP Server in background goroutine
	go func() {
		log.Printf("[Server] WorkStream API server is listening on http://localhost%s", serverAddr)
		log.Println("[Server] Health endpoint:   http://localhost" + serverAddr + "/api/health")
		log.Println("[Server] Search endpoints:  GET /api/search/services, GET /api/search/freelancers, GET /api/search/projects")
		log.Println("[Server] Matching endpoint: GET /api/projects/:id/matches")
		log.Println("[Server] Recommendations:   GET /api/recommendations/services, POST /api/recommendations/events")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[Server FATAL] Failed to start server: %v", err)
		}
	}()

	// 9. Graceful Shutdown listener
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[Server] Shutting down WorkStream server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[Server FATAL] Server forced to shutdown: %v", err)
	}

	log.Println("[Server] WorkStream server exiting cleanly.")
}
