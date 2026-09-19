-- Phase 6B: internal escrow simulation. Monetary values are integer minor units.
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    payment_reference VARCHAR(64) NOT NULL UNIQUE,
    contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    milestone_id VARCHAR(64) NOT NULL UNIQUE REFERENCES milestones(id) ON DELETE RESTRICT,
    buyer_id VARCHAR(64) NOT NULL REFERENCES users(id),
    freelancer_id VARCHAR(64) NOT NULL REFERENCES users(id),
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    platform_fee_minor BIGINT NOT NULL CHECK (platform_fee_minor >= 0),
    freelancer_amount_minor BIGINT NOT NULL CHECK (freelancer_amount_minor >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','funded','held','released','refund_pending','refunded','failed','cancelled')),
    provider VARCHAR(24) NOT NULL DEFAULT 'internal' CHECK (provider IN ('internal','razorpay','stripe','other')),
    provider_payment_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), funded_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ, refunded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    available_balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (available_balance_minor >= 0),
    pending_balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (pending_balance_minor >= 0),
    total_earned_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_earned_minor >= 0),
    total_withdrawn_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_withdrawn_minor >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'INR', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    transaction_reference VARCHAR(96) NOT NULL UNIQUE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    payment_id VARCHAR(64) NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    milestone_id VARCHAR(64) NOT NULL REFERENCES milestones(id) ON DELETE RESTRICT,
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('milestone_funded','platform_fee','freelancer_earning','milestone_release','refund','withdrawal','adjustment')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0), currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    description TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_freelancer_id ON payments(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_payment_id ON ledger_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_ledger_contract_id ON ledger_entries(contract_id);
