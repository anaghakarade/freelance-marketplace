package models

import "time"

// Review represents client feedback and rating for a completed service
type Review struct {
	ID        string    `json:"id"`
	ServiceID string    `json:"serviceId"`
	OrderID   *string   `json:"orderId,omitempty"`
	UserID    string    `json:"userId"`
	Rating    float64   `json:"rating"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	User      *User     `json:"user,omitempty"`
}
