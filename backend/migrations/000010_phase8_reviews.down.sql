DROP TABLE IF EXISTS reviews;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE service_reviews RENAME TO reviews;
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_service_reviews_service_id') THEN
            ALTER INDEX idx_service_reviews_service_id RENAME TO idx_reviews_service_id;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_service_reviews_user_id') THEN
            ALTER INDEX idx_service_reviews_user_id RENAME TO idx_reviews_user_id;
        END IF;
    END IF;
END $$;
