-- Phase 9: Admin, Moderation, Reports & Audit Governance

CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    reporter_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('user', 'service', 'project', 'review', 'message')),
    target_id VARCHAR(64) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
    assigned_admin_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
