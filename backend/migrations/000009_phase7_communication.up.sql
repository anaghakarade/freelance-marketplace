-- Phase 7: persistent notifications, contextual conversations, and activity history.
CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(48) NOT NULL CHECK (type IN ('proposal_received','proposal_accepted','proposal_rejected','contract_created','milestone_created','milestone_started','milestone_submitted','milestone_approved','revision_requested','payment_funded','payment_released','payment_refunded','project_deadline_approaching','new_message','new_review','system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

CREATE TABLE conversations (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    participant_key VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_conversations_project_participants UNIQUE(project_id, participant_key)
);
CREATE INDEX idx_conversations_project ON conversations(project_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

CREATE TABLE conversation_participants (
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY(conversation_id, user_id)
);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);

CREATE TABLE messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL CHECK (length(trim(message)) > 0 AND length(message) <= 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_created ON messages(sender_id, created_at DESC);

CREATE TABLE activity_events (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_entity_created ON activity_events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_actor_created ON activity_events(actor_id, created_at DESC);
CREATE INDEX idx_activity_created ON activity_events(created_at DESC);
