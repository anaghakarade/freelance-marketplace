package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

// CategoryHandler handles category-related HTTP requests
type CategoryHandler struct {
	categoryService services.CategoryService
}

// NewCategoryHandler creates a new CategoryHandler
func NewCategoryHandler(categoryService services.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

// GetAll returns all active categories
// GET /api/categories
func (h *CategoryHandler) GetAll(c *gin.Context) {
	categories, err := h.categoryService.GetAllCategories(c.Request.Context())
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve categories", err.Error())
		return
	}

	if categories == nil {
		categories = []models.Category{}
	}

	RespondSuccess(c, categories, "Categories retrieved successfully")
}

// GetBySlug returns a single category by slug
// GET /api/categories/:slug
func (h *CategoryHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		RespondError(c, http.StatusBadRequest, "Category slug is required")
		return
	}

	category, err := h.categoryService.GetCategoryBySlug(c.Request.Context(), slug)
	if err != nil {
		if errors.Is(err, services.ErrCategoryNotFound) {
			RespondError(c, http.StatusNotFound, "Category not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve category", err.Error())
		return
	}

	RespondSuccess(c, category, "Category retrieved successfully")
}

// GetSubcategories returns subcategories for a given category
// GET /api/categories/:slug/subcategories
func (h *CategoryHandler) GetSubcategories(c *gin.Context) {
	categorySlug := c.Param("slug")
	if categorySlug == "" {
		categorySlug = c.Param("categorySlug")
	}
	if categorySlug == "" {
		RespondError(c, http.StatusBadRequest, "Category slug is required")
		return
	}

	subcategories, err := h.categoryService.GetSubcategoriesByCategorySlug(c.Request.Context(), categorySlug)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve subcategories", err.Error())
		return
	}

	if subcategories == nil {
		subcategories = []models.Subcategory{}
	}

	RespondSuccess(c, subcategories, "Subcategories retrieved successfully")
}
