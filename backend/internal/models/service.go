package models

import "time"

// ServicePackage represents a pricing tier (basic, standard, premium) for a service
type ServicePackage struct {
	ID           string      `json:"id"`
	ServiceID    string      `json:"serviceId"`
	Tier         string      `json:"tier"` // basic, standard, premium
	Name         string      `json:"name"`
	Title        string      `json:"title"`
	Description  string      `json:"description"`
	Price        float64     `json:"price"`
	DeliveryTime int         `json:"deliveryTime"`
	Revisions    int         `json:"revisions"`
	Features     interface{} `json:"features"`
	CreatedAt    time.Time   `json:"createdAt"`
	UpdatedAt    time.Time   `json:"updatedAt"`
}

// Service represents a marketplace gig or freelance service
type Service struct {
	ID              string                    `json:"id"`
	Title           string                    `json:"title"`
	Slug            string                    `json:"slug"`
	SellerID        string                    `json:"sellerId"`
	CategoryID      string                    `json:"categoryId"`
	CategorySlug    string                    `json:"categorySlug"`
	SubcategoryID   string                    `json:"subcategoryId"`
	SubcategorySlug string                    `json:"subcategorySlug"`
	TagIDs          []string                  `json:"tagIds"`
	Status          string                    `json:"status"` // published, draft, archived
	IsFeatured      bool                      `json:"isFeatured"`
	IsTrending      bool                      `json:"isTrending"`
	CoverImage      string                    `json:"coverImage"`
	GalleryImages   []string                  `json:"galleryImages"`
	Description     string                    `json:"description"`
	Tags            []string                  `json:"tags"`
	StartingPrice   float64                   `json:"startingPrice"`
	Currency        string                    `json:"currency"`
	DeliveryDays    int                       `json:"deliveryDays"`
	Rating          float64                   `json:"rating"`
	ReviewCount     int                       `json:"reviewCount"`
	OrderCount      int                       `json:"orderCount"`
	CreatedAt       time.Time                 `json:"createdAt"`
	UpdatedAt       time.Time                 `json:"updatedAt"`
	Packages        map[string]ServicePackage `json:"packages,omitempty"`
	Seller          *User                     `json:"seller,omitempty"`
}
