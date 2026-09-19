package handlers

import (
	"database/sql"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
	"workstream-backend/internal/services"
)

type CommunicationHandler struct{ service services.CommunicationService }

func NewCommunicationHandler(s services.CommunicationService) *CommunicationHandler {
	return &CommunicationHandler{s}
}
func limit(c *gin.Context) int {
	n, err := strconv.Atoi(c.DefaultQuery("limit", "30"))
	if err != nil || n < 1 || n > 100 {
		return 30
	}
	return n
}
func (h *CommunicationHandler) Notifications(c *gin.Context) {
	items, count, e := h.service.Notifications(c.Request.Context(), c.GetString("user_id"), limit(c), c.Query("unread") == "true")
	if e != nil {
		RespondError(c, 500, "Failed to retrieve notifications")
		return
	}
	RespondSuccess(c, gin.H{"notifications": items, "unread_count": count})
}
func (h *CommunicationHandler) MarkRead(c *gin.Context) {
	e := h.service.MarkRead(c.Request.Context(), c.Param("id"), c.GetString("user_id"))
	if errors.Is(e, sql.ErrNoRows) {
		RespondError(c, 404, "Notification not found")
		return
	}
	if e != nil {
		RespondError(c, 500, "Failed to update notification")
		return
	}
	RespondSuccess(c, gin.H{"id": c.Param("id"), "is_read": true})
}
func (h *CommunicationHandler) MarkAllRead(c *gin.Context) {
	if e := h.service.MarkAllRead(c.Request.Context(), c.GetString("user_id")); e != nil {
		RespondError(c, 500, "Failed to update notifications")
		return
	}
	RespondSuccess(c, gin.H{"marked_all_read": true})
}
func (h *CommunicationHandler) ListConversations(c *gin.Context) {
	v, e := h.service.Conversations(c.Request.Context(), c.GetString("user_id"))
	if e != nil {
		RespondError(c, 500, "Failed to retrieve conversations")
		return
	}
	RespondSuccess(c, gin.H{"conversations": v})
}
func (h *CommunicationHandler) CreateConversation(c *gin.Context) {
	var r models.CreateConversationRequest
	if e := c.ShouldBindJSON(&r); e != nil {
		RespondError(c, 400, "Invalid conversation payload")
		return
	}
	v, e := h.service.CreateConversation(c.Request.Context(), c.GetString("user_id"), r)
	if e != nil {
		RespondError(c, 400, "Unable to create conversation", e.Error())
		return
	}
	RespondCreated(c, v)
}
func (h *CommunicationHandler) Conversation(c *gin.Context) {
	v, e := h.service.Conversation(c.Request.Context(), c.Param("id"), c.GetString("user_id"))
	if errors.Is(e, repositories.ErrNotParticipant) {
		RespondError(c, 403, "Forbidden")
		return
	}
	if e != nil {
		RespondError(c, 404, "Conversation not found")
		return
	}
	RespondSuccess(c, v)
}
func (h *CommunicationHandler) Messages(c *gin.Context) {
	v, e := h.service.Messages(c.Request.Context(), c.Param("id"), c.GetString("user_id"), limit(c))
	if errors.Is(e, repositories.ErrNotParticipant) {
		RespondError(c, 403, "Forbidden")
		return
	}
	if e != nil {
		RespondError(c, 500, "Failed to retrieve messages")
		return
	}
	RespondSuccess(c, gin.H{"messages": v})
}
func (h *CommunicationHandler) SendMessage(c *gin.Context) {
	var r models.CreateMessageRequest
	if e := c.ShouldBindJSON(&r); e != nil {
		RespondError(c, 400, "Invalid message payload")
		return
	}
	v, e := h.service.SendMessage(c.Request.Context(), c.Param("id"), c.GetString("user_id"), r.Message)
	if errors.Is(e, repositories.ErrNotParticipant) {
		RespondError(c, 403, "Forbidden")
		return
	}
	if e != nil {
		RespondError(c, 400, "Unable to send message", e.Error())
		return
	}
	RespondCreated(c, v)
}
func (h *CommunicationHandler) MarkMessagesRead(c *gin.Context) {
	e := h.service.MarkConversationRead(c.Request.Context(), c.Param("id"), c.GetString("user_id"))
	if errors.Is(e, repositories.ErrNotParticipant) {
		RespondError(c, 403, "Forbidden")
		return
	}
	if e != nil {
		RespondError(c, 500, "Failed to update read state")
		return
	}
	RespondSuccess(c, gin.H{"marked_read": true})
}
func (h *CommunicationHandler) Activity(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		v, e := h.service.Activity(c.Request.Context(), kind, c.Param("id"), limit(c))
		if e != nil {
			RespondError(c, http.StatusInternalServerError, "Failed to retrieve activity")
			return
		}
		RespondSuccess(c, gin.H{"activity": v})
	}
}
