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
	ViewsCount      int                       `json:"viewsCount"`
	CoverImage      string                    `json:"coverImage"`
	ImageURL        string                    `json:"imageUrl,omitempty"`
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
	PublishedAt     *time.Time                `json:"publishedAt,omitempty"`
	Packages        map[string]ServicePackage `json:"packages,omitempty"`
	Seller          *User                     `json:"seller,omitempty"`
	Reviews         []Review                  `json:"reviews,omitempty"`
}

// TrendingGroup represents a curated discovery collection of services
type TrendingGroup struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	Image       string    `json:"image"`
	SortOrder   int       `json:"sortOrder"`
	IsActive    bool      `json:"isActive"`
	ServiceIDs  []string  `json:"serviceIds,omitempty"`
	Services    []Service `json:"services,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ─── DTOs for Seller Service Management (Phase 4B) ───────────────────────────

// ServicePackageRequest represents a package payload during service creation or update
type ServicePackageRequest struct {
	Name         string      `json:"name"`
	Tier         string      `json:"tier"` // basic, standard, premium (auto-inferred if empty)
	Title        string      `json:"title"`
	Description  string      `json:"description"`
	Price        float64     `json:"price"`
	DeliveryDays int         `json:"delivery_days"`
	DeliveryTime int         `json:"delivery_time"`
	Revisions    int         `json:"revisions"`
	Features     interface{} `json:"features"`
}

// CreateServiceRequest is the payload for POST /api/services
type CreateServiceRequest struct {
	Title         string                  `json:"title" binding:"required"`
	Description   string                  `json:"description"`
	CategoryID    string                  `json:"category_id" binding:"required"`
	SubcategoryID string                  `json:"subcategory_id" binding:"required"`
	ImageURL      string                  `json:"image_url"`
	CoverImage    string                  `json:"cover_image"`
	Image         string                  `json:"image"`
	Status        string                  `json:"status"` // "draft" or "published" (default "draft")
	StartingPrice float64                 `json:"starting_price"`
	Price         float64                 `json:"price"`
	DeliveryDays  int                     `json:"delivery_days"`
	DeliveryTime  int                     `json:"delivery_time"`
	Packages      []ServicePackageRequest `json:"packages"`
	Tags          []string                `json:"tags"`
	TagString     string                  `json:"tags_string"`
	ProblemSolved string                  `json:"problem_solved"`
	WhoItHelps    string                  `json:"who_it_helps"`
	ValueCreated  string                  `json:"value_created"`
}

// UpdateServiceRequest is the payload for PATCH /api/services/:id
type UpdateServiceRequest struct {
	Title         *string                 `json:"title"`
	Description   *string                 `json:"description"`
	CategoryID    *string                 `json:"category_id"`
	SubcategoryID *string                 `json:"subcategory_id"`
	ImageURL      *string                 `json:"image_url"`
	CoverImage    *string                 `json:"cover_image"`
	Image         *string                 `json:"image"`
	Status        *string                 `json:"status"`
	StartingPrice *float64                `json:"starting_price"`
	Price         *float64                `json:"price"`
	DeliveryDays  *int                    `json:"delivery_days"`
	DeliveryTime  *int                    `json:"delivery_time"`
	Packages      []ServicePackageRequest `json:"packages"`
	Tags          []string                `json:"tags"`
	ProblemSolved *string                 `json:"problem_solved"`
	WhoItHelps    *string                 `json:"who_it_helps"`
	ValueCreated  *string                 `json:"value_created"`
}

// SellerServicesData is the pagination envelope for GET /api/seller/services
type SellerServicesData struct {
	Services []Service `json:"services"`
	Total    int       `json:"total"`
	Limit    int       `json:"limit"`
	Offset   int       `json:"offset"`
}
