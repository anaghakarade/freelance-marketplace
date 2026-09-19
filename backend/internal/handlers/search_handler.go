package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

type SearchHandler struct {
	searchService services.SearchService
}

func NewSearchHandler(searchService services.SearchService) *SearchHandler {
	return &SearchHandler{searchService: searchService}
}

// SearchServices handles GET /api/search/services
func (h *SearchHandler) SearchServices(c *gin.Context) {
	var p models.ServiceSearchParams

	p.Query = strings.TrimSpace(c.Query("q"))
	if p.Query == "" {
		p.Query = strings.TrimSpace(c.Query("search"))
	}

	p.Category = strings.TrimSpace(c.Query("category"))
	p.Subcategory = strings.TrimSpace(c.Query("subcategory"))
	p.Sort = strings.TrimSpace(c.Query("sort"))
	p.Tier = strings.TrimSpace(c.Query("tier"))
	p.Status = strings.TrimSpace(c.Query("status"))

	if v := c.Query("min_price"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MinPrice = &n
		}
	} else if v := c.Query("minPrice"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MinPrice = &n
		}
	}

	if v := c.Query("max_price"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MaxPrice = &n
		}
	} else if v := c.Query("maxPrice"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MaxPrice = &n
		}
	}

	if v := c.Query("rating"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MinRating = &n
		}
	} else if v := c.Query("min_rating"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MinRating = &n
		}
	}

	if v := c.Query("delivery_time"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			p.MaxDeliveryTime = &n
		}
	} else if v := c.Query("delivery"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			p.MaxDeliveryTime = &n
		}
	}

	p.Page = 1
	if v := c.Query("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			p.Page = n
		}
	}

	p.Limit = 20
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			p.Limit = n
		}
	}

	resp, err := h.searchService.SearchServices(c.Request.Context(), p)
	if err != nil {
		if err == services.ErrQueryTooLong || err == services.ErrInvalidPriceRange || err == services.ErrInvalidRating {
			RespondError(c, http.StatusBadRequest, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to search services: "+err.Error())
		return
	}

	RespondSuccess(c, resp)
}

// SearchFreelancers handles GET /api/search/freelancers
func (h *SearchHandler) SearchFreelancers(c *gin.Context) {
	var p models.FreelancerSearchParams

	p.Query = strings.TrimSpace(c.Query("q"))
	if p.Query == "" {
		p.Query = strings.TrimSpace(c.Query("search"))
	}
	p.Category = strings.TrimSpace(c.Query("category"))
	p.Skill = strings.TrimSpace(c.Query("skill"))
	p.Tier = strings.TrimSpace(c.Query("tier"))
	p.Sort = strings.TrimSpace(c.Query("sort"))

	if v := c.Query("min_rating"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MinRating = &n
		}
	}

	if v := c.Query("min_completed"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			p.MinCompleted = &n
		}
	}

	if v := c.Query("min_price"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MinPrice = &n
		}
	}
	if v := c.Query("max_price"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MaxPrice = &n
		}
	}

	p.Page = 1
	if v := c.Query("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			p.Page = n
		}
	}

	p.Limit = 20
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			p.Limit = n
		}
	}

	resp, err := h.searchService.SearchFreelancers(c.Request.Context(), p)
	if err != nil {
		if err == services.ErrQueryTooLong || err == services.ErrInvalidPriceRange || err == services.ErrInvalidRating {
			RespondError(c, http.StatusBadRequest, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to search freelancers: "+err.Error())
		return
	}

	RespondSuccess(c, resp)
}

// SearchProjects handles GET /api/search/projects
func (h *SearchHandler) SearchProjects(c *gin.Context) {
	var p models.ProjectSearchParams

	p.Query = strings.TrimSpace(c.Query("q"))
	if p.Query == "" {
		p.Query = strings.TrimSpace(c.Query("search"))
	}
	p.Category = strings.TrimSpace(c.Query("category"))
	p.Skill = strings.TrimSpace(c.Query("skill"))
	p.ExperienceLevel = strings.TrimSpace(c.Query("experience_level"))
	p.BudgetType = strings.TrimSpace(c.Query("budget_type"))
	p.Sort = strings.TrimSpace(c.Query("sort"))

	if v := c.Query("min_budget"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MinBudget = &n
		}
	}
	if v := c.Query("max_budget"); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			p.MaxBudget = &n
		}
	}

	p.Page = 1
	if v := c.Query("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			p.Page = n
		}
	}

	p.Limit = 20
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			p.Limit = n
		}
	}

	resp, err := h.searchService.SearchProjects(c.Request.Context(), p)
	if err != nil {
		if err == services.ErrQueryTooLong || err == services.ErrInvalidPriceRange {
			RespondError(c, http.StatusBadRequest, err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to search projects: "+err.Error())
		return
	}

	RespondSuccess(c, resp)
}
