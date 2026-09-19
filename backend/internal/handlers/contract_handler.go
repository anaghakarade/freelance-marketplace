package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

// ContractHandler exposes HTTP REST endpoints for contracts and milestones
type ContractHandler struct {
	contractService services.ContractService
}

// NewContractHandler creates an instance of ContractHandler
func NewContractHandler(contractService services.ContractService) *ContractHandler {
	return &ContractHandler{
		contractService: contractService,
	}
}

// GetContracts handles GET /api/contracts — returns contracts for authenticated user
func (h *ContractHandler) GetContracts(c *gin.Context) {
	userID := c.GetString("user_id")
	role := c.GetString("role")

	contracts, err := h.contractService.GetMyContracts(c.Request.Context(), userID, role)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve contracts", err.Error())
		return
	}

	RespondSuccess(c, models.ContractsResponseData{
		Contracts: contracts,
		Total:     len(contracts),
	})
}

// GetContractByID handles GET /api/contracts/:id
func (h *ContractHandler) GetContractByID(c *gin.Context) {
	contractID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	contract, err := h.contractService.GetContract(c.Request.Context(), contractID, userID, role)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You are not authorized to view this contract")
			return
		}
		if errors.Is(err, services.ErrContractNotFound) {
			RespondError(c, http.StatusNotFound, "Contract not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve contract", err.Error())
		return
	}

	RespondSuccess(c, contract)
}

// GetProjectContract handles GET /api/projects/:id/contract — returns active contract for a project
func (h *ContractHandler) GetProjectContract(c *gin.Context) {
	projectID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	contract, err := h.contractService.GetContractByProject(c.Request.Context(), projectID, userID, role)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You are not authorized to view this contract")
			return
		}
		if errors.Is(err, services.ErrContractNotFound) {
			RespondError(c, http.StatusNotFound, "Contract not found for this project")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve project contract", err.Error())
		return
	}

	RespondSuccess(c, contract)
}

// CreateMilestone handles POST /api/contracts/:id/milestones
func (h *ContractHandler) CreateMilestone(c *gin.Context) {
	contractID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	var req models.CreateMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	milestone, err := h.contractService.CreateMilestone(c.Request.Context(), contractID, userID, role, req)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You are not authorized to add milestones to this contract")
			return
		}
		if errors.Is(err, services.ErrContractNotFound) {
			RespondError(c, http.StatusNotFound, "Contract not found")
			return
		}
		if errors.Is(err, services.ErrInvalidContractStatus) {
			RespondError(c, http.StatusBadRequest, "Invalid contract status", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to create milestone", err.Error())
		return
	}

	RespondCreated(c, milestone, "Milestone created successfully")
}

// GetMilestones handles GET /api/contracts/:id/milestones
func (h *ContractHandler) GetMilestones(c *gin.Context) {
	contractID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	data, err := h.contractService.GetMilestones(c.Request.Context(), contractID, userID, role)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You are not authorized to view milestones for this contract")
			return
		}
		if errors.Is(err, services.ErrContractNotFound) {
			RespondError(c, http.StatusNotFound, "Contract not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve milestones", err.Error())
		return
	}

	RespondSuccess(c, data)
}

// GetMilestoneByID handles GET /api/milestones/:id
func (h *ContractHandler) GetMilestoneByID(c *gin.Context) {
	milestoneID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	milestone, err := h.contractService.GetMilestoneByID(c.Request.Context(), milestoneID, userID, role)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You are not authorized to view this milestone")
			return
		}
		if errors.Is(err, services.ErrMilestoneNotFound) {
			RespondError(c, http.StatusNotFound, "Milestone not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve milestone", err.Error())
		return
	}

	RespondSuccess(c, milestone)
}

// UpdateMilestone handles PATCH /api/milestones/:id for pending milestone edits.
func (h *ContractHandler) UpdateMilestone(c *gin.Context) {
	var req models.UpdateMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid milestone update", err.Error())
		return
	}
	milestone, err := h.contractService.UpdateMilestone(c.Request.Context(), c.Param("id"), c.GetString("user_id"), c.GetString("role"), req)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You are not authorized to edit this milestone")
			return
		}
		if errors.Is(err, services.ErrMilestoneNotFound) {
			RespondError(c, http.StatusNotFound, "Milestone not found")
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to update milestone", err.Error())
		return
	}
	RespondSuccess(c, milestone, "Milestone updated successfully")
}

// StartMilestone handles POST /api/milestones/:id/start — freelancer starts milestone work
func (h *ContractHandler) StartMilestone(c *gin.Context) {
	milestoneID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	err := h.contractService.StartMilestone(c.Request.Context(), milestoneID, userID, role)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "Only the assigned freelancer can start this milestone")
			return
		}
		if errors.Is(err, services.ErrMilestoneNotFound) {
			RespondError(c, http.StatusNotFound, "Milestone not found")
			return
		}
		if errors.Is(err, services.ErrInvalidMilestoneState) {
			RespondError(c, http.StatusBadRequest, "Invalid milestone state transition", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to start milestone", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": milestoneID, "status": "in_progress"}, "Milestone started. Work is in progress.")
}

// SubmitMilestone handles POST /api/milestones/:id/submissions — freelancer submits work
func (h *ContractHandler) SubmitMilestone(c *gin.Context) {
	milestoneID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	var req models.MilestoneSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid submission payload", err.Error())
		return
	}

	submission, err := h.contractService.SubmitMilestone(c.Request.Context(), milestoneID, userID, role, req)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "Only the assigned freelancer can submit work for this milestone")
			return
		}
		if errors.Is(err, services.ErrMilestoneNotFound) {
			RespondError(c, http.StatusNotFound, "Milestone not found")
			return
		}
		if errors.Is(err, services.ErrInvalidMilestoneState) {
			RespondError(c, http.StatusBadRequest, "Invalid milestone state", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to submit milestone work", err.Error())
		return
	}

	RespondCreated(c, submission, "Milestone work submitted successfully. Awaiting buyer review.")
}

// ApproveMilestone handles POST /api/milestones/:id/approve — buyer approves milestone
func (h *ContractHandler) ApproveMilestone(c *gin.Context) {
	milestoneID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	var req struct {
		Message string `json:"message"`
	}
	_ = c.ShouldBindJSON(&req) // review message is optional for approval

	err := h.contractService.ApproveMilestone(c.Request.Context(), milestoneID, userID, role, req.Message)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "Only the project buyer can approve this milestone")
			return
		}
		if errors.Is(err, services.ErrMilestoneNotFound) {
			RespondError(c, http.StatusNotFound, "Milestone not found")
			return
		}
		if errors.Is(err, services.ErrInvalidMilestoneState) {
			RespondError(c, http.StatusBadRequest, "Invalid milestone state", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to approve milestone", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": milestoneID, "status": "approved"}, "Milestone approved successfully.")
}

// RequestRevision handles POST /api/milestones/:id/request-revision — buyer requests revision
func (h *ContractHandler) RequestRevision(c *gin.Context) {
	milestoneID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	var req models.MilestoneReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Revision request message is required", err.Error())
		return
	}

	err := h.contractService.RequestMilestoneRevision(c.Request.Context(), milestoneID, userID, role, req)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "Only the project buyer can request revisions for this milestone")
			return
		}
		if errors.Is(err, services.ErrMilestoneNotFound) {
			RespondError(c, http.StatusNotFound, "Milestone not found")
			return
		}
		if errors.Is(err, services.ErrInvalidMilestoneState) {
			RespondError(c, http.StatusBadRequest, "Invalid milestone state", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to request milestone revision", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": milestoneID, "status": "revision_requested"}, "Revision requested. Freelancer notified.")
}

// GetSubmissions handles GET /api/milestones/:id/submissions
func (h *ContractHandler) GetSubmissions(c *gin.Context) {
	milestoneID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	submissions, err := h.contractService.GetMilestoneSubmissions(c.Request.Context(), milestoneID, userID, role)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You are not authorized to view submissions for this milestone")
			return
		}
		if errors.Is(err, services.ErrMilestoneNotFound) {
			RespondError(c, http.StatusNotFound, "Milestone not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve milestone submissions", err.Error())
		return
	}

	RespondSuccess(c, submissions)
}
