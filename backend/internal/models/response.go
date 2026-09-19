package models

// APIResponse defines a consistent, successful JSON response structure
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

// APIErrorResponse defines a consistent, user-friendly JSON error response structure
type APIErrorResponse struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Details string            `json:"details,omitempty"`
	Errors  map[string]string `json:"errors,omitempty"`
}
