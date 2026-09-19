# WorkStream — REST API Documentation

All endpoints return JSON responses with standard formats:
* **Success:** `{ "success": true, "data": ... }`
* **Error:** `{ "success": false, "error": { "message": "...", "code": "..." } }`

---

## 1. Health
* **`GET /api/health`**
  * **Auth:** None
  * **Description:** Verifies API liveness and PostgreSQL database connectivity.
  * **Response 200:** `{ "status": "ok", "timestamp": "...", "version": "1.0.0", "database": "connected" }`
  * **Response 503:** `{ "status": "degraded", "database": "disconnected" }`

---

## 2. Authentication
* **`POST /api/auth/register`**
  * **Auth:** None (Rate limited: 60 req/min)
  * **Body:** `{ "email": "user@example.com", "password": "securepassword", "name": "Alice Smith", "role": "buyer" }`
  * **Response 201:** `{ "token": "jwt...", "user": { "id": "...", "email": "...", "role": "buyer" } }`
  * **Errors:** 400 (Validation), 409 (Email already registered)
* **`POST /api/auth/login`**
  * **Auth:** None (Rate limited: 60 req/min)
  * **Body:** `{ "email": "user@example.com", "password": "securepassword" }`
  * **Response 200:** `{ "token": "jwt...", "user": { "id": "...", "email": "...", "role": "..." } }`
  * **Errors:** 401 (Invalid credentials)
* **`POST /api/auth/logout`**
  * **Auth:** None
  * **Response 200:** `{ "message": "Logged out successfully" }`
* **`GET /api/auth/me`**
  * **Auth:** Bearer Token
  * **Response 200:** Profile data of the authenticated user.

---

## 3. Taxonomy & Categories
* **`GET /api/categories`**
  * **Auth:** None
  * **Response 200:** Array of all top-level categories.
* **`GET /api/categories/:slug`**
  * **Auth:** None
  * **Response 200:** Category details by URL slug.
* **`GET /api/categories/:slug/subcategories`**
  * **Auth:** None
  * **Response 200:** Subcategories belonging to the given category.

---

## 4. Services (Gigs)
* **`GET /api/services`**
  * **Auth:** None | **Params:** `category`, `search`, `page`, `limit`
  * **Response 200:** Paginated list of published services.
* **`GET /api/services/:id`**
  * **Auth:** None
  * **Response 200:** Full service detail including pricing packages and seller profile.
* **`POST /api/services`**
  * **Auth:** Bearer Token | **Role:** `freelancer`, `seller`, `admin`
  * **Body:** `{ "title": "...", "description": "...", "category_id": "...", "subcategory_id": "...", "packages": [...] }`
  * **Response 201:** Created service in `draft` status.
* **`PATCH /api/services/:id`**
  * **Auth:** Bearer Token | **Role:** Owner / `admin`
  * **Body:** Partial service update fields.
* **`POST /api/services/:id/publish`**
  * **Auth:** Bearer Token | **Role:** Owner / `admin`
  * **Description:** Submits draft for review / publishes service.
* **`POST /api/services/:id/archive`**
  * **Auth:** Bearer Token | **Role:** Owner / `admin`
* **`DELETE /api/services/:id`**
  * **Auth:** Bearer Token | **Role:** Owner / `admin`
* **`GET /api/seller/services`**
  * **Auth:** Bearer Token | **Role:** `freelancer`, `seller`, `admin`
  * **Response 200:** Services owned by the authenticated seller across all statuses.

---

## 5. Projects & Proposals
* **`GET /api/projects`**
  * **Auth:** Optional | **Params:** `status`, `category_id`, `page`, `limit`
  * **Response 200:** Paginated list of active client project briefs.
* **`GET /api/projects/:id`**
  * **Auth:** Optional
  * **Response 200:** Project details and requirement specifications.
* **`POST /api/projects`**
  * **Auth:** Bearer Token | **Role:** `buyer`, `admin`
  * **Body:** `{ "title": "...", "description": "...", "category_id": "...", "budget_min": 100, "budget_max": 500, "required_skills": ["Go", "React"] }`
  * **Response 201:** Created project in `active` status.
* **`GET /api/projects/my`**
  * **Auth:** Bearer Token | **Role:** `buyer`, `admin`
  * **Response 200:** Projects created by the caller.
* **`PUT /api/projects/:id`**
  * **Auth:** Bearer Token | **Role:** Owner / `admin`
* **`PATCH /api/projects/:id/status`**
  * **Auth:** Bearer Token | **Role:** Owner / `admin`
  * **Body:** `{ "status": "completed" | "cancelled" }`
* **`DELETE /api/projects/:id`**
  * **Auth:** Bearer Token | **Role:** Owner / `admin`
* **`GET /api/projects/:id/proposals`**
  * **Auth:** Bearer Token | **Role:** Project Owner / `admin`
  * **Response 200:** Bids submitted for this project.
* **`POST /api/projects/:id/proposals`**
  * **Auth:** Bearer Token | **Role:** `freelancer`, `admin`
  * **Body:** `{ "bid_amount": 350, "delivery_days": 7, "cover_letter": "..." }`
  * **Response 201:** Submitted proposal.
  * **Errors:** 409 (Duplicate proposal), 400 (Invalid bid)
* **`GET /api/proposals/my`**
  * **Auth:** Bearer Token | **Role:** `freelancer`, `admin`
  * **Response 200:** Freelancer's submitted proposals.
* **`PATCH /api/proposals/:id/shortlist`**
  * **Auth:** Bearer Token | **Role:** Buyer (Project Owner)
* **`PATCH /api/proposals/:id/reject`**
  * **Auth:** Bearer Token | **Role:** Buyer (Project Owner)
* **`PATCH /api/proposals/:id/accept`**
  * **Auth:** Bearer Token | **Role:** Buyer (Project Owner)
  * **Description:** Accepts proposal, marks other proposals rejected, closes project to `in_progress`, and creates a new contract.
* **`DELETE /api/proposals/:id`**
  * **Auth:** Bearer Token | **Role:** Proposal Owner (Withdraw bid).

---

## 6. Contracts & Milestones
* **`GET /api/contracts`**
  * **Auth:** Bearer Token
  * **Response 200:** Contracts where caller is buyer or freelancer.
* **`GET /api/contracts/:id`**
  * **Auth:** Bearer Token (Participant or Admin)
* **`GET /api/projects/:id/contract`**
  * **Auth:** Bearer Token (Participant or Admin)
* **`POST /api/contracts/:id/milestones`**
  * **Auth:** Bearer Token | **Role:** Contract Participant / Admin
  * **Body:** `{ "title": "Milestone 1", "amount": 200, "due_date": "2026-10-01T00:00:00Z" }`
* **`GET /api/contracts/:id/milestones`**
  * **Auth:** Bearer Token
* **`GET /api/milestones/:id`**
  * **Auth:** Bearer Token
* **`PATCH /api/milestones/:id`**
  * **Auth:** Bearer Token (Participant or Admin)
* **`POST /api/milestones/:id/start`**
  * **Auth:** Bearer Token (Freelancer begins work)
* **`POST /api/milestones/:id/submissions`**
  * **Auth:** Bearer Token (Freelancer submits deliverable note/URL)
* **`POST /api/milestones/:id/approve`**
  * **Auth:** Bearer Token (Buyer accepts milestone deliverables)
* **`POST /api/milestones/:id/request-revision`**
  * **Auth:** Bearer Token (Buyer requests changes)
* **`GET /api/milestones/:id/submissions`**
  * **Auth:** Bearer Token

---

## 7. Payments & Financial Ledger
* **`POST /api/milestones/:id/fund`**
  * **Auth:** Bearer Token | **Role:** Contract Buyer / Admin
  * **Description:** Locks funds into escrow. Computes 10% platform fee and holds 90% net in ledger.
  * **Errors:** 400 (amount <= 0), 409 (already funded), 403 (unauthorized)
* **`POST /api/payments/:id/release`**
  * **Auth:** Bearer Token | **Role:** Contract Buyer / Admin
  * **Description:** Releases held escrow funds into freelancer wallet. Requires milestone in `approved` state.
* **`POST /api/payments/:id/refund`**
  * **Auth:** Bearer Token | **Role:** Contract Buyer / Admin
  * **Description:** Refunds held escrow funds back to buyer wallet.
* **`GET /api/me/wallet`**
  * **Auth:** Bearer Token
  * **Response 200:** `{ "user_id": "...", "balance": 450.00 }`
* **`GET /api/me/ledger`**
  * **Auth:** Bearer Token
  * **Response 200:** User's transaction ledger history.
* **`GET /api/me/earnings`**
  * **Auth:** Bearer Token | **Role:** Freelancer

---

## 8. Communication & Messaging
* **`GET /api/notifications`**
  * **Auth:** Bearer Token | **Params:** `page`, `limit` (clamped 1–100)
* **`PATCH /api/notifications/:id/read`**
  * **Auth:** Bearer Token
* **`POST /api/notifications/read-all`**
  * **Auth:** Bearer Token
* **`GET /api/conversations`**
  * **Auth:** Bearer Token
* **`POST /api/conversations`**
  * **Auth:** Bearer Token
  * **Body:** `{ "recipient_id": "...", "project_id": "..." }`
* **`GET /api/conversations/:id/messages`**
  * **Auth:** Bearer Token (Participant)
* **`POST /api/conversations/:id/messages`**
  * **Auth:** Bearer Token (Participant)
  * **Body:** `{ "body": "Hello there..." }` (Max 4,000 chars)

---

## 9. Reviews & Trust Engine
* **`POST /api/reviews`**
  * **Auth:** Bearer Token
  * **Body:** `{ "contract_id": "...", "rating": 5, "comment": "Excellent work!" }`
  * **Errors:** 400 (Rating outside 1–5), 409 (Duplicate directional review), 403 (Contract not completed / not participant)
* **`GET /api/users/:id/reviews`**
  * **Auth:** Bearer Token
* **`GET /api/users/:id/trust`**
  * **Auth:** Bearer Token
  * **Response 200:** Trust tier (*new, rising, established, trusted, top*), completed contracts, average rating.

---

## 10. Intelligent Search & Matching (Phase 10)
* **`GET /api/search/services`**
  * **Auth:** None | **Params:** `q` (max 200 chars), `category`, `min_price`, `max_price`, `min_rating`, `sort`, `page`, `limit`
* **`GET /api/search/freelancers`**
  * **Auth:** None | **Params:** `skills`, `min_rating`, `tier`, `min_hourly`, `max_hourly`, `page`, `limit`
* **`GET /api/search/projects`**
  * **Auth:** None | **Params:** `q`, `category`, `min_budget`, `max_budget`, `page`, `limit`
* **`GET /api/projects/:id/matches`**
  * **Auth:** Bearer Token (Project Buyer or Admin)
  * **Response 200:** Deterministically scored candidates matching project skills and budget.
* **`GET /api/recommendations/services`**
  * **Auth:** Optional
  * **Response 200:** Personalized service recommendations based on user interaction history.
* **`POST /api/recommendations/events`**
  * **Auth:** Optional (Rate limited: 120 req/min)
  * **Body:** `{ "target_type": "service", "target_id": "...", "interaction_type": "click" }`

---

## 11. Admin & Moderation (Phase 9)
* **`GET /api/admin/analytics`**
  * **Auth:** Bearer Token | **Role:** `admin`
* **`GET /api/admin/users`** | **`PATCH /api/admin/users/:id/suspend`** | **`PATCH /api/admin/users/:id/reactivate`**
* **`GET /api/admin/services`** | **`PATCH /api/admin/services/:id/approve`** | **`PATCH /api/admin/services/:id/reject`** | **`PATCH /api/admin/services/:id/suspend`**
* **`GET /api/admin/projects`** | **`PATCH /api/admin/projects/:id/suspend`**
* **`GET /api/admin/reports`** | **`PATCH /api/admin/reports/:id/resolve`** | **`PATCH /api/admin/reports/:id/dismiss`**
* **`GET /api/admin/audit-logs`**
