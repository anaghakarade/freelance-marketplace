package models

import "time"

// User represents a marketplace buyer, freelancer, or admin
type User struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Email             string    `json:"email"`
	Role              string    `json:"role"`        // buyer, seller (freelancer), admin
	AccountType       string    `json:"accountType"` // individual, corporate
	Avatar            string    `json:"avatar"`
	Title             string    `json:"title"`
	Location          string    `json:"location"`
	Rating            float64   `json:"rating"`
	ReviewsCount      int       `json:"reviewsCount"`
	Skills            []string  `json:"skills"`
	About             string    `json:"about"`
	Languages         []string  `json:"languages"`
	CompletedProjects int       `json:"completedProjects"`
	StartingPrice     float64   `json:"startingPrice"`
	Status            string    `json:"status"`   // active, inactive, suspended
	IsActive          bool      `json:"isActive"` // false = account disabled
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`

	// PasswordHash is intentionally excluded from JSON to prevent leakage
	PasswordHash string `json:"-"`
}

// ─── Auth DTOs ──────────────────────────────────────────────────────────────

// RegisterRequest is the payload for POST /api/auth/register
type RegisterRequest struct {
	Name        string `json:"name"        binding:"required"`
	Email       string `json:"email"       binding:"required,email"`
	Password    string `json:"password"    binding:"required,min=6"`
	Role        string `json:"role"`        // "buyer" or "seller" (freelancer). Defaults to "buyer".
	AccountType string `json:"accountType"` // "individual" or "corporate". Defaults to "individual".
}

// LoginRequest is the payload for POST /api/auth/login
type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse is the response envelope for successful auth operations
type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

// ─── JWT Claims ─────────────────────────────────────────────────────────────

// JWTClaims holds the payload embedded in a WorkStream JWT token
type JWTClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	// Standard fields
	Subject   string `json:"sub"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
}
