# WorkStream — 10–15 Minute Demonstration Script & Guide

This runbook guides presenters through a comprehensive, live demonstration of WorkStream for academic evaluations, viva examinations, and stakeholder reviews.

> **Note on Safety:** All financial demonstrations use internal ledger test wallets. No external payment gateways or real currency are involved.

---

## Pre-Demo Setup Checklist (2 Minutes Before Demo)
1. **Start PostgreSQL & Apply Migrations:**
   ```bash
   cd backend && go run ./cmd/migrate up
   ```
2. **Start Backend Server:**
   ```bash
   cd backend && go run ./cmd/server
   # Verify http://localhost:8081/api/health returns status "ok"
   ```
3. **Start Frontend Server:**
   ```bash
   # In project root:
   npm run dev
   # Open browser at http://localhost:5173
   ```

---

## 1. Introduction & Mission (60 Seconds)
* **What to Show:** Homepage (`http://localhost:5173`).
* **Talking Points:**
  - Introduce **WorkStream**: A full-stack freelance marketplace combining a modern React 18 frontend with a high-performance Go (Gin) + PostgreSQL backend.
  - Highlight the core problem: Freelancers face unfair search algorithms, high commissions, and slow disputes; buyers face unverified talent and payment risks.
  - WorkStream addresses this with **deterministic talent matching**, an **atomic financial escrow ledger**, and **role-based governance**.

---

## 2. Authentication & Role Switcher (90 Seconds)
* **What to Show:**
  - Click **Sign In** / **Register**.
  - Demonstrate registration as a new Buyer (`buyer.demo@workstream.io`).
  - Show immediate JWT generation and automatic redirection to the Buyer Dashboard.
  - Sign in as a Freelancer (`seller.demo@workstream.io`) to show role-specific dashboard views.
* **Talking Points:**
  - Passwords hashed with bcrypt cost 12.
  - JWT tokens signed via HMAC-SHA256 (`HS256`) with algorithm pinning to prevent spoofing.

---

## 3. Buyer Flow & Project Creation (2 Minutes)
* **What to Show:**
  - Navigate to **Post a Project**.
  - Fill out a brief: *"Build a High-Performance Go Microservice"*.
  - Set category: *Programming & Tech*, budget: *$300 – $600*, skills: `["Go", "Docker", "PostgreSQL"]`.
  - Submit the project brief.
  - View the newly created project in **Buyer Dashboard $\rightarrow$ My Projects**.
* **Talking Points:**
  - Input validation prevents negative budgets or inverted ranges (`budget_min > budget_max`).

---

## 4. Intelligent Search & Deterministic Matching (2 Minutes)
* **What to Show:**
  - In the project detail view, click **View Matched Talent**.
  - Show ranked freelancer recommendations with match scores (e.g. 94%, 88%).
  - Highlight skill normalization: Freelancer with `"golang"` matches project skill `"Go"`.
  - Navigate to **Marketplace Search**: Query `"React"` with price filters to demonstrate responsive trigram full-text search.
* **Talking Points:**
  - Explain the multi-factor scoring formula:
    $$\text{FinalScore} = \text{round}(S_{\text{skill}} \times 0.40 + S_{\text{trust}} \times 0.20 + S_{\text{rating}} \times 0.15 + S_{\text{exp}} \times 0.15 + S_{\text{budget}} \times 0.10)$$
  - Emphasize that scoring is **100% deterministic** without hidden bias or randomness.

---

## 5. Freelancer Bidding & Contract Creation (2 Minutes)
* **What to Show:**
  - Switch to Freelancer window.
  - Browse to **Browse Projects** $\rightarrow$ Open the newly created Go project brief.
  - Click **Submit Proposal**: Bid *$450*, delivery time: *7 days*, cover letter.
  - Switch back to Buyer window:
    - Open project proposals $\rightarrow$ Review incoming proposal $\rightarrow$ Click **Accept Proposal**.
    - Show automatic creation of binding Contract and project status change to `in_progress`.
* **Talking Points:**
  - Unique constraint prevents freelancers from spamming duplicate proposals.
  - Acceptance executes inside an atomic database transaction.

---

## 6. Milestone Escrow & Financial Ledger (2.5 Minutes)
* **What to Show:**
  - Open the active **Contract Details** view.
  - Show Milestone 1 ($450.00).
  - Click **Fund Milestone into Escrow**:
    - Buyer balance deducts $450.00.
    - 10% platform fee ($45.00) recorded in ledger.
    - 90% net ($405.00) held securely in escrow status `held`.
  - Freelancer submits deliverable note: *"Microservice repository ready for review"*.
  - Buyer reviews submission $\rightarrow$ Clicks **Approve & Release Payment**.
  - Show instant credit of $405.00 to freelancer wallet and milestone status updated to `released`.
* **Talking Points:**
  - Explain double-spend prevention: Milestones cannot be re-funded or re-released.
  - Ledger maintains immutable double-entry records.

---

## 7. Reviews, Trust Tiers & Reputation (90 Seconds)
* **What to Show:**
  - Contract marked `completed`.
  - Click **Leave a Review** $\rightarrow$ Give 5 stars and comment.
  - View Freelancer's public profile $\rightarrow$ Show updated average rating and growth tier (*Top Performer* badge).
* **Talking Points:**
  - Reviews are only allowed on completed contracts where the caller was a participant.
  - Directional uniqueness prevents buyer/freelancer from reviewing multiple times.

---

## 8. Real-Time Communication & Notifications (60 Seconds)
* **What to Show:**
  - Open **Messages** thread between buyer and freelancer.
  - Send message: *"Thank you for the prompt delivery!"*.
  - Show unread badge on **Notification Bell** in header.
* **Talking Points:**
  - Message length capped at 4,000 characters. Self-conversations strictly prohibited.

---

## 9. Admin Governance & Moderation (90 Seconds)
* **What to Show:**
  - Sign in as Admin (`admin@workstream.io`).
  - Open `/admin` dashboard:
    - View live platform KPIs, user distribution, and project volume.
    - Inspect **User Management** (demonstrate Suspend/Reactivate user).
    - Inspect **Service Moderation** (demonstrate Approve/Reject service).
    - View **Audit Logs** showcasing timestamped records of every admin action.
* **Talking Points:**
  - Admins cannot suspend other admins.
  - All moderation actions require a mandatory audit justification note.

---

## 10. Conclusion & Security Summary (30 Seconds)
* **Talking Points:**
  - Conclude with a summary of the 117 automated Go unit tests, clean production build, security headers, rate limiting, and release-ready architecture.
  - Open the floor for questions.
