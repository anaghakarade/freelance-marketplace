package services_test

import (
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

func TestPasswordHashing(t *testing.T) {
	password := "SecretPass123!"

	hash, err := services.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hash == "" || hash == password {
		t.Fatalf("Password hash should not be empty or equal to plain password")
	}

	// Verify that hashing again produces a different salt
	hash2, err := services.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password second time: %v", err)
	}

	if hash == hash2 {
		t.Fatalf("Bcrypt should use random salts so hashes must differ")
	}
}

func TestJWTGenerationAndValidation(t *testing.T) {
	secret := "test-secret-key-32-chars-long-abc"
	authService := services.NewAuthService(nil, secret, 24)

	user := &models.User{
		ID:    "usr_test_123",
		Email: "test@workstream.io",
		Role:  "buyer",
	}

	token, err := authService.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	if token == "" {
		t.Fatalf("Generated token should not be empty")
	}

	// Validate token
	claims, err := authService.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected UserID %s, got %s", user.ID, claims.UserID)
	}
	if claims.Email != user.Email {
		t.Errorf("Expected Email %s, got %s", user.Email, claims.Email)
	}
	if claims.Role != user.Role {
		t.Errorf("Expected Role %s, got %s", user.Role, claims.Role)
	}
	if claims.ExpiresAt <= time.Now().Unix() {
		t.Errorf("Token expiration must be in the future")
	}
}

func TestJWTValidationInvalidSecret(t *testing.T) {
	secret1 := "secret-key-one-32-chars-long-1111"
	secret2 := "secret-key-two-32-chars-long-2222"

	service1 := services.NewAuthService(nil, secret1, 24)
	service2 := services.NewAuthService(nil, secret2, 24)

	user := &models.User{
		ID:    "usr_test_123",
		Email: "test@workstream.io",
		Role:  "seller",
	}

	token, err := service1.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	// Try validating with wrong secret
	_, err = service2.ValidateToken(token)
	if err == nil {
		t.Fatalf("Validating with wrong secret should fail")
	}
}

func TestJWTValidationTamperedToken(t *testing.T) {
	secret := "test-secret-key-32-chars-long-abc"
	authService := services.NewAuthService(nil, secret, 24)

	user := &models.User{
		ID:    "usr_test_123",
		Email: "test@workstream.io",
		Role:  "buyer",
	}

	token, err := authService.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	// Tamper with the token string
	tamperedToken := token + "tampered"
	_, err = authService.ValidateToken(tamperedToken)
	if err == nil {
		t.Fatalf("Tampered token validation should fail")
	}
}

func TestPublicAdminRegistrationRejected(t *testing.T) {
	authService := services.NewAuthService(nil, "secret", 24)

	req := &models.RegisterRequest{
		Name:     "Admin Wannabe",
		Email:    "hacker@workstream.io",
		Password: "password123",
		Role:     "admin",
	}

	_, err := authService.Register(req)
	if err == nil {
		t.Fatalf("Public registration with admin role must be rejected")
	}
}
