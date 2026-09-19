package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all backend environment configuration parameters
type Config struct {
	Environment         string
	Port                string
	DatabaseURL         string
	DatabaseHost        string
	DatabasePort        string
	DatabaseUser        string
	DatabasePassword    string
	DatabaseName        string
	DatabaseSSLMode     string
	CORSAllowedOrigins  []string
	// JWT Authentication (Phase 2)
	JWTSecret           string
	JWTExpirationHours  int
}

// Load reads configuration from .env file and environment variables
func Load() *Config {
	// Attempt to load .env from current directory or parent directories
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	environment := getEnv("ENVIRONMENT", "development")
	port := getEnv("PORT", "8080")
	databaseURL := getEnv("DATABASE_URL", "")
	dbHost := getEnv("DATABASE_HOST", "localhost")
	dbPort := getEnv("DATABASE_PORT", "5432")
	dbUser := getEnv("DATABASE_USER", "postgres")
	dbPassword := getEnv("DATABASE_PASSWORD", "postgres")
	dbName := getEnv("DATABASE_NAME", "workstream")
	dbSSLMode := getEnv("DATABASE_SSLMODE", "disable")

	corsOriginsStr := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	corsOrigins := strings.Split(corsOriginsStr, ",")
	for i, origin := range corsOrigins {
		corsOrigins[i] = strings.TrimSpace(origin)
	}

	jwtSecret := getEnv("JWT_SECRET", "workstream-dev-secret-change-in-production")
	jwtExpirationHours := 24
	if h, err := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24")); err == nil && h > 0 {
		jwtExpirationHours = h
	}

	return &Config{
		Environment:        environment,
		Port:               port,
		DatabaseURL:        databaseURL,
		DatabaseHost:       dbHost,
		DatabasePort:       dbPort,
		DatabaseUser:       dbUser,
		DatabasePassword:   dbPassword,
		DatabaseName:       dbName,
		DatabaseSSLMode:    dbSSLMode,
		CORSAllowedOrigins: corsOrigins,
		JWTSecret:          jwtSecret,
		JWTExpirationHours: jwtExpirationHours,
	}
}

// GetDSN returns the PostgreSQL connection string
func (c *Config) GetDSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DatabaseHost,
		c.DatabasePort,
		c.DatabaseUser,
		c.DatabasePassword,
		c.DatabaseName,
		c.DatabaseSSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return defaultValue
}
