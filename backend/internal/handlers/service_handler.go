package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

// ServiceHandler handles service-related HTTP requests
type ServiceHandler struct {
	serviceService services.ServiceService
}

// NewServiceHandler creates a new ServiceHandler
func NewServiceHandler(serviceService services.ServiceService) *ServiceHandler {
	return &ServiceHandler{serviceService: serviceService}
}

// GetAll returns a list of services with optional filters
// GET /api/services
// Supports: ?category=, ?subcategory=, ?featured=, ?trending=,
//           ?min_rating=, ?max_price=, ?sort=, ?search=, ?q=,
//           ?limit=, ?offset=
func (h *ServiceHandler) GetAll(c *gin.Context) {
	trendingGroup := c.Query("trending_group")
	if trendingGroup == "" {
		trendingGroup = c.Query("group")
	}

	f := repositories.ServiceFilter{
		CategorySlug:      c.Query("category"),
		SubcategorySlug:   c.Query("subcategory"),
		TrendingGroupSlug: trendingGroup,
		SortBy:            c.Query("sort"),
	}

	// Search: support both ?search= and ?q=
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	f.Search = search

	// Boolean filters
	if v := c.Query("featured"); v != "" {
		b, err := strconv.ParseBool(v)
		if err == nil {
			f.IsFeatured = &b
		}
	}
	if v := c.Query("trending"); v != "" {
		b, err := strconv.ParseBool(v)
		if err == nil {
			f.IsTrending = &b
		}
	}

	// Numeric range filters
	if v := c.Query("min_rating"); v != "" {
		if f64, err := strconv.ParseFloat(v, 64); err == nil {
			f.MinRating = &f64
		}
	}
	if v := c.Query("max_price"); v != "" {
		if f64, err := strconv.ParseFloat(v, 64); err == nil {
			f.MaxPrice = &f64
		}
	}

	// Pagination
	if v, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil {
		f.Limit = v
	}
	if v, err := strconv.Atoi(c.DefaultQuery("offset", "0")); err == nil {
		f.Offset = v
	}

	servicesList, err := h.serviceService.GetAllServices(c.Request.Context(), f)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve services", err.Error())
		return
	}

	if servicesList == nil {
		servicesList = []models.Service{}
	}

	RespondSuccess(c, servicesList, "Services retrieved successfully")
}

// GetByID returns a single service by ID
// GET /api/services/:id   (supports both "srv_1" and "1" formats)
func (h *ServiceHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		RespondError(c, http.StatusBadRequest, "Service ID is required")
		return
	}

	service, err := h.serviceService.GetServiceByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve service", err.Error())
		return
	}

	RespondSuccess(c, service, "Service retrieved successfully")
}
