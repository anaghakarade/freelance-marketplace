-- Rollback: 000003_add_auth_to_users
-- Remove auth fields added in 000003_add_auth_to_users.up.sql

DROP INDEX IF EXISTS idx_users_email_unique;
DROP INDEX IF EXISTS idx_users_email;

ALTER TABLE users
    DROP COLUMN IF EXISTS password_hash,
    DROP COLUMN IF EXISTS is_active;
