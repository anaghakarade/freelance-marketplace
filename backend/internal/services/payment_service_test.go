package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

// ──────────────────────────────────────────────────────────────
// Mock repositories
// ──────────────────────────────────────────────────────────────

type mockPaymentRepo struct {
	payments map[string]*models.Payment
	wallets  map[string]*models.Wallet
	ledger   []models.LedgerEntry
}

func newMockPaymentRepo() *mockPaymentRepo {
	return &mockPaymentRepo{
		payments: make(map[string]*models.Payment),
		wallets:  make(map[string]*models.Wallet),
	}
}

func (m *mockPaymentRepo) FundTx(ctx context.Context, p *models.Payment) error {
	m.payments[p.ID] = p
	return nil
}

func (m *mockPaymentRepo) ReleaseTx(ctx context.Context, id string, releasedAt time.Time) error {
	p, ok := m.payments[id]
	if !ok {
		return repositories.ErrPaymentNotFound
	}
	if p.Status != models.PaymentStatusHeld {
		return repositories.ErrPaymentConflict
	}
	p.Status = models.PaymentStatusReleased
	p.ReleasedAt = &releasedAt
	return nil
}

func (m *mockPaymentRepo) RefundTx(ctx context.Context, id string, refundedAt time.Time) error {
	p, ok := m.payments[id]
	if !ok {
		return repositories.ErrPaymentNotFound
	}
	if p.Status != models.PaymentStatusHeld {
		return repositories.ErrPaymentConflict
	}
	p.Status = models.PaymentStatusRefunded
	p.RefundedAt = &refundedAt
	return nil
}

func (m *mockPaymentRepo) GetByID(ctx context.Context, id string) (*models.Payment, error) {
	p, ok := m.payments[id]
	if !ok {
		return nil, repositories.ErrPaymentNotFound
	}
	return p, nil
}

func (m *mockPaymentRepo) GetByMilestoneID(ctx context.Context, milestoneID string) (*models.Payment, error) {
	for _, p := range m.payments {
		if p.MilestoneID == milestoneID {
			return p, nil
		}
	}
	return nil, repositories.ErrPaymentNotFound
}

func (m *mockPaymentRepo) GetByContractID(ctx context.Context, contractID string) ([]models.Payment, error) {
	var list []models.Payment
	for _, p := range m.payments {
		if p.ContractID == contractID {
			list = append(list, *p)
		}
	}
	return list, nil
}

func (m *mockPaymentRepo) GetByUserID(ctx context.Context, userID string) ([]models.Payment, error) {
	var list []models.Payment
	for _, p := range m.payments {
		if p.BuyerID == userID || p.FreelancerID == userID {
			list = append(list, *p)
		}
	}
	return list, nil
}

func (m *mockPaymentRepo) GetWallet(ctx context.Context, userID string) (*models.Wallet, error) {
	w, ok := m.wallets[userID]
	if !ok {
		return nil, repositories.ErrWalletNotFound
	}
	return w, nil
}

func (m *mockPaymentRepo) GetLedger(ctx context.Context, userID string) ([]models.LedgerEntry, error) {
	return m.ledger, nil
}

// ──────────────────────────────────────────────────────────────
// Helper to build a standard test environment
// ──────────────────────────────────────────────────────────────

type paymentTestEnv struct {
	payRepo      *mockPaymentRepo
	milestoneRepo *mockMilestoneRepo
	contractRepo  *mockContractRepo
	svc          PaymentService

	contract  *models.Contract
	milestone *models.Milestone
}

func newPaymentTestEnv() *paymentTestEnv {
	payRepo := newMockPaymentRepo()
	contractRepo := newMockContractRepo()
	milestoneRepo := newMockMilestoneRepo()

	contract := &models.Contract{
		ID:           "ctr_pay_1",
		ProjectID:    "prj_pay_1",
		BuyerID:      "usr_buyer_1",
		FreelancerID: "usr_free_1",
		Status:       models.ContractStatusActive,
		CreatedAt:    time.Now().UTC(),
	}
	contractRepo.contracts[contract.ID] = contract

	milestone := &models.Milestone{
		ID:             "ms_pay_1",
		ContractID:     contract.ID,
		Title:          "Backend API",
		Amount:         500.00, // 500 INR → 50000 minor units
		Status:         models.MilestoneStatusPending,
		SequenceNumber: 1,
	}
	milestoneRepo.milestones[milestone.ID] = milestone

	svc := NewPaymentService(payRepo, milestoneRepo, contractRepo)

	return &paymentTestEnv{
		payRepo:       payRepo,
		milestoneRepo: milestoneRepo,
		contractRepo:  contractRepo,
		svc:           svc,
		contract:      contract,
		milestone:     milestone,
	}
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

// TestPayment_FundMilestone_Success verifies a buyer can fund a pending milestone
// and that the resulting payment has the correct amount, fee, and held status.
func TestPayment_FundMilestone_Success(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	payment, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}

	// Amount: 500 * 100 = 50000 minor, fee = 10% = 5000, net = 45000
	if payment.AmountMinor != 50000 {
		t.Errorf("expected AmountMinor=50000, got %d", payment.AmountMinor)
	}
	if payment.PlatformFeeMinor != 5000 {
		t.Errorf("expected PlatformFeeMinor=5000 (10%%), got %d", payment.PlatformFeeMinor)
	}
	if payment.FreelancerAmountMinor != 45000 {
		t.Errorf("expected FreelancerAmountMinor=45000, got %d", payment.FreelancerAmountMinor)
	}
	if payment.Status != models.PaymentStatusHeld {
		t.Errorf("expected status=%q, got %q", models.PaymentStatusHeld, payment.Status)
	}
	if payment.BuyerID != env.contract.BuyerID {
		t.Errorf("expected BuyerID=%q, got %q", env.contract.BuyerID, payment.BuyerID)
	}
	if payment.FreelancerID != env.contract.FreelancerID {
		t.Errorf("expected FreelancerID=%q, got %q", env.contract.FreelancerID, payment.FreelancerID)
	}
}

// TestPayment_FundMilestone_Forbidden verifies that a non-buyer cannot fund a milestone.
func TestPayment_FundMilestone_Forbidden(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	_, err := env.svc.FundMilestone(ctx, env.milestone.ID, "usr_stranger", "buyer")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got: %v", err)
	}
}

// TestPayment_FundMilestone_Freelancer_Forbidden ensures freelancers cannot fund.
func TestPayment_FundMilestone_Freelancer_Forbidden(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	_, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.FreelancerID, "freelancer")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for freelancer, got: %v", err)
	}
}

// TestPayment_FundMilestone_MustBePending verifies only pending milestones can be funded.
func TestPayment_FundMilestone_MustBePending(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	// Change milestone to in_progress
	env.milestone.Status = models.MilestoneStatusInProgress

	_, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if !errors.Is(err, ErrInvalidMilestoneState) {
		t.Fatalf("expected ErrInvalidMilestoneState for non-pending milestone, got: %v", err)
	}
}

// TestPayment_FundMilestone_DoubleFund verifies idempotency guard prevents double-funding.
func TestPayment_FundMilestone_DoubleFund(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	// First fund — success
	_, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("first FundMilestone failed: %v", err)
	}

	// Reset milestone status to pending (simulating a race condition attempt)
	env.milestone.Status = models.MilestoneStatusPending

	// Second fund — should be blocked by existing payment
	_, err = env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if !errors.Is(err, repositories.ErrPaymentConflict) {
		t.Fatalf("expected ErrPaymentConflict for double-fund, got: %v", err)
	}
}

// TestPayment_FundMilestone_ZeroAmount ensures a zero or negative milestone amount is rejected.
func TestPayment_FundMilestone_ZeroAmount(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	env.milestone.Amount = 0.0 // zero amount

	_, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err == nil {
		t.Fatalf("expected error for zero-amount milestone, got nil")
	}
}

// TestPayment_Release_Success verifies the buyer can release a held payment
// after the milestone is approved.
func TestPayment_Release_Success(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	// Fund it
	p, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}

	// Approve milestone
	env.milestone.Status = models.MilestoneStatusApproved

	// Release
	err = env.svc.ReleasePayment(ctx, p.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("ReleasePayment failed: %v", err)
	}

	released, _ := env.payRepo.GetByID(ctx, p.ID)
	if released.Status != models.PaymentStatusReleased {
		t.Errorf("expected status=%q, got %q", models.PaymentStatusReleased, released.Status)
	}
	if released.ReleasedAt == nil {
		t.Errorf("expected ReleasedAt to be set after release")
	}
}

// TestPayment_Release_Forbidden ensures a non-buyer cannot release a payment.
func TestPayment_Release_Forbidden(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	p, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}
	env.milestone.Status = models.MilestoneStatusApproved

	err = env.svc.ReleasePayment(ctx, p.ID, "usr_stranger", "buyer")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for stranger release, got: %v", err)
	}
}

// TestPayment_Release_MilestoneNotApproved ensures release is blocked when milestone is not approved.
func TestPayment_Release_MilestoneNotApproved(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	p, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}

	// Do NOT approve the milestone — keep it pending
	err = env.svc.ReleasePayment(ctx, p.ID, env.contract.BuyerID, "buyer")
	if !errors.Is(err, ErrInvalidMilestoneState) {
		t.Fatalf("expected ErrInvalidMilestoneState when releasing unapproved milestone, got: %v", err)
	}
}

// TestPayment_DoubleRelease ensures releasing a payment twice results in a conflict.
func TestPayment_DoubleRelease(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	p, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}
	env.milestone.Status = models.MilestoneStatusApproved

	// First release — success
	if err = env.svc.ReleasePayment(ctx, p.ID, env.contract.BuyerID, "buyer"); err != nil {
		t.Fatalf("first ReleasePayment failed: %v", err)
	}

	// Second release — must fail (state is no longer "held")
	err = env.svc.ReleasePayment(ctx, p.ID, env.contract.BuyerID, "buyer")
	if !errors.Is(err, repositories.ErrPaymentConflict) {
		t.Fatalf("expected ErrPaymentConflict for double release, got: %v", err)
	}
}

// TestPayment_Refund_Success verifies a buyer can refund a held payment.
func TestPayment_Refund_Success(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	p, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}

	err = env.svc.RefundPayment(ctx, p.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("RefundPayment failed: %v", err)
	}

	refunded, _ := env.payRepo.GetByID(ctx, p.ID)
	if refunded.Status != models.PaymentStatusRefunded {
		t.Errorf("expected status=%q, got %q", models.PaymentStatusRefunded, refunded.Status)
	}
	if refunded.RefundedAt == nil {
		t.Errorf("expected RefundedAt to be set after refund")
	}
}

// TestPayment_DoubleRefund verifies that refunding an already-refunded payment fails.
func TestPayment_DoubleRefund(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	p, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}

	// First refund — success
	if err = env.svc.RefundPayment(ctx, p.ID, env.contract.BuyerID, "buyer"); err != nil {
		t.Fatalf("first RefundPayment failed: %v", err)
	}

	// Second refund — must fail
	err = env.svc.RefundPayment(ctx, p.ID, env.contract.BuyerID, "buyer")
	if !errors.Is(err, repositories.ErrPaymentConflict) {
		t.Fatalf("expected ErrPaymentConflict for double refund, got: %v", err)
	}
}

// TestPayment_GetWallet_NoWallet verifies that GetWallet returns an empty wallet
// (not an error) when the user has no wallet record yet.
func TestPayment_GetWallet_NoWallet(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	wallet, err := env.svc.GetWallet(ctx, "usr_new_user")
	if err != nil {
		t.Fatalf("GetWallet for new user should return empty wallet, got error: %v", err)
	}
	if wallet == nil {
		t.Fatalf("expected non-nil wallet, got nil")
	}
	if wallet.UserID != "usr_new_user" {
		t.Errorf("expected UserID=usr_new_user, got %q", wallet.UserID)
	}
	if wallet.AvailableBalanceMinor != 0 {
		t.Errorf("expected zero balance for new wallet, got %d", wallet.AvailableBalanceMinor)
	}
}

// TestPayment_PlatformFeeCalculation verifies that 10% platform fee is applied correctly
// for a range of milestone amounts.
func TestPayment_PlatformFeeCalculation(t *testing.T) {
	cases := []struct {
		amountINR      float64
		expectedMinor  int64
		expectedFee    int64
		expectedNet    int64
	}{
		{100.00, 10000, 1000, 9000},
		{250.00, 25000, 2500, 22500},
		{999.99, 99999, 9999, 89999 + 1}, // 99999 - 9999 = 90000? let's compute: 99999*10/100=9999.9→9999 int; net=90000
		{1000.00, 100000, 10000, 90000},
	}
	// Recompute edge case: 999.99 → minor=99999, fee=99999*10/100=9999 (int div), net=99999-9999=90000
	cases[2].expectedFee = 9999
	cases[2].expectedNet = 90000

	for _, c := range cases {
		contractRepo := newMockContractRepo()
		milestoneRepo := newMockMilestoneRepo()
		payRepo := newMockPaymentRepo()

		contract := &models.Contract{
			ID: "ctr_fee_test", BuyerID: "b1", FreelancerID: "f1",
			Status: models.ContractStatusActive, CreatedAt: time.Now().UTC(),
		}
		contractRepo.contracts[contract.ID] = contract

		ms := &models.Milestone{
			ID: "ms_fee_test", ContractID: contract.ID,
			Amount: c.amountINR, Status: models.MilestoneStatusPending, SequenceNumber: 1,
		}
		milestoneRepo.milestones[ms.ID] = ms

		svc := NewPaymentService(payRepo, milestoneRepo, contractRepo)
		ctx := context.Background()

		p, err := svc.FundMilestone(ctx, ms.ID, "b1", "buyer")
		if err != nil {
			t.Errorf("FundMilestone(%.2f) failed: %v", c.amountINR, err)
			continue
		}
		if p.AmountMinor != c.expectedMinor {
			t.Errorf("amount=%.2f: AmountMinor want %d, got %d", c.amountINR, c.expectedMinor, p.AmountMinor)
		}
		if p.PlatformFeeMinor != c.expectedFee {
			t.Errorf("amount=%.2f: PlatformFeeMinor want %d, got %d", c.amountINR, c.expectedFee, p.PlatformFeeMinor)
		}
		if p.FreelancerAmountMinor != c.expectedNet {
			t.Errorf("amount=%.2f: FreelancerAmountMinor want %d, got %d", c.amountINR, c.expectedNet, p.FreelancerAmountMinor)
		}
	}
}

// TestPayment_Admin_CanRelease verifies an admin role can release any payment.
func TestPayment_Admin_CanRelease(t *testing.T) {
	env := newPaymentTestEnv()
	ctx := context.Background()

	p, err := env.svc.FundMilestone(ctx, env.milestone.ID, env.contract.BuyerID, "buyer")
	if err != nil {
		t.Fatalf("FundMilestone failed: %v", err)
	}
	env.milestone.Status = models.MilestoneStatusApproved

	// Admin releases the payment
	err = env.svc.ReleasePayment(ctx, p.ID, "usr_admin_1", "admin")
	if err != nil {
		t.Fatalf("admin ReleasePayment failed: %v", err)
	}

	released, _ := env.payRepo.GetByID(ctx, p.ID)
	if released.Status != models.PaymentStatusReleased {
		t.Errorf("expected released status after admin release, got %q", released.Status)
	}
}
