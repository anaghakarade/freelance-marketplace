-- Migration: 000007_create_contracts_and_milestones
-- Description: Creates contracts, milestones, and milestone_submissions tables for Phase 6A

-- 1. Ensure completed_at column exists on projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    proposal_id VARCHAR(64) NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    buyer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    freelancer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    agreed_budget NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(16) NOT NULL DEFAULT 'USD',
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_end_date TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_contracts_proposal_id UNIQUE(proposal_id),
    CONSTRAINT uq_contracts_project_id UNIQUE(project_id),
    CONSTRAINT chk_contracts_budget CHECK (agreed_budget >= 0),
    CONSTRAINT chk_contracts_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'disputed'))
);

-- 3. Milestones Table
CREATE TABLE IF NOT EXISTS milestones (
    id VARCHAR(64) PRIMARY KEY,
    contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sequence_number INT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(16) NOT NULL DEFAULT 'USD',
    due_date TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_milestones_contract_sequence UNIQUE(contract_id, sequence_number),
    CONSTRAINT chk_milestones_amount CHECK (amount >= 0),
    CONSTRAINT chk_milestones_sequence CHECK (sequence_number > 0),
    CONSTRAINT chk_milestones_status CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'revision_requested', 'cancelled'))
);

-- 4. Milestone Submissions Table
CREATE TABLE IF NOT EXISTS milestone_submissions (
    id VARCHAR(64) PRIMARY KEY,
    milestone_id VARCHAR(64) NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    submitted_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachment_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    review_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT chk_milestone_submissions_status CHECK (status IN ('submitted', 'approved', 'revision_requested'))
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON contracts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_buyer_id ON contracts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_freelancer_id ON contracts(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_milestones_contract_id ON milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_sequence ON milestones(contract_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_milestone_submissions_milestone_id ON milestone_submissions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_submissions_submitted_by ON milestone_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_milestone_submissions_status ON milestone_submissions(status);
CREATE INDEX IF NOT EXISTS idx_milestone_submissions_created_at ON milestone_submissions(created_at DESC);
