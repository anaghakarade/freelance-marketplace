package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestSecurityHeaders(t *testing.T) {
	r := gin.New()
	r.Use(SecurityHeaders())
	r.GET("/test-headers", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest(http.MethodGet, "/test-headers", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	headers := w.Header()
	if headers.Get("X-Content-Type-Options") != "nosniff" {
		t.Errorf("expected X-Content-Type-Options: nosniff, got %s", headers.Get("X-Content-Type-Options"))
	}
	if headers.Get("X-Frame-Options") != "DENY" {
		t.Errorf("expected X-Frame-Options: DENY, got %s", headers.Get("X-Frame-Options"))
	}
	if headers.Get("Referrer-Policy") != "strict-origin-when-cross-origin" {
		t.Errorf("expected Referrer-Policy: strict-origin-when-cross-origin, got %s", headers.Get("Referrer-Policy"))
	}
	if headers.Get("X-XSS-Protection") != "1; mode=block" {
		t.Errorf("expected X-XSS-Protection: 1; mode=block, got %s", headers.Get("X-XSS-Protection"))
	}
}

func TestRequestBodyLimit(t *testing.T) {
	r := gin.New()
	// Allow maximum 100 bytes
	r.Use(RequestBodyLimit(100))
	r.POST("/test-limit", func(c *gin.Context) {
		var body map[string]string
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "accepted"})
	})

	// 1. Normal payload (under limit)
	smallBody := `{"msg":"short"}`
	req1 := httptest.NewRequest(http.MethodPost, "/test-limit", strings.NewReader(smallBody))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("expected small request 200, got %d", w1.Code)
	}

	// 2. Oversized payload (over limit with Content-Length)
	oversizedBody := `{"long":"` + strings.Repeat("A", 200) + `"}`
	req2 := httptest.NewRequest(http.MethodPost, "/test-limit", strings.NewReader(oversizedBody))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected oversized request 413, got %d", w2.Code)
	}
}

func TestRateLimiter(t *testing.T) {
	r := gin.New()
	// Rate limiter: 60 req/min, burst 3
	limiter := NewRateLimiter(60, 3)
	r.Use(limiter.Limit())
	r.GET("/test-rate", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Burst 3 requests should all succeed
	for i := 1; i <= 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test-rate", nil)
		req.RemoteAddr = "192.168.1.50:12345"
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected request %d to succeed (200), got %d", i, w.Code)
		}
	}

	// 4th request immediately should be blocked with 429 Too Many Requests
	req := httptest.NewRequest(http.MethodGet, "/test-rate", nil)
	req.RemoteAddr = "192.168.1.50:12345"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 4th burst request to be rate limited (429), got %d", w.Code)
	}
	if w.Header().Get("Retry-After") == "" {
		t.Errorf("expected Retry-After header on 429 response")
	}
}
