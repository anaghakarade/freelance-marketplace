package models

import "time"

type Notification struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	Type       string    `json:"type"`
	Title      string    `json:"title"`
	Message    string    `json:"message"`
	EntityType string    `json:"entityType"`
	EntityID   string    `json:"entityId"`
	IsRead     bool      `json:"isRead"`
	CreatedAt  time.Time `json:"createdAt"`
}
type Conversation struct {
	ID            string                    `json:"id"`
	ProjectID     string                    `json:"projectId"`
	Participants  []ConversationParticipant `json:"participants,omitempty"`
	CreatedAt     time.Time                 `json:"createdAt"`
	UpdatedAt     time.Time                 `json:"updatedAt"`
	LatestMessage *Message                  `json:"latestMessage,omitempty"`
	UnreadCount   int                       `json:"unreadCount"`
}
type ConversationParticipant struct {
	ConversationID string     `json:"conversationId"`
	UserID         string     `json:"userId"`
	Name           string     `json:"name,omitempty"`
	JoinedAt       time.Time  `json:"joinedAt"`
	LastReadAt     *time.Time `json:"lastReadAt,omitempty"`
}
type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	SenderID       string    `json:"senderId"`
	Message        string    `json:"message"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}
type ActivityEvent struct {
	ID          string                 `json:"id"`
	ActorID     *string                `json:"actorId,omitempty"`
	EntityType  string                 `json:"entityType"`
	EntityID    string                 `json:"entityId"`
	Action      string                 `json:"action"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata"`
	CreatedAt   time.Time              `json:"createdAt"`
}
type CreateConversationRequest struct {
	ProjectID    string `json:"projectId"`
	FreelancerID string `json:"freelancerId"`
}
type CreateMessageRequest struct {
	Message string `json:"message" binding:"required"`
}
