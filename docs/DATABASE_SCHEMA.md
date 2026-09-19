# WorkStream — Database Schema & Data Dictionary

## 1. Migration Sequence & Version History

WorkStream manages schema lifecycle through 12 sequentially numbered, bidirectional SQL migrations compiled into the binary via `embed.FS`:

| Migration | Name | Description |
| :--- | :--- | :--- |
| `000001` | `create_initial_schema` | Core users, roles, categories, subcategories, services, and packages. |
| `000002` | `seed_initial_data` | Seed catalog taxonomy (categories, subcategories, initial tags). |
| `000003` | `add_auth_to_users` | Password hashes, JWT credential fields, and auth indexes. |
| `000004` | `phase3_marketplace_taxonomy_and_discovery` | Comprehensive marketplace catalog expansion and seed services. |
| `000005` | `phase4b_service_management` | Service lifecycle fields (`draft`, `pending_review`, `published`, `rejected`). |
| `000006` | `add_projects_and_proposals` | Client project briefs, skill tags, and freelancer proposal bids. |
| `000007` | `create_contracts_and_milestones` | Formal contracts, milestone deliverables, and status state machines. |
| `000008` | `create_payments_and_financial_ledger` | Digital wallets, atomic transaction ledger, and escrow tracking. |
| `000009` | `phase7_communication` | In-app messaging, conversation threads, and notification dispatch. |
| `000010` | `phase8_reviews` | Verified contract reviews, rating bounds, and growth trust profiles. |
| `000011` | `phase9_admin_moderation` | Content moderation reports, dispute resolution, and immutable audit logs. |
| `000012` | `phase10_search_matching` | Trigram GIN search indexes, normalized skill tokens, and user interactions. |

---

## 2. Core Relational Schema

```text
users (id, email, password_hash, role)
  ├── services (seller_id)
  │    └── service_packages (service_id)
  ├── projects (client_id)
  │    └── proposals (project_id, freelancer_id)
  │         └── contracts (project_id, proposal_id, buyer_id, freelancer_id)
  │              ├── milestones (contract_id)
  │              │    └── payments (milestone_id, payer_id, payee_id)
  │              └── reviews (contract_id, reviewer_id, reviewee_id)
  ├── wallets (user_id)
  │    └── transactions (wallet_id)
  ├── conversations (buyer_id, freelancer_id, project_id)
  │    └── messages (conversation_id, sender_id)
  ├── notifications (user_id)
  ├── user_trust_profiles (user_id)
  ├── reports (reporter_id, target_id)
  ├── audit_logs (actor_id, target_id)
  └── user_interactions (user_id, target_id)
```

---

## 3. Detailed Data Dictionary

### 3.1 Identity & Authentication

#### `users`
Represents registered platform accounts with role-based access.
* **Primary Key:** `id` (VARCHAR(36) / UUID)
* **Fields:** `email` (UNIQUE, VARCHAR(255)), `password_hash` (VARCHAR(255)), `name` (VARCHAR(100)), `role` (VARCHAR(20) CHECK role IN ('buyer', 'freelancer', 'admin')), `bio` (TEXT), `avatar_url` (VARCHAR(500)), `skills` (TEXT[]), `hourly_rate` (NUMERIC(10,2)), `status` (VARCHAR(20) DEFAULT 'active'), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
* **Indexes:** `idx_users_email` (UNIQUE), `idx_users_role`, `idx_users_status`, `idx_users_search_trgm` (GIN).

---

### 3.2 Marketplace & Services

#### `categories` & `subcategories`
Marketplace taxonomy hierarchy.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `name` (VARCHAR(100)), `slug` (VARCHAR(100) UNIQUE), `icon` (VARCHAR(50)), `description` (TEXT).
* **Foreign Key:** `subcategories.category_id` $\rightarrow$ `categories.id` (ON DELETE CASCADE).

#### `services`
Gig listings published by freelancers.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `seller_id` (FK $\rightarrow$ `users.id`), `category_id` (FK $\rightarrow$ `categories.id`), `subcategory_id` (FK $\rightarrow$ `subcategories.id`), `title` (VARCHAR(200)), `description` (TEXT), `status` (VARCHAR(20) CHECK status IN ('draft', 'pending_review', 'published', 'rejected', 'suspended', 'archived')), `cover_image` (VARCHAR(500)), `rating` (NUMERIC(3,2) DEFAULT 0.0), `review_count` (INT DEFAULT 0), `created_at` (TIMESTAMPTZ).
* **Indexes:** `idx_services_seller_id`, `idx_services_category_id`, `idx_services_status`, `idx_services_search_trgm` (GIN).

#### `service_packages`
Three-tier pricing packages (`basic`, `standard`, `premium`) for each service.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `service_id` (FK $\rightarrow$ `services.id` ON DELETE CASCADE), `tier` (VARCHAR(20) CHECK tier IN ('basic', 'standard', 'premium')), `title` (VARCHAR(100)), `description` (TEXT), `price` (NUMERIC(10,2) CHECK price >= 5), `delivery_days` (INT CHECK delivery_days >= 1), `revisions` (INT DEFAULT 0).
* **Constraint:** UNIQUE(`service_id`, `tier`).

---

### 3.3 Projects & Proposals

#### `projects`
Client-submitted bespoke project briefs.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `client_id` (FK $\rightarrow$ `users.id`), `title` (VARCHAR(200)), `description` (TEXT), `category_id` (FK $\rightarrow$ `categories.id`), `budget_min` (NUMERIC(10,2)), `budget_max` (NUMERIC(10,2)), `status` (VARCHAR(20) CHECK status IN ('active', 'in_progress', 'completed', 'cancelled', 'suspended')), `required_skills` (TEXT[]), `created_at` (TIMESTAMPTZ).
* **Constraint:** CHECK(`budget_max >= budget_min AND budget_min >= 0`).
* **Indexes:** `idx_projects_client_id`, `idx_projects_status`, `idx_projects_search_trgm` (GIN).

#### `proposals`
Freelancer bids on active projects.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `project_id` (FK $\rightarrow$ `projects.id` ON DELETE CASCADE), `freelancer_id` (FK $\rightarrow$ `users.id`), `bid_amount` (NUMERIC(10,2) CHECK bid_amount > 0), `delivery_days` (INT CHECK delivery_days >= 1), `cover_letter` (TEXT), `status` (VARCHAR(20) CHECK status IN ('pending', 'accepted', 'rejected', 'withdrawn')), `created_at` (TIMESTAMPTZ).
* **Constraint:** UNIQUE(`project_id`, `freelancer_id`) prevents duplicate bids.

---

### 3.4 Contracts, Milestones & Financial Escrow

#### `contracts`
Binding agreement created upon proposal acceptance.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `project_id` (FK $\rightarrow$ `projects.id`), `proposal_id` (FK $\rightarrow$ `proposals.id`), `buyer_id` (FK $\rightarrow$ `users.id`), `freelancer_id` (FK $\rightarrow$ `users.id`), `total_amount` (NUMERIC(10,2) CHECK total_amount > 0), `status` (VARCHAR(20) CHECK status IN ('pending', 'active', 'completed', 'cancelled')), `created_at` (TIMESTAMPTZ).
* **Indexes:** `idx_contracts_buyer_id`, `idx_contracts_freelancer_id`, `idx_contracts_status`.

#### `milestones`
Deliverable phases belonging to a contract.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `contract_id` (FK $\rightarrow$ `contracts.id` ON DELETE CASCADE), `title` (VARCHAR(150)), `amount` (NUMERIC(10,2) CHECK amount > 0), `due_date` (TIMESTAMPTZ), `status` (VARCHAR(20) CHECK status IN ('pending', 'funded', 'submitted', 'approved', 'released', 'refunded')), `deliverable_note` (TEXT).

#### `wallets`
Digital stored-value balances for users.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `user_id` (FK $\rightarrow$ `users.id` UNIQUE), `balance` (NUMERIC(12,2) DEFAULT 0.0 CHECK balance >= 0), `created_at` (TIMESTAMPTZ).

#### `transactions`
Double-entry ledger records tracking wallet credits, debits, escrow holds, and refunds.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `wallet_id` (FK $\rightarrow$ `wallets.id`), `amount` (NUMERIC(12,2)), `type` (VARCHAR(20) CHECK type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'escrow_refund', 'platform_fee')), `reference_id` (VARCHAR(36)), `description` (VARCHAR(255)), `created_at` (TIMESTAMPTZ).

#### `payments`
Milestone payment intent records.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `milestone_id` (FK $\rightarrow$ `milestones.id` UNIQUE), `payer_id` (FK $\rightarrow$ `users.id`), `payee_id` (FK $\rightarrow$ `users.id`), `amount` (NUMERIC(10,2)), `fee` (NUMERIC(10,2)), `status` (VARCHAR(20) CHECK status IN ('held', 'released', 'refunded')), `created_at` (TIMESTAMPTZ).

---

### 3.5 Reviews, Trust & Reputation

#### `reviews`
Verified feedback submitted upon contract completion.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `contract_id` (FK $\rightarrow$ `contracts.id`), `reviewer_id` (FK $\rightarrow$ `users.id`), `reviewee_id` (FK $\rightarrow$ `users.id`), `rating` (INT CHECK rating BETWEEN 1 AND 5), `comment` (TEXT), `created_at` (TIMESTAMPTZ), `deleted_at` (TIMESTAMPTZ).
* **Constraint:** UNIQUE(`contract_id`, `reviewer_id`) prevents multiple reviews per contract side.

#### `user_trust_profiles`
Aggregated growth tier metrics calculated dynamically from review history.
* **Primary Key:** `id` (VARCHAR(36))
* **Fields:** `user_id` (FK $\rightarrow$ `users.id` UNIQUE), `tier` (VARCHAR(20) CHECK tier IN ('new', 'rising', 'established', 'trusted', 'top')), `completed_contracts` (INT DEFAULT 0), `average_rating` (NUMERIC(3,2) DEFAULT 0.0), `on_time_delivery_pct` (NUMERIC(5,2)), `updated_at` (TIMESTAMPTZ).

---

### 3.6 Communication & Governance

#### `conversations` & `messages`
* **`conversations`:** Tracks dialog threads between buyer, freelancer, and optional associated project.
* **`messages`:** Thread messages (`conversation_id` FK, `sender_id` FK, `body` TEXT, `created_at`).

#### `notifications`
* System notifications with unread state tracking (`user_id` FK, `title`, `message`, `type`, `read` BOOLEAN DEFAULT false).

#### `reports` & `audit_logs`
* **`reports`:** User dispute submissions (`reporter_id`, `target_type`, `target_id`, `reason`, `status` IN ('pending', 'under_review', 'resolved', 'dismissed')).
* **`audit_logs`:** Immutable record of admin interventions (`actor_id`, `action`, `target_type`, `target_id`, `details` JSONB, `created_at`).

#### `user_interactions`
* Recommendation engine behavioral telemetry (`user_id`, `target_type`, `target_id`, `interaction_type` IN ('view', 'click', 'search', 'proposal', 'contract'), `created_at`).
