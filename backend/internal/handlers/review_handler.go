package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

type ReviewHandler struct {
	repo repositories.ReviewStore
}

func NewReviewHandler(r repositories.ReviewStore) *ReviewHandler { return &ReviewHandler{r} }

var reviewCounter uint64

func reviewID() string {
	return fmt.Sprintf("rev_%d_%d", time.Now().UnixMilli(), atomic.AddUint64(&reviewCounter, 1))
}

func (h *ReviewHandler) Eligibility(c *gin.Context) {
	other, ok, e := h.repo.Eligibility(c.Request.Context(), c.Param("id"), c.GetString("user_id"))
	if errors.Is(e, repositories.ErrReviewForbidden) {
		RespondError(c, http.StatusForbidden, "Review is not eligible")
		return
	}
	if e != nil {
		RespondError(c, http.StatusNotFound, "Contract not found")
		return
	}
	RespondSuccess(c, gin.H{"eligible": ok, "reviewee_id": other, "already_reviewed": !ok})
}

func (h *ReviewHandler) Create(c *gin.Context) {
	var r models.CreateContractReviewRequest
	if e := c.ShouldBindJSON(&r); e != nil {
		RespondError(c, http.StatusBadRequest, "Invalid review payload", e.Error())
		return
	}
	r.Comment = strings.TrimSpace(r.Comment)
	if len(r.Comment) > 0 && len(r.Comment) < 10 {
		RespondError(c, http.StatusBadRequest, "Review comment must be at least 10 characters when provided")
		return
	}
	reviewerID := c.GetString("user_id")
	other, ok, e := h.repo.Eligibility(c.Request.Context(), r.ContractID, reviewerID)
	if errors.Is(e, repositories.ErrReviewForbidden) {
		RespondError(c, http.StatusForbidden, "Review is not eligible")
		return
	}
	if e != nil {
		RespondError(c, http.StatusNotFound, "Contract not found")
		return
	}
	if !ok {
		RespondError(c, http.StatusConflict, "A review already exists for this contract")
		return
	}
	v := &models.ContractReview{
		ID:         reviewID(),
		ReviewerID: reviewerID,
		RevieweeID: other,
		ContractID: r.ContractID,
		Rating:     r.Rating,
		Comment:    r.Comment,
		IsVerified: true,
	}
	if e = h.repo.Create(c.Request.Context(), v); e != nil {
		if errors.Is(e, repositories.ErrReviewDuplicate) {
			RespondError(c, http.StatusConflict, "A review already exists for this contract")
			return
		}
		RespondError(c, http.StatusInternalServerError, "Failed to create review")
		return
	}
	RespondCreated(c, v)
}

func (h *ReviewHandler) Trust(c *gin.Context) {
	p, e := h.repo.Trust(c.Request.Context(), c.Param("id"))
	if e != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to calculate trust profile")
		return
	}
	RespondSuccess(c, p)
}

func (h *ReviewHandler) Get(c *gin.Context) {
	v, e := h.repo.Get(c.Request.Context(), c.Param("id"))
	if e != nil {
		RespondError(c, http.StatusNotFound, "Review not found")
		return
	}
	RespondSuccess(c, v)
}

func (h *ReviewHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	v, e := h.repo.List(c.Request.Context(), c.Param("id"), limit, (page-1)*limit)
	if e != nil {
		RespondError(c, http.StatusInternalServerError, "Failed to retrieve reviews")
		return
	}
	RespondSuccess(c, gin.H{"reviews": v, "page": page, "limit": limit})
}

func (h *ReviewHandler) Update(c *gin.Context) {
	var r models.UpdateContractReviewRequest
	if e := c.ShouldBindJSON(&r); e != nil {
		RespondError(c, http.StatusBadRequest, "Invalid review payload")
		return
	}
	v, e := h.repo.Update(c.Request.Context(), c.Param("id"), c.GetString("user_id"), r.Rating, strings.TrimSpace(r.Comment))
	if errors.Is(e, repositories.ErrReviewForbidden) {
		RespondError(c, http.StatusForbidden, "Forbidden")
		return
	}
	if e != nil {
		RespondError(c, http.StatusNotFound, "Review not found")
		return
	}
	RespondSuccess(c, v)
}

func (h *ReviewHandler) Delete(c *gin.Context) {
	e := h.repo.Delete(c.Request.Context(), c.Param("id"), c.GetString("user_id"))
	if errors.Is(e, repositories.ErrReviewForbidden) {
		RespondError(c, http.StatusForbidden, "Forbidden")
		return
	}
	if e != nil {
		RespondError(c, http.StatusNotFound, "Review not found")
		return
	}
	RespondSuccess(c, gin.H{"deleted": true})
}
