package models

import "time"

// Favorite represents a user bookmarking a service
type Favorite struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	ServiceID string    `json:"serviceId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
