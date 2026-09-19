# WorkStream Backend — Phase 1 Foundation

Welcome to the **WorkStream Backend**, built with **Go**, the **Gin web framework**, and **PostgreSQL**. This backend provides a high-performance, modular REST API foundation for the WorkStream freelance marketplace application.

---

## 1. Concepts & Technologies Explained

### What is Go?
**Go (Golang)** is a statically typed, compiled programming language developed by Google. It is known for its simplicity, lightning-fast execution speed, low memory usage, and robust concurrency primitives. In WorkStream, Go acts as our reliable, high-performance API server.

### What is Gin?
**Gin** is a high-performance HTTP web framework written in Go. It provides fast routing, middleware support, JSON request/response binding, and error management while maintaining incredible speed (up to 40x faster than standard HTTP routing).

### What is PostgreSQL?
**PostgreSQL** is an enterprise-grade open-source relational database known for reliability, data integrity, and support for JSONB data types, complex foreign keys, and indexes. It stores all marketplace users, categories, services, packages, and orders.

### How Does React Communicate with the Backend?
The React frontend and the Go backend communicate over **HTTP REST APIs**:
1. React makes an asynchronous `fetch()` request (e.g. `GET http://localhost:8080/api/categories`).
2. The Go backend receives the HTTP request, processes it through clean architectural layers, queries PostgreSQL, and formats the data as JSON.
3. React receives the JSON response and renders it into UI components.

---

## 2. Directory Structure

```text
backend/
├── cmd/
│   └── server/
│       └── main.go                 # Server entry point & graceful shutdown
├── internal/                       # Private application code
│   ├── config/                     # Environment configuration loader (.env)
│   ├── database/                   # PostgreSQL connection pool & health checks
│   ├── handlers/                   # HTTP controllers (JSON request/response)
│   ├── models/                     # Data structures (User, Category, Service, etc.)
│   ├── repositories/               # SQL database queries
│   ├── routes/                     # Router setup, CORS & endpoints
│   └── services/                   # Business logic layer
├── migrations/
│   ├── 000001_create_initial_schema.up.sql    # Core tables, constraints & indexes
│   ├── 000001_create_initial_schema.down.sql  # Rollback initial schema
│   ├── 000002_seed_initial_data.up.sql        # Seed data (matching frontend mock)
│   └── 000002_seed_initial_data.down.sql      # Seed rollback
├── docs/
│   └── API_ARCHITECTURE.md         # Detailed architectural documentation
├── .env.example                    # Environment variable template
├── go.mod                          # Go module definition
└── README.md                       # This file
```

---

## 3. Getting Started & Setup

### Prerequisites
- **Go 1.22+** installed (`go version`)
- **PostgreSQL 14+** installed and running

### Step 1: Configure Environment Variables
Copy the `.env.example` file to create your local `.env`:

```bash
cd backend
copy .env.example .env     # On Windows
# or: cp .env.example .env # On Linux/macOS
```

Edit `.env` if your PostgreSQL username or password differs from default:
```env
PORT=8080

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=workstream
DATABASE_SSLMODE=disable

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

### Step 2: Create PostgreSQL Database & Run Migrations

1. Open your terminal or `psql` shell and create the `workstream` database:
```sql
CREATE DATABASE workstream;
```

2. Execute the migrations to create the schema and seed data:
```bash
# Using psql:
psql -U postgres -d workstream -f migrations/000001_create_initial_schema.up.sql
psql -U postgres -d workstream -f migrations/000002_seed_initial_data.up.sql
```

---

### Step 3: Install Go Dependencies
From within the `backend/` directory, run:
```bash
go mod tidy
```

---

### Step 4: Run the Backend Server
Start the Go application:
```bash
go run ./cmd/server
```

You should see:
```text
==================================================
  WorkStream Backend - Phase 1 Foundation Server  
==================================================
[Config] Server configured for PORT: 8080
[Database] Successfully connected to PostgreSQL database: workstream
[Server] WorkStream API server is listening on http://localhost:8080
[Server] Health endpoint: http://localhost:8080/api/health
```

---

## 4. API Endpoints (Phase 1)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & uptime status |
| `GET` | `/api/categories` | List all marketplace categories |
| `GET` | `/api/categories/:slug` | Get category details with subcategories |
| `GET` | `/api/categories/:categorySlug/subcategories` | Get subcategories for a category |
| `GET` | `/api/services` | List published services (supports `?category=slug&subcategory=slug`) |
| `GET` | `/api/services/:id` | Get service by ID with packages and seller details |

---

## 5. Testing the Endpoints

### Test Health Check
```bash
curl http://localhost:8080/api/health
```
**Response:**
```json
{
  "status": "ok",
  "message": "WorkStream API is running"
}
```

### Test Categories
```bash
curl http://localhost:8080/api/categories
```

### Test Category by Slug
```bash
curl http://localhost:8080/api/categories/programming-tech
```

### Test Services
```bash
curl http://localhost:8080/api/services
```

### Test Service Details by ID
```bash
curl http://localhost:8080/api/services/srv_1
```

### Test Error Handling (Invalid ID)
```bash
curl http://localhost:8080/api/services/nonexistent_id
```
**Response:**
```json
{
  "error": true,
  "message": "Service not found",
  "details": ""
}
```

---

## 6. How a Request Flows from React to PostgreSQL

```text
React Client (e.g. fetch /api/services/srv_1)
        │
        ▼ (HTTP Request via network / CORS)
Gin Router (internal/routes/routes.go)
        │
        ▼ (Validates path & invokes handler)
Handler (internal/handlers/service_handler.go)
        │
        ▼ (Applies business rules)
Service (internal/services/service_service.go)
        │
        ▼ (Constructs parameterized SQL queries)
Repository (internal/repositories/service_repository.go)
        │
        ▼ (SQL execution over connection pool)
PostgreSQL Database
```

---

## Phase 6B — Internal Escrow and Financial Ledger

Phase 6B adds an internal-only escrow simulation; it does not send money to a payment provider. `payments`, `wallets`, and `ledger_entries` are created by migration `000008`.

- Amounts are stored as integer minor units, avoiding floating-point financial calculations.
- Funding holds the freelancer's net amount in their pending wallet balance and records a `milestone_funded` ledger entry.
- A buyer may release only a held payment for an approved milestone. Release atomically moves the net amount to the freelancer's available balance, increments total earnings, and records freelancer-earning, release, and platform-fee ledger entries.
- Refunds are allowed only while funds are held and atomically reverse the pending wallet amount and append a refund entry.
- A 10% platform fee is centrally defined in `models.PlatformFeePercent`. The internal provider is the only active provider; the schema reserves future provider values without integrating them.

Protected endpoints: `POST /api/milestones/:id/fund`, `POST /api/payments/:id/release`, `POST /api/payments/:id/refund`, `GET /api/payments/:id`, `GET /api/contracts/:id/payments`, `GET /api/milestones/:id/payment`, `GET /api/me/payments`, `GET /api/me/wallet`, and `GET /api/me/ledger`.

---

## Phase 8 — Contract Reviews and Trust Profiles

Phase 8 stores **contract reviews** in `reviews` (migration `000010`). If a Phase 1–4 service-review table is still present, that migration renames it to `service_reviews` before creating the contract-review schema. All review routes require a valid JWT (`Authorization: Bearer <token>`).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/reviews` | Create a review for a completed contract |
| `GET` | `/api/reviews/:id` | Get a non-deleted review |
| `PATCH` | `/api/reviews/:id` | Owner-only update of rating/comment |
| `DELETE` | `/api/reviews/:id` | Owner-only soft delete |
| `GET` | `/api/users/:id/reviews` | Paginated received reviews (`page`, `limit`) newest first |
| `GET` | `/api/users/:id/trust` | Evidence-based trust profile |
| `GET` | `/api/contracts/:id/review-eligibility` | Whether the caller may review this contract |

### Authentication and authorization

- Reviewer identity is always taken from the JWT `user_id`. Client-supplied `reviewer_id` is ignored.
- Only the review owner (the original reviewer) may `PATCH` or `DELETE` their review. The reviewee cannot edit or delete it.

### Eligibility and server-derived participants

A review is allowed only when:

1. The contract exists and `status = completed`.
2. The authenticated user is the contract `buyer_id` or `freelancer_id`.
3. No directional review already exists for that `(contract_id, reviewer_id)`, including soft-deleted rows.

The reviewee is the other contract party. Project ID is loaded from the contract. Self-reviews are rejected (`reviewer_id <> reviewee_id` in PostgreSQL and in eligibility logic).

`POST /api/reviews` body:

```json
{ "contract_id": "ctr_...", "rating": 5, "comment": "optional, min 10 chars when present" }
```

Rating must be an integer 1–5. `is_verified` is not accepted from the client; successful contract reviews are stored as verified (`true`).

### Soft deletion

`DELETE` sets `deleted_at`. Normal `GET`, listings, and trust aggregates exclude deleted rows. The database row remains for audit. The unique constraint `UNIQUE(contract_id, reviewer_id, reviewee_id)` still applies after deletion, so a second directional review on the same contract is not allowed.

### Transactional side effects on create

`POST /api/reviews` inserts the review, a `new_review` notification for the **reviewee**, and a `review_created` activity event (actor = reviewer) in **one database transaction**. If any insert fails, the transaction rolls back. Notification recipients are never taken from the client.

Activity metadata is limited to `review_id`, `rating`, `project_id`, and `contract_id`.

### Trust tiers

`growth_tier` is the **highest qualifying** tier:

| Tier | Rule |
|---|---|
| Top Performer | ≥ 20 completed contracts AND ≥ 15 reviews AND average rating ≥ 4.8 |
| Trusted | ≥ 10 completed contracts AND ≥ 8 reviews AND average rating ≥ 4.5 |
| Established | ≥ 5 completed contracts AND ≥ 3 reviews AND average rating ≥ 4.0 |
| Rising | ≥ 1 completed contract |
| New | otherwise |

### Trust metrics

Calculated from current tables (deleted reviews excluded from rating fields):

- `average_rating`, `rating_count`, `distribution` (counts for ratings 1–5), `verified_review_count`
- `completed_projects`: contracts where the user is buyer or freelancer and `status = 'completed'`
- `completion_rate`: `completed / (completed + cancelled + disputed)` as a percentage. `null` when the user has no terminal contracts.
- `repeat_client_rate`: among unique counterparties on **completed** contracts, the percentage of counterparties with **2+** completed contracts with this user. Not derived from reviews. `null` when there are no completed counterparties.
- `on_time_delivery_rate`: for contracts where the user is the **freelancer**, `approved` milestones that have both `due_date` and `completed_at`, percentage where `completed_at <= due_date`. `null` when no such dated completions exist.
- `response_time_minutes`: average minutes from another participant's message to this user's next message in the same conversation (Phase 7 `messages` has no system-message flag; all stored messages are user-authored). `null` when no reply pairs exist.

These endpoints do not invent placeholder percentages. Missing evidence is returned as `null`.
