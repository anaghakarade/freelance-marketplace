-- Phase 10: Intelligent Search, Freelancer Matching & Personalized Discovery

-- 1. Optimized Search Indexes
CREATE INDEX IF NOT EXISTS idx_services_tags_gin ON services USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_services_status_rating ON services (status, rating DESC, review_count DESC);
CREATE INDEX IF NOT EXISTS idx_services_status_price ON services (status, starting_price);
CREATE INDEX IF NOT EXISTS idx_services_status_delivery ON services (status, delivery_days);

-- GIN indexes for array/jsonb skill matching
CREATE INDEX IF NOT EXISTS idx_users_skills_gin ON users USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_projects_skills_gin ON projects USING GIN (skills);

-- 2. User Interactions Table for Explainable, Deterministic Recommendations
CREATE TABLE IF NOT EXISTS user_interactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(32) NOT NULL CHECK (interaction_type IN ('view_service', 'search', 'favorite', 'hire', 'click')),
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('service', 'category', 'freelancer', 'project')),
    target_id VARCHAR(64) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type ON user_interactions (user_id, interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_target ON user_interactions (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions (created_at DESC);
