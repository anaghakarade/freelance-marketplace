package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

// ─── Sentinel Errors ─────────────────────────────────────────────────────────

var (
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrAccountSuspended    = errors.New("this account has been suspended")
	ErrAccountInactive     = errors.New("this account is inactive")
	ErrAdminRegistration   = errors.New("admin accounts cannot be created via public registration")
	ErrInvalidToken        = errors.New("invalid or expired token")
	ErrEmailAlreadyExists  = repositories.ErrEmailAlreadyExists
	ErrUserNotFound        = repositories.ErrUserNotFound
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// ─── AuthService ─────────────────────────────────────────────────────────────

// AuthService handles authentication and JWT operations
type AuthService struct {
	userRepo          *repositories.UserRepository
	jwtSecret         []byte
	jwtExpirationHours int
}

// NewAuthService creates a new AuthService
func NewAuthService(userRepo *repositories.UserRepository, jwtSecret string, jwtExpirationHours int) *AuthService {
	return &AuthService{
		userRepo:           userRepo,
		jwtSecret:          []byte(jwtSecret),
		jwtExpirationHours: jwtExpirationHours,
	}
}

// ─── Public Methods ───────────────────────────────────────────────────────────

// Register creates a new user account, hashes the password, and returns a JWT
func (s *AuthService) Register(req *models.RegisterRequest) (*models.AuthResponse, error) {
	// Validate inputs
	if err := validateRegisterRequest(req); err != nil {
		return nil, err
	}

	// Block public admin registration
	if strings.EqualFold(req.Role, "admin") {
		return nil, ErrAdminRegistration
	}

	// Normalize role: "freelancer" → "seller"
	role := normalizeRole(req.Role)

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	accountType := req.AccountType
	if accountType == "" {
		accountType = "individual"
	}

	user := &models.User{
		ID:           generateID(),
		Name:         strings.TrimSpace(req.Name),
		Email:        strings.ToLower(strings.TrimSpace(req.Email)),
		PasswordHash: string(hash),
		Role:         role,
		AccountType:  accountType,
		Status:       "active",
		IsActive:     true,
	}

	created, err := s.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	token, err := s.GenerateToken(created)
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	return &models.AuthResponse{Token: token, User: created}, nil
}

// Login verifies credentials and returns a JWT on success
func (s *AuthService) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// Check account state
	if strings.EqualFold(user.Status, "suspended") {
		return nil, ErrAccountSuspended
	}
	if !user.IsActive {
		return nil, ErrAccountInactive
	}

	// Verify password strictly with bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.GenerateToken(user)
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	return &models.AuthResponse{Token: token, User: user}, nil
}

// GetCurrentUser retrieves the authenticated user by ID (used in /me endpoint)
func (s *AuthService) GetCurrentUser(userID string) (*models.User, error) {
	return s.userRepo.FindByID(userID)
}

// ─── JWT Implementation (stdlib only, HMAC-SHA256) ────────────────────────────

// GenerateToken creates a signed JWT for the given user
func (s *AuthService) GenerateToken(user *models.User) (string, error) {
	now := time.Now().UTC()
	claims := models.JWTClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		Subject:   user.ID,
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(time.Duration(s.jwtExpirationHours) * time.Hour).Unix(),
	}

	return s.encodeJWT(claims)
}

// ValidateToken parses and validates a JWT string, returning the claims
func (s *AuthService) ValidateToken(tokenStr string) (*models.JWTClaims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	// Explicitly validate header algorithm and type
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var header map[string]interface{}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, ErrInvalidToken
	}

	alg, ok := header["alg"].(string)
	if !ok || alg != "HS256" {
		return nil, ErrInvalidToken
	}

	// Verify signature
	message := parts[0] + "." + parts[1]
	expectedSig := s.sign(message)
	if !hmac.Equal([]byte(expectedSig), []byte(parts[2])) {
		return nil, ErrInvalidToken
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims models.JWTClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, ErrInvalidToken
	}

	// Ensure critical claims exist
	if claims.UserID == "" {
		return nil, ErrInvalidToken
	}

	// Check expiry
	if time.Now().UTC().Unix() > claims.ExpiresAt {
		return nil, ErrInvalidToken
	}

	return &claims, nil
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

func (s *AuthService) encodeJWT(claims models.JWTClaims) (string, error) {
	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	headerBytes, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	payloadBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	h := base64.RawURLEncoding.EncodeToString(headerBytes)
	p := base64.RawURLEncoding.EncodeToString(payloadBytes)
	message := h + "." + p
	sig := s.sign(message)

	return message + "." + sig, nil
}

func (s *AuthService) sign(message string) string {
	mac := hmac.New(sha256.New, s.jwtSecret)
	mac.Write([]byte(message))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// generateID creates a simple unique ID for new users (timestamp + random hex)
func generateID() string {
	return fmt.Sprintf("usr_%d", time.Now().UnixNano())
}

// normalizeRole maps frontend role names to backend canonical roles
func normalizeRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "seller", "freelancer":
		return "seller"
	case "admin":
		return "admin"
	default:
		return "buyer"
	}
}

// validateRegisterRequest performs field validation on the registration payload
func validateRegisterRequest(req *models.RegisterRequest) error {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return fmt.Errorf("name is required")
	}
	if len(name) < 2 || len(name) > 100 {
		return fmt.Errorf("name must be between 2 and 100 characters")
	}
	email := strings.TrimSpace(req.Email)
	if !emailRegex.MatchString(email) || len(email) > 255 {
		return fmt.Errorf("invalid email address")
	}
	if len(req.Password) < 6 || len(req.Password) > 128 {
		return fmt.Errorf("password must be between 6 and 128 characters")
	}
	return nil
}

// HashPassword hashes a plaintext password using bcrypt (for admin seeding / testing)
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}
