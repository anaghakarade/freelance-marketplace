package models

import "time"

const (
	PaymentStatusHeld = "held"
	PaymentStatusReleased = "released"
	PaymentStatusRefunded = "refunded"
	PlatformFeePercent int64 = 10
)

type Payment struct {
	ID string `json:"id"`; PaymentReference string `json:"paymentReference"`; ContractID string `json:"contractId"`; MilestoneID string `json:"milestoneId"`
	BuyerID string `json:"buyerId"`; FreelancerID string `json:"freelancerId"`
	AmountMinor int64 `json:"amountMinor"`; PlatformFeeMinor int64 `json:"platformFeeMinor"`; FreelancerAmountMinor int64 `json:"freelancerAmountMinor"`
	Currency string `json:"currency"`; Status string `json:"status"`; Provider string `json:"provider"`; CreatedAt time.Time `json:"createdAt"`; FundedAt *time.Time `json:"fundedAt,omitempty"`; ReleasedAt *time.Time `json:"releasedAt,omitempty"`; RefundedAt *time.Time `json:"refundedAt,omitempty"`
}
type Wallet struct { ID string `json:"id"`; UserID string `json:"userId"`; AvailableBalanceMinor int64 `json:"availableBalanceMinor"`; PendingBalanceMinor int64 `json:"pendingBalanceMinor"`; TotalEarnedMinor int64 `json:"totalEarnedMinor"`; TotalWithdrawnMinor int64 `json:"totalWithdrawnMinor"`; Currency string `json:"currency"`; UpdatedAt time.Time `json:"updatedAt"` }
type LedgerEntry struct { ID string `json:"id"`; TransactionReference string `json:"transactionReference"`; UserID *string `json:"userId,omitempty"`; PaymentID string `json:"paymentId"`; ContractID string `json:"contractId"`; MilestoneID string `json:"milestoneId"`; EntryType string `json:"entryType"`; AmountMinor int64 `json:"amountMinor"`; Currency string `json:"currency"`; Description string `json:"description"`; CreatedAt time.Time `json:"createdAt"` }
