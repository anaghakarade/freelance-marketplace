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
	log.Println("  WorkStream Backend - Phase 2 Auth + Roles     ")
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

	// 4. Initialize Services (business logic layer)
	categoryService := services.NewCategoryService(categoryRepo)
	serviceService := services.NewServiceService(serviceRepo)
	authService := services.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpirationHours)

	// 5. Initialize Handlers (presentation / HTTP layer)
	healthHandler := handlers.NewHealthHandler()
	categoryHandler := handlers.NewCategoryHandler(categoryService)
	serviceHandler := handlers.NewServiceHandler(serviceService)
	authHandler := handlers.NewAuthHandler(authService)

	// 6. Setup Router & Routes
	router := routes.SetupRouter(cfg, healthHandler, categoryHandler, serviceHandler, authHandler, authService)

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
		log.Println("[Server] Health endpoint: http://localhost" + serverAddr + "/api/health")
		log.Println("[Server] Auth endpoints:  POST /api/auth/register, POST /api/auth/login, GET /api/auth/me")
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
