package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/handlers"
)

// RequestBodyLimit limits the size of the request body to prevent Denial of Service via memory exhaustion.
// If the body exceeds maxBytes, it halts with HTTP 413 Payload Too Large.
func RequestBodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body == nil {
			c.Next()
			return
		}

		// If Content-Length header is present and exceeds maxBytes, reject immediately without reading
		if c.Request.ContentLength > maxBytes {
			handlers.RespondError(c, http.StatusRequestEntityTooLarge, "Request payload too large", "Request body exceeds maximum allowed size")
			c.Abort()
			return
		}

		// Wrap request body in MaxBytesReader to catch chunked or streamed bodies that exceed limit
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
