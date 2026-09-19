-- Migration: 000005_phase4b_service_management.down.sql
-- Reverts Phase 4B schema changes

DROP INDEX IF EXISTS idx_services_published_at;
DROP INDEX IF EXISTS idx_services_status_created;
DROP INDEX IF EXISTS idx_services_seller_status;

ALTER TABLE services
    DROP COLUMN IF EXISTS published_at;
