package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
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

// GetAll returns a list of services with optional category/subcategory filters
// GET /api/services
func (h *ServiceHandler) GetAll(c *gin.Context) {
	categorySlug := c.Query("category")
	subcategorySlug := c.Query("subcategory")
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	servicesList, err := h.serviceService.GetAllServices(c.Request.Context(), categorySlug, subcategorySlug, limit, offset)
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
// GET /api/services/:id
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
