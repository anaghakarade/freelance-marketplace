package services

import (
	"context"
	"strings"
	"testing"

	"workstream-backend/internal/models"
)

// ──────────────────────────────────────────────────────────────
// Mock communication repository
// ──────────────────────────────────────────────────────────────

type mockCommunicationRepo struct {
	notifications []models.Notification
	conversations map[string]*models.Conversation
	messages      map[string][]*models.Message
	activities    []models.ActivityEvent
}

func newMockCommunicationRepo() *mockCommunicationRepo {
	return &mockCommunicationRepo{
		conversations: make(map[string]*models.Conversation),
		messages:      make(map[string][]*models.Message),
	}
}

func (m *mockCommunicationRepo) Notifications(ctx context.Context, userID string, limit int, unread bool) ([]models.Notification, int, error) {
	var result []models.Notification
	for _, n := range m.notifications {
		if n.UserID == userID {
			if unread && n.IsRead {
				continue
			}
			result = append(result, n)
		}
	}
	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}
	return result, len(result), nil
}

func (m *mockCommunicationRepo) MarkNotificationRead(ctx context.Context, id, userID string) error {
	for i := range m.notifications {
		if m.notifications[i].ID == id && m.notifications[i].UserID == userID {
			m.notifications[i].IsRead = true
			return nil
		}
	}
	return nil
}

func (m *mockCommunicationRepo) MarkAllRead(ctx context.Context, userID string) error {
	for i := range m.notifications {
		if m.notifications[i].UserID == userID {
			m.notifications[i].IsRead = true
		}
	}
	return nil
}

func (m *mockCommunicationRepo) CreateOrGetConversation(ctx context.Context, id, projectID, buyerID, freelancerID string) (*models.Conversation, error) {
	// Return existing conversation if already exists for this pair
	for _, c := range m.conversations {
		if c.ProjectID == projectID {
			return c, nil
		}
	}
	conv := &models.Conversation{
		ID:        id,
		ProjectID: projectID,
		Participants: []models.ConversationParticipant{
			{ConversationID: id, UserID: buyerID},
			{ConversationID: id, UserID: freelancerID},
		},
	}
	m.conversations[id] = conv
	return conv, nil
}

func (m *mockCommunicationRepo) Conversations(ctx context.Context, userID string) ([]models.Conversation, error) {
	var list []models.Conversation
	for _, c := range m.conversations {
		for _, p := range c.Participants {
			if p.UserID == userID {
				list = append(list, *c)
				break
			}
		}
	}
	return list, nil
}

func (m *mockCommunicationRepo) Conversation(ctx context.Context, id, userID string) (*models.Conversation, error) {
	c, ok := m.conversations[id]
	if !ok {
		return nil, nil
	}
	return c, nil
}

func (m *mockCommunicationRepo) Messages(ctx context.Context, conversationID, userID string, limit int) ([]models.Message, error) {
	msgs := m.messages[conversationID]
	var result []models.Message
	for _, msg := range msgs {
		result = append(result, *msg)
	}
	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}

func (m *mockCommunicationRepo) SendMessage(ctx context.Context, msg *models.Message) error {
	m.messages[msg.ConversationID] = append(m.messages[msg.ConversationID], msg)
	return nil
}

func (m *mockCommunicationRepo) MarkConversationRead(ctx context.Context, id, userID string) error {
	return nil
}

func (m *mockCommunicationRepo) Activity(ctx context.Context, entityType, entityID string, limit int) ([]models.ActivityEvent, error) {
	return m.activities, nil
}

func (m *mockCommunicationRepo) CreateNotification(ctx context.Context, n *models.Notification) error {
	m.notifications = append(m.notifications, *n)
	return nil
}

func (m *mockCommunicationRepo) RecordActivity(ctx context.Context, a *models.ActivityEvent) error {
	m.activities = append(m.activities, *a)
	return nil
}

// ──────────────────────────────────────────────────────────────
// SendMessage tests
// ──────────────────────────────────────────────────────────────

// TestCommunication_SendMessage_Valid verifies that a non-empty message can be sent.
func TestCommunication_SendMessage_Valid(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	msg, err := svc.SendMessage(ctx, "cnv_1", "usr_buyer_1", "Hello, I am interested in this project!")
	if err != nil {
		t.Fatalf("SendMessage failed: %v", err)
	}
	if msg == nil {
		t.Fatalf("expected non-nil message, got nil")
	}
	if msg.SenderID != "usr_buyer_1" {
		t.Errorf("expected SenderID=usr_buyer_1, got %q", msg.SenderID)
	}
	if msg.ConversationID != "cnv_1" {
		t.Errorf("expected ConversationID=cnv_1, got %q", msg.ConversationID)
	}
}

// TestCommunication_SendMessage_EmptyBody verifies that an empty message is rejected.
func TestCommunication_SendMessage_EmptyBody(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	_, err := svc.SendMessage(ctx, "cnv_1", "usr_buyer_1", "")
	if err == nil {
		t.Fatalf("expected error for empty message body, got nil")
	}
}

// TestCommunication_SendMessage_WhitespaceOnly verifies that a whitespace-only message
// is treated as empty and rejected.
func TestCommunication_SendMessage_WhitespaceOnly(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	_, err := svc.SendMessage(ctx, "cnv_1", "usr_buyer_1", "   \t\n  ")
	if err == nil {
		t.Fatalf("expected error for whitespace-only message, got nil")
	}
}

// TestCommunication_SendMessage_OversizedBody verifies that a message over 4000
// characters is rejected.
func TestCommunication_SendMessage_OversizedBody(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	bigMsg := strings.Repeat("a", 4001)
	_, err := svc.SendMessage(ctx, "cnv_1", "usr_buyer_1", bigMsg)
	if err == nil {
		t.Fatalf("expected error for message > 4000 chars, got nil")
	}
}

// TestCommunication_SendMessage_ExactMaxLength verifies that exactly 4000 characters
// is accepted.
func TestCommunication_SendMessage_ExactMaxLength(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	exactMsg := strings.Repeat("x", 4000)
	msg, err := svc.SendMessage(ctx, "cnv_1", "usr_buyer_1", exactMsg)
	if err != nil {
		t.Fatalf("expected 4000-char message to be accepted, got error: %v", err)
	}
	if len(msg.Message) != 4000 {
		t.Errorf("expected message length 4000, got %d", len(msg.Message))
	}
}

// ──────────────────────────────────────────────────────────────
// CreateConversation tests
// ──────────────────────────────────────────────────────────────

// TestCommunication_CreateConversation_Valid verifies a buyer can create a conversation
// with a freelancer for a project.
func TestCommunication_CreateConversation_Valid(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	conv, err := svc.CreateConversation(ctx, "usr_buyer_1", models.CreateConversationRequest{
		ProjectID:    "prj_1",
		FreelancerID: "usr_free_1",
	})
	if err != nil {
		t.Fatalf("CreateConversation failed: %v", err)
	}
	if conv == nil {
		t.Fatalf("expected non-nil conversation, got nil")
	}
	if conv.ProjectID != "prj_1" {
		t.Errorf("expected ProjectID=prj_1, got %q", conv.ProjectID)
	}
	// Verify both participants are present
	if len(conv.Participants) != 2 {
		t.Errorf("expected 2 participants, got %d", len(conv.Participants))
	}
}

// TestCommunication_CreateConversation_MissingProjectID verifies that a missing
// project ID causes an error.
func TestCommunication_CreateConversation_MissingProjectID(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	_, err := svc.CreateConversation(ctx, "usr_buyer_1", models.CreateConversationRequest{
		ProjectID:    "",
		FreelancerID: "usr_free_1",
	})
	if err == nil {
		t.Fatalf("expected error for missing projectId, got nil")
	}
}

// TestCommunication_CreateConversation_MissingFreelancerID verifies that a missing
// freelancer ID causes an error.
func TestCommunication_CreateConversation_MissingFreelancerID(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	_, err := svc.CreateConversation(ctx, "usr_buyer_1", models.CreateConversationRequest{
		ProjectID:    "prj_1",
		FreelancerID: "",
	})
	if err == nil {
		t.Fatalf("expected error for missing freelancerId, got nil")
	}
}

// TestCommunication_CreateConversation_SelfConversation verifies that a user cannot
// start a conversation with themselves.
func TestCommunication_CreateConversation_SelfConversation(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	_, err := svc.CreateConversation(ctx, "usr_buyer_1", models.CreateConversationRequest{
		ProjectID:    "prj_1",
		FreelancerID: "usr_buyer_1", // same as caller
	})
	if err == nil {
		t.Fatalf("expected error for self-conversation, got nil")
	}
}

// TestCommunication_CreateConversation_Idempotent verifies that creating a conversation
// for the same project returns the existing one (no duplicate creation).
func TestCommunication_CreateConversation_Idempotent(t *testing.T) {
	repo := newMockCommunicationRepo()
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	conv1, err := svc.CreateConversation(ctx, "usr_buyer_1", models.CreateConversationRequest{
		ProjectID: "prj_1", FreelancerID: "usr_free_1",
	})
	if err != nil {
		t.Fatalf("first CreateConversation failed: %v", err)
	}

	conv2, err := svc.CreateConversation(ctx, "usr_buyer_1", models.CreateConversationRequest{
		ProjectID: "prj_1", FreelancerID: "usr_free_1",
	})
	if err != nil {
		t.Fatalf("second CreateConversation failed: %v", err)
	}

	if conv1.ID != conv2.ID {
		t.Errorf("expected same conversation returned, got different IDs: %q vs %q", conv1.ID, conv2.ID)
	}
}

// ──────────────────────────────────────────────────────────────
// Notification tests
// ──────────────────────────────────────────────────────────────

// TestCommunication_Notifications_LimitClamp verifies out-of-bounds limits are clamped
// to the default of 30.
func TestCommunication_Notifications_LimitClamp(t *testing.T) {
	repo := newMockCommunicationRepo()
	// Seed 50 notifications for the test user
	for i := 0; i < 50; i++ {
		repo.notifications = append(repo.notifications, models.Notification{
			ID:     "ntf_" + string(rune('a'+i%26)),
			UserID: "usr_1",
		})
	}
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	// limit=0 → default 30
	result, _, err := svc.Notifications(ctx, "usr_1", 0, false)
	if err != nil {
		t.Fatalf("Notifications failed: %v", err)
	}
	if len(result) != 30 {
		t.Errorf("expected 30 notifications for limit=0, got %d", len(result))
	}

	// limit=200 → default 30
	result2, _, err := svc.Notifications(ctx, "usr_1", 200, false)
	if err != nil {
		t.Fatalf("Notifications failed: %v", err)
	}
	if len(result2) != 30 {
		t.Errorf("expected 30 notifications for limit=200, got %d", len(result2))
	}
}

// TestCommunication_MarkAllRead verifies MarkAllRead correctly marks all user
// notifications as read.
func TestCommunication_MarkAllRead(t *testing.T) {
	repo := newMockCommunicationRepo()
	for i := 0; i < 3; i++ {
		repo.notifications = append(repo.notifications, models.Notification{
			ID:     "ntf_test",
			UserID: "usr_1",
			IsRead: false,
		})
	}
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	if err := svc.MarkAllRead(ctx, "usr_1"); err != nil {
		t.Fatalf("MarkAllRead failed: %v", err)
	}
	for _, n := range repo.notifications {
		if n.UserID == "usr_1" && !n.IsRead {
			t.Errorf("expected notification %q to be marked read", n.ID)
		}
	}
}

// TestCommunication_Messages_LimitClamp verifies the messages limit is clamped
// to the default of 50 for invalid values.
func TestCommunication_Messages_LimitClamp(t *testing.T) {
	repo := newMockCommunicationRepo()
	// Seed 60 messages in a conversation
	for i := 0; i < 60; i++ {
		repo.messages["cnv_test"] = append(repo.messages["cnv_test"], &models.Message{
			ID: "msg_test", ConversationID: "cnv_test", SenderID: "usr_1", Message: "hello",
		})
	}
	svc := NewCommunicationService(repo)
	ctx := context.Background()

	// limit=0 → default 50
	msgs, err := svc.Messages(ctx, "cnv_test", "usr_1", 0)
	if err != nil {
		t.Fatalf("Messages failed: %v", err)
	}
	if len(msgs) != 50 {
		t.Errorf("expected 50 messages for limit=0, got %d", len(msgs))
	}
}
