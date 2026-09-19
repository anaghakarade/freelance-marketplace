package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"strings"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

type FreelancerDiscoveryHandler struct {
	repo *repositories.FreelancerDiscoveryRepository
}

func NewFreelancerDiscoveryHandler(repo *repositories.FreelancerDiscoveryRepository) *FreelancerDiscoveryHandler {
	return &FreelancerDiscoveryHandler{repo}
}
func (h *FreelancerDiscoveryHandler) Search(c *gin.Context) {
	f := repositories.FreelancerSearchFilter{Query: strings.TrimSpace(c.Query("q")), Category: strings.TrimSpace(c.Query("category")), Skill: strings.TrimSpace(c.Query("skill")), Tier: strings.TrimSpace(c.Query("tier")), Sort: strings.ToLower(c.Query("sort"))}
	if len(f.Query) > 200 || len(f.Skill) > 100 {
		RespondError(c, http.StatusBadRequest, "Search query is too long")
		return
	}
	if f.Tier != "" && f.Tier != "New" && f.Tier != "Rising" && f.Tier != "Established" && f.Tier != "Trusted" && f.Tier != "Top Performer" {
		RespondError(c, http.StatusBadRequest, "Invalid tier")
		return
	}
	if f.Sort != "" && f.Sort != "rating" && f.Sort != "completed" && f.Sort != "newest" && f.Sort != "match" {
		RespondError(c, http.StatusBadRequest, "Invalid sort")
		return
	}
	if v := c.Query("min_rating"); v != "" {
		n, e := strconv.ParseFloat(v, 64)
		if e != nil || n < 0 || n > 5 {
			RespondError(c, http.StatusBadRequest, "Invalid min_rating")
			return
		}
		f.MinRating = &n
	}
	f.Page = 1
	f.Limit = 20
	if v := c.Query("page"); v != "" {
		n, e := strconv.Atoi(v)
		if e != nil || n < 1 {
			RespondError(c, http.StatusBadRequest, "Invalid page")
			return
		}
		f.Page = n
	}
	if v := c.Query("limit"); v != "" {
		n, e := strconv.Atoi(v)
		if e != nil || n < 1 || n > 100 {
			RespondError(c, http.StatusBadRequest, "limit must be between 1 and 100")
			return
		}
		f.Limit = n
	}
	rows, total, e := h.repo.Search(c.Request.Context(), f)
	if e != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to search freelancers")
		return
	}
	RespondSuccess(c, models.FreelancerSearchResponse{Freelancers: rows, Total: total, Page: f.Page, Limit: f.Limit})
}
