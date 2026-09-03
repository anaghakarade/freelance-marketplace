package database

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"
)

// Migration represents a single SQL migration file
type Migration struct {
	Version  string
	Filename string
	SQL      string
}

// RunMigrations applies all pending migrations from the embedded FS.
// It is idempotent: already-applied migrations are skipped.
func RunMigrations(db *DBWrapper, migrationsFS embed.FS) error {
	if db == nil || db.DB == nil {
		return fmt.Errorf("database connection is not available")
	}

	// Ensure the schema_migrations tracking table exists
	if err := ensureMigrationsTable(db.DB); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// Load all .up.sql files from the embedded FS
	migrations, err := loadMigrations(migrationsFS)
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	applied, err := appliedMigrations(db.DB)
	if err != nil {
		return fmt.Errorf("failed to query applied migrations: %w", err)
	}

	pending := 0
	for _, m := range migrations {
		if applied[m.Version] {
			log.Printf("[Migrate] ✓ Already applied: %s", m.Filename)
			continue
		}

		log.Printf("[Migrate] ↑ Applying: %s", m.Filename)
		if err := applyMigration(db.DB, m); err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", m.Filename, err)
		}
		log.Printf("[Migrate] ✓ Applied:  %s", m.Filename)
		pending++
	}

	if pending == 0 {
		log.Println("[Migrate] All migrations already applied. Nothing to do.")
	} else {
		log.Printf("[Migrate] Applied %d migration(s) successfully.", pending)
	}

	return nil
}

// MigrationStatus prints the status of all migrations.
func MigrationStatus(db *DBWrapper, migrationsFS embed.FS) error {
	if db == nil || db.DB == nil {
		return fmt.Errorf("database connection is not available")
	}

	if err := ensureMigrationsTable(db.DB); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	migrations, err := loadMigrations(migrationsFS)
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	applied, err := appliedMigrations(db.DB)
	if err != nil {
		return fmt.Errorf("failed to query applied migrations: %w", err)
	}

	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("  WorkStream Migration Status")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	for _, m := range migrations {
		status := "[ PENDING ]"
		if applied[m.Version] {
			status = "[APPLIED  ]"
		}
		fmt.Printf("  %s %s\n", status, m.Filename)
	}
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	return nil
}

// ─── Private helpers ─────────────────────────────────────────────────────────

func ensureMigrationsTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version     VARCHAR(255) PRIMARY KEY,
			filename    VARCHAR(255) NOT NULL,
			applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		);
	`)
	return err
}

func appliedMigrations(db *sql.DB) (map[string]bool, error) {
	rows, err := db.Query(`SELECT version FROM schema_migrations;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		applied[v] = true
	}
	return applied, rows.Err()
}

func loadMigrations(migrationsFS embed.FS) ([]Migration, error) {
	var migrations []Migration

	entries, err := fs.ReadDir(migrationsFS, ".")
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}

		content, err := fs.ReadFile(migrationsFS, name)
		if err != nil {
			return nil, fmt.Errorf("failed to read %s: %w", name, err)
		}

		// Version = filename without extension, e.g. "000001_create_initial_schema.up"
		version := strings.TrimSuffix(name, ".sql")

		migrations = append(migrations, Migration{
			Version:  version,
			Filename: name,
			SQL:      string(content),
		})
	}

	// Sort by filename to guarantee ordered execution
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Filename < migrations[j].Filename
	})

	return migrations, nil
}

func applyMigration(db *sql.DB, m Migration) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	if _, err := tx.Exec(m.SQL); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("SQL execution error: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)`,
		m.Version, m.Filename,
	); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("failed to record migration: %w", err)
	}

	return tx.Commit()
}
