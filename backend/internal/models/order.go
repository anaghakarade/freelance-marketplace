package models

import "time"

// Order represents a purchase transaction between a buyer and freelancer
type Order struct {
	ID           string     `json:"id"`
	BuyerID      string     `json:"buyerId"`
	SellerID     string     `json:"sellerId"`
	ServiceID    string     `json:"serviceId"`
	PackageTier  string     `json:"packageTier"` // basic, standard, premium
	Amount       float64    `json:"amount"`
	Currency     string     `json:"currency"`
	Status       string     `json:"status"` // pending, in_progress, delivered, completed, cancelled
	Requirements string     `json:"requirements"`
	DeliveryDate *time.Time `json:"deliveryDate,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}
