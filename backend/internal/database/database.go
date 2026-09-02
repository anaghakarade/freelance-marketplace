package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"workstream-backend/internal/config"
)

// DBWrapper wraps the SQL DB instance
type DBWrapper struct {
	*sql.DB
}

// Connect initializes a connection pool to the PostgreSQL database
func Connect(cfg *config.Config) (*DBWrapper, error) {
	dsn := cfg.GetDSN()

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Set connection pool settings for performance and stability
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(15 * time.Minute)

	// Verify database connection via Ping
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to ping PostgreSQL database: %w", err)
	}

	log.Println("[Database] Successfully connected to PostgreSQL database:", cfg.DatabaseName)
	return &DBWrapper{DB: db}, nil
}

// Close gracefully closes the database connection pool
func (d *DBWrapper) Close() error {
	if d.DB != nil {
		log.Println("[Database] Closing PostgreSQL connection pool...")
		return d.DB.Close()
	}
	return nil
}
