package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

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

// GetAll returns a list of published services with optional filters
// GET /api/services
// Supports: ?category=, ?subcategory=, ?featured=, ?trending=,
//
//	?min_rating=, ?max_price=, ?sort=, ?search=, ?q=,
//	?limit=, ?offset=
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
	if len(search) > 200 {
		RespondError(c, http.StatusBadRequest, "Search query is too long")
		return
	}
	f.Search = search

	if f.SortBy != "" {
		switch f.SortBy {
		case "rating", "price", "price_desc", "newest", "orders", "recommended":
		default:
			RespondError(c, http.StatusBadRequest, "Invalid sort")
			return
		}
	}

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
		f64, err := strconv.ParseFloat(v, 64)
		if err != nil || f64 < 0 || f64 > 5 {
			RespondError(c, http.StatusBadRequest, "Invalid min_rating")
			return
		}
		f.MinRating = &f64
	}
	if v := c.Query("min_price"); v != "" {
		f64, err := strconv.ParseFloat(v, 64)
		if err != nil || f64 < 0 {
			RespondError(c, http.StatusBadRequest, "Invalid min_price")
			return
		}
		f.MinPrice = &f64
	}
	if v := c.Query("max_price"); v != "" {
		f64, err := strconv.ParseFloat(v, 64)
		if err != nil || f64 < 0 {
			RespondError(c, http.StatusBadRequest, "Invalid max_price")
			return
		}
		f.MaxPrice = &f64
	}
	if f.MinPrice != nil && f.MaxPrice != nil && *f.MinPrice > *f.MaxPrice {
		RespondError(c, http.StatusBadRequest, "min_price must not exceed max_price")
		return
	}

	// Pagination
	if v, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil && v > 0 && v <= 100 {
		f.Limit = v
	} else {
		RespondError(c, http.StatusBadRequest, "limit must be between 1 and 100")
		return
	}
	if v, err := strconv.Atoi(c.DefaultQuery("offset", "0")); err == nil && v >= 0 {
		f.Offset = v
	} else {
		RespondError(c, http.StatusBadRequest, "offset must be zero or greater")
		return
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
// GET /api/services/:id (supports both "srv_1" and "1" formats)
func (h *ServiceHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		RespondError(c, http.StatusBadRequest, "Invalid service ID", "Service ID parameter is required")
		return
	}

	service, err := h.serviceService.GetServiceByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found", "No service matches the provided ID")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve service", err.Error())
		return
	}

	RespondSuccess(c, service, "Service retrieved successfully")
}

// Create handles seller service creation
// POST /api/services
func (h *ServiceHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required", "User context not found")
		return
	}

	var req models.CreateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	created, err := h.serviceService.CreateService(c.Request.Context(), userID, req)
	if err != nil {
		var valErr *services.ServiceValidationError
		if errors.As(err, &valErr) {
			RespondValidationError(c, "Service validation failed", valErr.Errors)
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to create service", err.Error())
		return
	}

	RespondCreated(c, created, "Service created successfully")
}

// GetMyServices retrieves services belonging to the authenticated seller
// GET /api/seller/services?status=draft|published|archived&limit=20&offset=0
func (h *ServiceHandler) GetMyServices(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required", "User context not found")
		return
	}

	status := strings.ToLower(c.Query("status"))
	limit := 50
	if lStr := c.Query("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := 0
	if oStr := c.Query("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil && o >= 0 {
			offset = o
		}
	}

	data, err := h.serviceService.GetSellerServices(c.Request.Context(), userID, status, limit, offset)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve seller services", err.Error())
		return
	}

	RespondSuccess(c, data, "Seller services retrieved successfully")
}

// Update updates an existing service listing
// PATCH /api/services/:id
func (h *ServiceHandler) Update(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := c.GetString("role")
	serviceID := c.Param("id")

	if serviceID == "" {
		RespondError(c, http.StatusBadRequest, "Invalid service ID", "Service ID parameter is required")
		return
	}

	var req models.UpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	updated, err := h.serviceService.UpdateService(c.Request.Context(), userID, userRole, serviceID, req)
	if err != nil {
		if errors.Is(err, services.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found", "No service matches the provided ID")
			return
		}
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to modify this service")
			return
		}
		var valErr *services.ServiceValidationError
		if errors.As(err, &valErr) {
			RespondValidationError(c, "Service validation failed", valErr.Errors)
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to update service", err.Error())
		return
	}

	RespondSuccess(c, updated, "Service updated successfully")
}

// Publish publishes a draft or archived service
// POST /api/services/:id/publish
func (h *ServiceHandler) Publish(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := c.GetString("role")
	serviceID := c.Param("id")

	if serviceID == "" {
		RespondError(c, http.StatusBadRequest, "Invalid service ID", "Service ID parameter is required")
		return
	}

	published, err := h.serviceService.PublishService(c.Request.Context(), userID, userRole, serviceID)
	if err != nil {
		if errors.Is(err, services.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found", "No service matches the provided ID")
			return
		}
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to publish this service")
			return
		}
		var valErr *services.ServiceValidationError
		if errors.As(err, &valErr) {
			RespondValidationError(c, "Service is not ready to publish", valErr.Errors)
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to publish service", err.Error())
		return
	}

	RespondSuccess(c, published, "Service published successfully")
}

// Archive archives a published or draft service
// POST /api/services/:id/archive
func (h *ServiceHandler) Archive(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := c.GetString("role")
	serviceID := c.Param("id")

	if serviceID == "" {
		RespondError(c, http.StatusBadRequest, "Invalid service ID", "Service ID parameter is required")
		return
	}

	archived, err := h.serviceService.ArchiveService(c.Request.Context(), userID, userRole, serviceID)
	if err != nil {
		if errors.Is(err, services.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found", "No service matches the provided ID")
			return
		}
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to archive this service")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to archive service", err.Error())
		return
	}

	RespondSuccess(c, archived, "Service archived successfully")
}

// Delete deletes a draft service
// DELETE /api/services/:id
func (h *ServiceHandler) Delete(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := c.GetString("role")
	serviceID := c.Param("id")

	if serviceID == "" {
		RespondError(c, http.StatusBadRequest, "Invalid service ID", "Service ID parameter is required")
		return
	}

	err := h.serviceService.DeleteService(c.Request.Context(), userID, userRole, serviceID)
	if err != nil {
		if errors.Is(err, services.ErrServiceNotFound) {
			RespondError(c, http.StatusNotFound, "Service not found", "No service matches the provided ID")
			return
		}
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to delete this service")
			return
		}
		if errors.Is(err, services.ErrCannotDeletePublished) {
			RespondError(c, http.StatusBadRequest, "Cannot delete published service", "Published services cannot be permanently deleted. Please archive the service instead.")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to delete service", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"deleted": true, "id": serviceID}, "Service deleted successfully")
}
