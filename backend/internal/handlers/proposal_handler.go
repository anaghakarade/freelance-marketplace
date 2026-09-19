package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

// ProposalHandler handles HTTP routes for freelancer proposals
type ProposalHandler struct {
	projectService services.ProjectService
}

// NewProposalHandler instantiates a new ProposalHandler
func NewProposalHandler(projectService services.ProjectService) *ProposalHandler {
	return &ProposalHandler{projectService: projectService}
}

// Create handles POST /api/projects/:id/proposals — submit a proposal to a project
func (h *ProposalHandler) Create(c *gin.Context) {
	projectID := c.Param("id")
	freelancerID := c.GetString("user_id")
	if freelancerID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req models.CreateProposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	proposal, err := h.projectService.SubmitProposal(c.Request.Context(), projectID, freelancerID, req)
	if err != nil {
		var valErr *services.ServiceValidationError
		if errors.As(err, &valErr) {
			RespondValidationError(c, "Proposal validation failed", valErr.Errors)
			return
		}
		if errors.Is(err, services.ErrCannotBidOwnProject) {
			RespondError(c, http.StatusBadRequest, "Invalid proposal", err.Error())
			return
		}
		if errors.Is(err, services.ErrDuplicateProposal) {
			RespondError(c, http.StatusConflict, "Duplicate proposal", err.Error())
			return
		}
		if errors.Is(err, services.ErrProjectNotOpen) {
			RespondError(c, http.StatusBadRequest, "Project not accepting proposals", err.Error())
			return
		}
		if errors.Is(err, services.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to submit proposal", err.Error())
		return
	}

	RespondCreated(c, proposal, "Proposal submitted successfully")
}

// GetMyProposals handles GET /api/proposals/my — freelancer views their submitted proposals
func (h *ProposalHandler) GetMyProposals(c *gin.Context) {
	freelancerID := c.GetString("user_id")
	if freelancerID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	proposals, err := h.projectService.GetMyProposals(c.Request.Context(), freelancerID)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve your proposals", err.Error())
		return
	}

	RespondSuccess(c, models.ProposalsResponseData{
		Proposals: proposals,
		Total:     len(proposals),
	})
}

// GetProjectProposals handles GET /api/projects/:id/proposals — buyer reviews project proposals
func (h *ProposalHandler) GetProjectProposals(c *gin.Context) {
	projectID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")
	isAdmin := strings.EqualFold(role, "admin")

	proposals, err := h.projectService.GetProjectProposals(c.Request.Context(), projectID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "Only the project owner can review proposals")
			return
		}
		if errors.Is(err, services.ErrProjectNotFound) {
			RespondError(c, http.StatusNotFound, "Project not found")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve proposals", err.Error())
		return
	}

	RespondSuccess(c, models.ProposalsResponseData{
		Proposals: proposals,
		Total:     len(proposals),
	})
}

// Withdraw handles DELETE /api/proposals/:id — freelancer withdraws their proposal
func (h *ProposalHandler) Withdraw(c *gin.Context) {
	proposalID := c.Param("id")
	freelancerID := c.GetString("user_id")
	if freelancerID == "" {
		RespondError(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	err := h.projectService.WithdrawProposal(c.Request.Context(), proposalID, freelancerID)
	if err != nil {
		if errors.Is(err, services.ErrProposalNotFound) {
			RespondError(c, http.StatusNotFound, "Proposal not found")
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to withdraw proposal", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": proposalID, "withdrawn": true}, "Proposal withdrawn successfully")
}

// Shortlist handles PATCH /api/proposals/:id/shortlist — buyer shortlists proposal
func (h *ProposalHandler) Shortlist(c *gin.Context) {
	proposalID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")
	isAdmin := strings.EqualFold(role, "admin")

	err := h.projectService.ShortlistProposal(c.Request.Context(), proposalID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to shortlist this proposal")
			return
		}
		if errors.Is(err, services.ErrProposalNotFound) {
			RespondError(c, http.StatusNotFound, "Proposal not found")
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to shortlist proposal", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": proposalID, "status": "shortlisted"}, "Proposal shortlisted")
}

// Reject handles PATCH /api/proposals/:id/reject — buyer rejects proposal
func (h *ProposalHandler) Reject(c *gin.Context) {
	proposalID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")
	isAdmin := strings.EqualFold(role, "admin")

	err := h.projectService.RejectProposal(c.Request.Context(), proposalID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to reject this proposal")
			return
		}
		if errors.Is(err, services.ErrProposalNotFound) {
			RespondError(c, http.StatusNotFound, "Proposal not found")
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to reject proposal", err.Error())
		return
	}

	RespondSuccess(c, gin.H{"id": proposalID, "status": "rejected"}, "Proposal rejected")
}

// Accept handles PATCH /api/proposals/:id/accept — buyer accepts proposal (atomic decision)
func (h *ProposalHandler) Accept(c *gin.Context) {
	proposalID := c.Param("id")
	userID := c.GetString("user_id")
	role := c.GetString("role")
	isAdmin := strings.EqualFold(role, "admin")

	contractID, err := h.projectService.AcceptProposal(c.Request.Context(), proposalID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, services.ErrForbidden) {
			RespondError(c, http.StatusForbidden, "Forbidden", "You do not have permission to accept proposals on this project")
			return
		}
		if errors.Is(err, services.ErrProposalNotFound) {
			RespondError(c, http.StatusNotFound, "Proposal not found")
			return
		}
		if errors.Is(err, services.ErrProjectNotOpen) {
			RespondError(c, http.StatusBadRequest, "Project is no longer open", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "Failed to accept proposal", err.Error())
		return
	}

	RespondSuccess(c, gin.H{
		"id":            proposalID,
		"status":        "accepted",
		"projectStatus": "in_progress",
		"contractId":    contractID,
	}, "Proposal accepted successfully. Contract created and project moved to in_progress.")
}

