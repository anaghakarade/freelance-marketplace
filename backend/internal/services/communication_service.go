package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync/atomic"
	"time"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var communicationCounter uint64

type CommunicationService interface {
	Notifications(context.Context, string, int, bool) ([]models.Notification, int, error)
	MarkRead(context.Context, string, string) error
	MarkAllRead(context.Context, string) error
	CreateConversation(context.Context, string, models.CreateConversationRequest) (*models.Conversation, error)
	Conversations(context.Context, string) ([]models.Conversation, error)
	Conversation(context.Context, string, string) (*models.Conversation, error)
	Messages(context.Context, string, string, int) ([]models.Message, error)
	SendMessage(context.Context, string, string, string) (*models.Message, error)
	MarkConversationRead(context.Context, string, string) error
	Activity(context.Context, string, string, int) ([]models.ActivityEvent, error)
	CreateNotification(context.Context, string, string, string, string, string, string) error
	RecordActivity(context.Context, *models.ActivityEvent) error
}
type communicationService struct {
	repo repositories.CommunicationRepository
}

func NewCommunicationService(repo repositories.CommunicationRepository) CommunicationService {
	return &communicationService{repo}
}
func communicationID(prefix string) string {
	return fmt.Sprintf("%s_%d_%d", prefix, time.Now().UnixMilli(), atomic.AddUint64(&communicationCounter, 1))
}
func (s *communicationService) Notifications(c context.Context, u string, l int, unread bool) ([]models.Notification, int, error) {
	if l < 1 || l > 100 {
		l = 30
	}
	return s.repo.Notifications(c, u, l, unread)
}
func (s *communicationService) MarkRead(c context.Context, id, u string) error {
	return s.repo.MarkNotificationRead(c, id, u)
}
func (s *communicationService) MarkAllRead(c context.Context, u string) error {
	return s.repo.MarkAllRead(c, u)
}
func (s *communicationService) CreateConversation(c context.Context, u string, r models.CreateConversationRequest) (*models.Conversation, error) {
	if r.ProjectID == "" || r.FreelancerID == "" {
		return nil, errors.New("projectId and freelancerId are required")
	}
	if u == r.FreelancerID {
		return nil, errors.New("a conversation requires two participants")
	}
	return s.repo.CreateOrGetConversation(c, communicationID("cnv"), r.ProjectID, u, r.FreelancerID)
}
func (s *communicationService) Conversations(c context.Context, u string) ([]models.Conversation, error) {
	return s.repo.Conversations(c, u)
}
func (s *communicationService) Conversation(c context.Context, id, u string) (*models.Conversation, error) {
	return s.repo.Conversation(c, id, u)
}
func (s *communicationService) Messages(c context.Context, id, u string, l int) ([]models.Message, error) {
	if l < 1 || l > 100 {
		l = 50
	}
	return s.repo.Messages(c, id, u, l)
}
func (s *communicationService) SendMessage(c context.Context, id, u, body string) (*models.Message, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, errors.New("message cannot be empty")
	}
	if len(body) > 4000 {
		return nil, errors.New("message must not exceed 4000 characters")
	}
	m := &models.Message{ID: communicationID("msg"), ConversationID: id, SenderID: u, Message: body}
	if e := s.repo.SendMessage(c, m); e != nil {
		return nil, e
	}
	return m, nil
}
func (s *communicationService) MarkConversationRead(c context.Context, id, u string) error {
	return s.repo.MarkConversationRead(c, id, u)
}
func (s *communicationService) Activity(c context.Context, t, id string, l int) ([]models.ActivityEvent, error) {
	if l < 1 || l > 100 {
		l = 50
	}
	return s.repo.Activity(c, t, id, l)
}
func (s *communicationService) CreateNotification(c context.Context, u, t, title, msg, et, eid string) error {
	return s.repo.CreateNotification(c, &models.Notification{ID: communicationID("ntf"), UserID: u, Type: t, Title: title, Message: msg, EntityType: et, EntityID: eid})
}
func (s *communicationService) RecordActivity(c context.Context, a *models.ActivityEvent) error {
	if a.ID == "" {
		a.ID = communicationID("act")
	}
	return s.repo.RecordActivity(c, a)
}
