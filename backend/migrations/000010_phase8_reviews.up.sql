-- Phase 8: contract reviews. Preserve Phase 1–4 service reviews if present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'reviews'
          AND column_name = 'service_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'reviews'
          AND column_name = 'reviewer_id'
    ) THEN
        ALTER TABLE reviews RENAME TO service_reviews;
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_reviews_service_id') THEN
            ALTER INDEX idx_reviews_service_id RENAME TO idx_service_reviews_service_id;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_reviews_user_id') THEN
            ALTER INDEX idx_reviews_user_id RENAME TO idx_service_reviews_user_id;
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewee_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL DEFAULT '' CHECK (length(comment) <= 2000),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_reviews_not_self CHECK (reviewer_id <> reviewee_id),
    CONSTRAINT uq_reviews_contract_direction UNIQUE (contract_id, reviewer_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created ON reviews (reviewee_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_created ON reviews (reviewer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_contract ON reviews (contract_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews (rating);
