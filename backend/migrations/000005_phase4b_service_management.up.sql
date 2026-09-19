-- Migration: 000005_phase4b_service_management.up.sql
-- WorkStream Phase 4B: Seller Service Management, Lifecycle & Package Transactions

-- 1. Add published_at column to services table
ALTER TABLE services
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 2. Ensure cover_image column has a default value or is nullable for drafts
ALTER TABLE services
    ALTER COLUMN cover_image SET DEFAULT 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80';

-- 3. Set published_at for existing published services
UPDATE services
SET published_at = created_at
WHERE status = 'published' AND published_at IS NULL;

-- 4. Create composite indexes for seller querying and status lifecycle filtering
CREATE INDEX IF NOT EXISTS idx_services_seller_status ON services(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_services_status_created ON services(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_published_at ON services(published_at DESC) WHERE status = 'published';
