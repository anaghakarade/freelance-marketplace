package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/handlers"
)

type clientRecord struct {
	tokens     float64
	lastRefill time.Time
}

// RateLimiter implements a thread-safe in-memory token-bucket rate limiter.
type RateLimiter struct {
	mu           sync.Mutex
	clients      map[string]*clientRecord
	rate         float64 // tokens added per second
	capacity     float64 // maximum burst size
	cleanupEvery time.Duration
	lastCleanup  time.Time
}

// NewRateLimiter creates a new RateLimiter instance.
// requestsPerMinute: sustained allowed requests per minute.
// burst: maximum burst capacity.
func NewRateLimiter(requestsPerMinute int, burst int) *RateLimiter {
	rl := &RateLimiter{
		clients:      make(map[string]*clientRecord),
		rate:         float64(requestsPerMinute) / 60.0,
		capacity:     float64(burst),
		cleanupEvery: 5 * time.Minute,
		lastCleanup:  time.Now(),
	}
	return rl
}

// Limit returns a Gin middleware that throttles requests based on client IP.
func (rl *RateLimiter) Limit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if ip == "" {
			ip = "unknown"
		}

		rl.mu.Lock()
		now := time.Now()

		// Periodic cleanup of clients idle for over 10 minutes
		if now.Sub(rl.lastCleanup) > rl.cleanupEvery {
			for k, v := range rl.clients {
				if now.Sub(v.lastRefill) > 10*time.Minute {
					delete(rl.clients, k)
				}
			}
			rl.lastCleanup = now
		}

		record, exists := rl.clients[ip]
		if !exists {
			record = &clientRecord{
				tokens:     rl.capacity,
				lastRefill: now,
			}
			rl.clients[ip] = record
		} else {
			// Refill tokens based on elapsed time
			elapsed := now.Sub(record.lastRefill).Seconds()
			record.tokens += elapsed * rl.rate
			if record.tokens > rl.capacity {
				record.tokens = rl.capacity
			}
			record.lastRefill = now
		}

		if record.tokens < 1.0 {
			rl.mu.Unlock()
			c.Header("Retry-After", "5")
			handlers.RespondError(c, http.StatusTooManyRequests, "Too many requests", "Rate limit exceeded. Please try again in a few moments.")
			c.Abort()
			return
		}

		record.tokens -= 1.0
		rl.mu.Unlock()

		c.Next()
	}
}
