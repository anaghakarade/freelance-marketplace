package middleware

import "github.com/gin-gonic/gin"

// SecurityHeaders returns a Gin middleware that attaches standard modern HTTP security headers.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME-sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking / frame embedding
		c.Header("X-Frame-Options", "DENY")

		// Control referrer information sent in headers
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Legacy XSS protection header for older browsers
		c.Header("X-XSS-Protection", "1; mode=block")

		// Prevent caching of sensitive authenticated responses if Cache-Control not already set
		if c.GetHeader("Cache-Control") == "" {
			c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
			c.Header("Pragma", "no-cache")
		}

		c.Next()
	}
}
