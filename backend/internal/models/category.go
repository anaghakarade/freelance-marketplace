package models

import "time"

// Category represents a top-level marketplace category
type Category struct {
	ID            string        `json:"id"`
	Name          string        `json:"name"`
	Slug          string        `json:"slug"`
	IconName      string        `json:"iconName"`
	Description   string        `json:"description"`
	Image         string        `json:"image"`
	IsActive      bool          `json:"isActive"`
	SortOrder     int           `json:"sortOrder"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
	Subcategories []Subcategory `json:"subcategories,omitempty"`
}

// Subcategory represents a specialized sub-discipline within a Category
type Subcategory struct {
	ID           string    `json:"id"`
	CategoryID   string    `json:"categoryId"`
	CategorySlug string    `json:"categorySlug"`
	Name         string    `json:"name"`
	Slug         string    `json:"slug"`
	Description  string    `json:"description"`
	SortOrder    int       `json:"sortOrder"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
