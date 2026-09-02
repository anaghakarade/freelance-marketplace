package repositories

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

// ErrUserNotFound is returned when a user lookup finds no matching record
var ErrUserNotFound = errors.New("user not found")

// ErrEmailAlreadyExists is returned when registering with a duplicate email
var ErrEmailAlreadyExists = errors.New("email already registered")

// UserRepository defines database operations on the users table
type UserRepository struct {
	db *database.DBWrapper
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *database.DBWrapper) *UserRepository {
	return &UserRepository{db: db}
}

// FindByEmail retrieves a user by email (case-insensitive)
// Returns ErrUserNotFound if no user with that email exists
func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, fmt.Errorf("database not connected")
	}

	query := `
		SELECT id, name, email, COALESCE(password_hash,'') as password_hash,
		       role, account_type, COALESCE(avatar,'') as avatar,
		       COALESCE(title,'') as title, COALESCE(location,'') as location,
		       COALESCE(rating,0) as rating, COALESCE(reviews_count,0) as reviews_count,
		       COALESCE(about,'') as about,
		       COALESCE(completed_projects,0) as completed_projects,
		       COALESCE(starting_price,0) as starting_price,
		       COALESCE(status,'active') as status,
		       COALESCE(is_active,true) as is_active,
		       created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
		LIMIT 1`

	row := r.db.QueryRow(query, strings.TrimSpace(email))
	return scanUser(row)
}

// FindByID retrieves a user by their UUID
// Returns ErrUserNotFound if no user with that ID exists
func (r *UserRepository) FindByID(id string) (*models.User, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, fmt.Errorf("database not connected")
	}

	query := `
		SELECT id, name, email, COALESCE(password_hash,'') as password_hash,
		       role, account_type, COALESCE(avatar,'') as avatar,
		       COALESCE(title,'') as title, COALESCE(location,'') as location,
		       COALESCE(rating,0) as rating, COALESCE(reviews_count,0) as reviews_count,
		       COALESCE(about,'') as about,
		       COALESCE(completed_projects,0) as completed_projects,
		       COALESCE(starting_price,0) as starting_price,
		       COALESCE(status,'active') as status,
		       COALESCE(is_active,true) as is_active,
		       created_at, updated_at
		FROM users
		WHERE id = $1
		LIMIT 1`

	row := r.db.QueryRow(query, id)
	return scanUser(row)
}

// Create inserts a new user into the database and returns the created user
func (r *UserRepository) Create(user *models.User) (*models.User, error) {
	if r.db == nil || r.db.DB == nil {
		return nil, fmt.Errorf("database not connected")
	}

	// Check for duplicate email first
	_, err := r.FindByEmail(user.Email)
	if err == nil {
		return nil, ErrEmailAlreadyExists
	}
	if !errors.Is(err, ErrUserNotFound) {
		return nil, err
	}

	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now
	if user.Status == "" {
		user.Status = "active"
	}
	user.IsActive = true

	query := `
		INSERT INTO users (
			id, name, email, password_hash, role, account_type,
			avatar, title, location, rating, reviews_count,
			about, completed_projects, starting_price,
			status, is_active, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
		) RETURNING id, name, email, COALESCE(password_hash,'') as password_hash,
			role, account_type, COALESCE(avatar,'') as avatar,
			COALESCE(title,'') as title, COALESCE(location,'') as location,
			COALESCE(rating,0) as rating, COALESCE(reviews_count,0) as reviews_count,
			COALESCE(about,'') as about,
			COALESCE(completed_projects,0) as completed_projects,
			COALESCE(starting_price,0) as starting_price,
			COALESCE(status,'active') as status,
			COALESCE(is_active,true) as is_active,
			created_at, updated_at`

	row := r.db.QueryRow(
		query,
		user.ID,
		user.Name,
		user.Email,
		user.PasswordHash,
		user.Role,
		user.AccountType,
		user.Avatar,
		user.Title,
		user.Location,
		user.Rating,
		user.ReviewsCount,
		user.About,
		user.CompletedProjects,
		user.StartingPrice,
		user.Status,
		user.IsActive,
		user.CreatedAt,
		user.UpdatedAt,
	)
	return scanUser(row)
}

// scanUser maps a *sql.Row to a models.User, handles ErrUserNotFound
func scanUser(row *sql.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(
		&u.ID,
		&u.Name,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.AccountType,
		&u.Avatar,
		&u.Title,
		&u.Location,
		&u.Rating,
		&u.ReviewsCount,
		&u.About,
		&u.CompletedProjects,
		&u.StartingPrice,
		&u.Status,
		&u.IsActive,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("scan user: %w", err)
	}
	return &u, nil
}
