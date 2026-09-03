-- Migration: 000003_add_auth_to_users
-- Adds password_hash and is_active columns to users table for Phase 2 authentication

-- Add password_hash column (stores bcrypt hash, never plain text)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';

-- Add is_active column for soft-disable without deletion
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Ensure email has a unique index (prevent duplicate accounts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

-- Create index for faster lookup by email during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- Update status of seeded test users to reflect is_active correctly
UPDATE users SET is_active = TRUE WHERE status = 'active';
UPDATE users SET is_active = FALSE WHERE status IN ('inactive', 'suspended');

-- Set bcrypt hash for password 'workstream123' (cost 10) for all seed users
-- Hash: $2a$10$52u5s7EQ8Z36x/hAeEPDj.A0NqP1ZevAFCm8gQqrEo2S0QNl7soAi
UPDATE users SET password_hash = '$2a$10$52u5s7EQ8Z36x/hAeEPDj.A0NqP1ZevAFCm8gQqrEo2S0QNl7soAi'
WHERE id IN ('usr_1','usr_2','usr_3','usr_4','usr_5','usr_6','usr_7','usr_8','usr_9','usr_11','usr_12');

-- Set admin password hash for 'admin123' (cost 10)
-- Hash: $2a$10$MiPKNgjEswfpvRz1SDLqLOBHXESgCXp.eg55xf.9n9A70t7IZf76W
UPDATE users SET password_hash = '$2a$10$MiPKNgjEswfpvRz1SDLqLOBHXESgCXp.eg55xf.9n9A70t7IZf76W'
WHERE role = 'admin' OR id = 'usr_10';
