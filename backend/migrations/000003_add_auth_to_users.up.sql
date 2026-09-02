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
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y
UPDATE users SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'
WHERE id IN ('usr_1','usr_2','usr_3','usr_4','usr_5','usr_6','usr_7','usr_8','usr_9','usr_10','usr_11','usr_12');

-- Set admin password hash for 'admin123' (cost 10)
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
UPDATE users SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE role = 'admin';
