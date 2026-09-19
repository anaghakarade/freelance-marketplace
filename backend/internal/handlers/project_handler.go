package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

// ProjectHandler handles HTTP routes for buyer projects
type ProjectHandler struct {
	projectService services.ProjectService
}

// NewProjectHandler instantiates a new ProjectHandler
func NewProjectHandler(projectService services.ProjectService) *ProjectHandler {
	return &ProjectHandler{projectService: projectService}
}

// GetAll handles GET /api/projects — public discovery of open projects
func (h *ProjectHandler) GetAll(c *gin.Context) {
	var filters models.ProjectFilters

	filters.Category = c.Query("category")
	filters.Subcategory = c.Query("subcategory")
	filters.ExperienceLevel = c.Query("experience_level")
	filters.BudgetType = c.Query("budget_type")
	filters.Search = c.Query("search")
	if filters.Search == "" {
		filters.Search = c.Query("q")
	}
	if len(filters.Search) > 200 {
		RespondError(c, http.StatusBadRequest, "Search query is too long")
		return
	}
	filters.Sort = c.Query("sort")
	if filters.Sort != "" {
		switch filters.Sort {
		case "newest", "budget_high", "budget_low", "proposals":
		default:
			RespondError(c, http.StatusBadRequest, "Invalid sort")
			return
		}
	}

	if minStr := c.Query("min_budget"); minStr != "" {
		v, err := strconv.ParseFloat(minStr, 64)
		if err != nil || v < 0 {
			RespondError(c, http.StatusBadRequest, "Invalid min_budget")
			return
		}
		filters.MinBudget = &v
	}
	if maxStr := c.Query("max_budget"); maxStr != "" {
		v, err := strconv.ParseFloat(maxStr, 64)
		if err != nil || v < 0 {
			RespondError(c, http.StatusBadRequest, "Invalid max_budget")
			return
		}
		filters.MaxBudget = &v
	}
	if filters.MinBudget != nil && filters.MaxBudget != nil && *filters.MinBudget > *filters.MaxBudget {
		RespondError(c, http.StatusBadRequest, "min_budget must not exceed max_budget")
		return
	}
	if skillsStr := c.Query("skills"); skillsStr != "" {
		parts := strings.Split(skillsStr, ",")
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				filters.Skills = append(filters.Skills, trimmed)
			}
		}
	}

	limit := 20
	if l := c.Query("limit"); l != "" {
		v, err := strconv.Atoi(l)
		if err != nil || v < 1 || v > 100 {
			RespondError(c, http.StatusBadRequest, "limit must be between 1 and 100")
			return
		}
		limit = v
	}
	filters.Limit = limit

	offset := 0
	if o := c.Query("offset"); o != "" {
		v, err := strconv.Atoi(o)
		if err != nil || v < 0 {
			RespondError(c, http.StatusBadRequest, "offset must be zero or greater")
			return
		}
		offset = v
	}
	filters.Offset = offset

	currentUserID := c.GetString("user_id")

	projects, total, err := h.projectService.GetAllProjects(c.Request.Context(), filters, currentUserID)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve projects", err.Error())
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.ProjectsResponseData{
			Projects: projects,
			Total:    total,
			Limit:    limit,
			Offset:   offset,
		},
		Message: "Projects retrieved successfully",
	})
}

// GetByID handles GET /api/projects/:id — single project view
func (h *ProjectHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		RespondError(c, http.StatusBadRequest, "Invalid project ID")
		return
	}

	currentUserID := c.GetString("user_id")

	project, err := h.projectService.GetProjectByID(c.Request.Context(), id, currentUserID)
	if err != nil {
		if errors.Is(err, services.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve project", err.Error())
		return
	}

	RespondSuccess(c, project)
}

// Create handles POST /api/projects — create a new project
func (h *ProjectHandler) Create(c *gin.Context) {
	buyerID := c.GetString("user_id")
	if buyerID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req models.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	project, err := h.projectService.CreateProject(c.Request.Context(), buyerID, req)
	if err != nil {
		var valErr *services.ServiceValidationError
		if errors.As(err, &valErr) {
			RespondValidationError(c, "Project validation failed", valErr.Errors)
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to create project", err.Error())
		return
	}

	RespondCreated(c, project, "Project created successfully")
}

// GetMyProjects handles GET /api/projects/my — returns buyer's own projects
func (h *ProjectHandler) GetMyProjects(c *gin.Context) {
	buyerID := c.GetString("user_id")
	if buyerID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	projects, err := h.projectService.GetMyProjects(c.Request.Context(), buyerID)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve your projects", err.Error())
		return
	}

	RespondSuccess(c, models.ProjectsResponseData{
		Projects: projects,
		Total:    len(projects),
		Limit:    len(projects),
		Offset:   0,
	})
}

// Update handles PUT /api/projects/:id — update a project
func (h *ProjectHandler) Update(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")
	isAdmin := strings.EqualFold(role, "admin")

	var req models.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	project, err := h.projectService.UpdateProject(c.Request.Context(), id, userID, isAdmin, req)
	if err != nil {
		var valErr *services.ServiceValidationError
		if errors.As(err, &valErr) {
			RespondValidationError(c, "Project validation failed", valErr.Errors)
			return
		}
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to modify this project")
			return
		}
		if errors.Is(err, services.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to update project", err.Error())
		return
	}

	RespondSuccess(c, project, "Project updated successfully")
}

// UpdateStatus handles PATCH /api/projects/:id/status — change project status
func (h *ProjectHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")
	isAdmin := strings.EqualFold(role, "admin")

	var req models.UpdateProjectStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	err := h.projectService.UpdateProjectStatus(c.Request.Context(), id, userID, isAdmin, req.Status)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to change this project status")
			return
		}
		if errors.Is(err, services.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to update project status", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": id, "status": req.Status}, "Project status updated successfully")
}

// Delete handles DELETE /api/projects/:id — delete a project
func (h *ProjectHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")
	isAdmin := strings.EqualFold(role, "admin")

	err := h.projectService.DeleteProject(c.Request.Context(), id, userID, isAdmin)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to delete this project")
			return
		}
		if errors.Is(err, services.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to delete project", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": id, "deleted": true}, "Project deleted successfully")
}
