package main

import (
	"fmt"
	"log"
	"os"

	"workstream-backend/internal/config"
	"workstream-backend/internal/database"
	"workstream-backend/migrations"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	cmd := os.Args[1]

	// Load config and connect to DB
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("[Migrate] Cannot connect to PostgreSQL: %v\n"+
			"         Ensure PostgreSQL is running and .env credentials are correct.", err)
	}
	defer db.Close()

	switch cmd {
	case "up":
		log.Println("[Migrate] Running pending migrations...")
		if err := database.RunMigrations(db, migrations.FS); err != nil {
			log.Fatalf("[Migrate] Migration failed: %v", err)
		}

	case "status":
		if err := database.MigrationStatus(db, migrations.FS); err != nil {
			log.Fatalf("[Migrate] Status check failed: %v", err)
		}

	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %q\n\n", cmd)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("WorkStream Migration CLI")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  go run ./cmd/migrate up       Apply all pending migrations")
	fmt.Println("  go run ./cmd/migrate status   Show migration status")
}
