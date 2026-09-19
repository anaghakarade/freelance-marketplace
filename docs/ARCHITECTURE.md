# WorkStream — System Architecture

## 1. High-Level Architectural Topology

```text
[ Browser / Client Application (React 18 + Vite) ]
                          │
                          │ HTTPS / JSON REST API
                          ▼
            [ Go / Gin API Server Engine ]
                          │
  ┌───────────────────────┴───────────────────────┐
  │              Middleware Pipeline               │
  │  1. Security Headers (HSTS, CSP, nosniff)     │
  │  2. Request Body Limiter (2MB Max)            │
  │  3. CORS Origin Validation                    │
  │  4. In-Memory Token Bucket Rate Limiter       │
  │  5. JWT Auth & Role-Based Access Control      │
  └───────────────────────┬───────────────────────┘
                          │
                          ▼
  ┌───────────────────────────────────────────────┐
  │                 HTTP Handlers                 │
  │  - JSON Unmarshaling & Schema Validation      │
  │  - Context Extraction (User ID, User Role)    │
  │  - Standardized JSON Response Serialization   │
  └───────────────────────┬───────────────────────┘
                          │
                          ▼
  ┌───────────────────────────────────────────────┐
  │                Service Layer                  │
  │  - Core Business Rules & Validation           │
  │  - Multi-Entity Orchestration                 │
  │  - Deterministic Matching & Normalization     │
  │  - Audit Trail Generation                     │
  └───────────────────────┬───────────────────────┘
                          │
                          ▼
  ┌───────────────────────────────────────────────┐
  │              Repository Layer                 │
  │  - Parameterized SQL Prepared Queries         │
  │  - Transaction Management (BeginTx / Commit)  │
  │  - Row-Level Locking (SELECT ... FOR UPDATE)  │
  └───────────────────────┬───────────────────────┘
                          │
                          ▼
             [ PostgreSQL 15+ Database ]
      (ACID Transactions, GIN Indexes, FKs)
```

---

## 2. Request Lifecycle & Middleware Pipeline

Every incoming HTTP request traverses a hardened middleware pipeline before reaching domain business logic:

1. **Security Headers Middleware (`internal/middleware/security_headers.go`):**
   - Injects `X-Content-Type-Options: nosniff` to block MIME confusion.
   - Injects `X-Frame-Options: DENY` preventing clickjacking.
   - Injects `Referrer-Policy: strict-origin-when-cross-origin`.
   - Attaches `Strict-Transport-Security` (HSTS) in production environments.
2. **Request Body Limiter (`internal/middleware/body_limit.go`):**
   - Enforces a 2MB maximum payload size (`2 * 1024 * 1024` bytes).
   - Prevents memory-exhaustion denial of service attacks by aborting oversized payloads with HTTP 413.
3. **CORS Handler:**
   - Evaluates the `Origin` header against `cfg.CORSAllowedOrigins`.
   - Wildcards are strictly prohibited for authenticated endpoints.
4. **Token-Bucket Rate Limiter (`internal/middleware/rate_limiter.go`):**
   - Independent in-memory rate limiters for high-risk endpoints:
     - Authentication (`/api/auth/login`, `/api/auth/register`): 60 req/min, burst 20.
     - Content Reporting (`/api/reports`): 30 req/min, burst 10.
     - Recommendation Tracking (`/api/recommendations/events`): 120 req/min, burst 40.
5. **Authentication Middleware (`internal/middleware/auth_middleware.go`):**
   - Parses `Authorization: Bearer <token>`.
   - Validates header algorithm strictly (`alg == "HS256"`, `typ == "JWT"`).
   - Validates HMAC signature against `JWTSecret`.
   - Asserts expiry (`exp > now`).
   - Injects `userID`, `userEmail`, and `userRole` into the Gin context (`c.Set(...)`).
6. **RBAC Guard (`RequireRole`):**
   - Evaluates user claims against required endpoint permissions (`admin`, `buyer`, `freelancer`).
   - Returns HTTP 403 Forbidden on role mismatch.

---

## 3. Layered Clean Architecture

WorkStream strictly adheres to clean separation of concerns:

### 3.1 HTTP Handlers (`internal/handlers/`)
- Pure presentation layer.
- Responsible for parsing path parameters, query strings, and JSON request bodies.
- Enforces semantic HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 429, 500).
- Calls standardized response helpers (`RespondSuccess`, `RespondError`, `RespondCreated`).

### 3.2 Service Layer (`internal/services/`)
- Encapsulates all marketplace business logic and state machine transitions.
- Enforces cross-tenant isolation and IDOR checks (e.g., verifying that the caller owns the project or is a contract participant).
- Calculates deterministic matching scores and executes skill normalization.
- Orchestrates multi-step operations (e.g., accepting a proposal creates a contract, triggers milestone instantiation, and emits notifications).

### 3.3 Repository Layer (`internal/repositories/`)
- Data access abstraction layer.
- Never imports domain services or HTTP handlers.
- Interfaces enable complete unit testability via in-memory mocks without requiring a live PostgreSQL instance.
- Uses strict SQL parameterization (`$1, $2, ...`) eliminating SQL injection vulnerabilities.

---

## 4. Transactional & Financial Safety

### 4.1 Atomic Escrow Operations
Financial integrity is paramount in WorkStream. Milestone funding, release, and refund workflows use PostgreSQL transaction blocks (`BeginTx`):

```go
tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
if err != nil {
    return err
}
defer tx.Rollback()

// Row-level lock on milestone prevents race conditions
var status string
err = tx.QueryRowContext(ctx, "SELECT status FROM milestones WHERE id = $1 FOR UPDATE", milestoneID).Scan(&status)
if status != "pending" {
    return ErrInvalidMilestoneState
}

// Update milestone, transfer ledger balance, and record transaction
// ...
return tx.Commit()
```

### 4.2 Financial Integrity Invariants
1. **Positive Funding Only:** Milestones reject `amount <= 0`.
2. **Double-Spend Prevention:** Milestone states transition strictly (`pending` $\rightarrow$ `funded` $\rightarrow$ `approved` $\rightarrow$ `released`). Attempting to re-fund or re-release returns HTTP 409 Conflict.
3. **Exact Fee Accounting:** 10% platform fee is deducted upfront upon milestone funding; the net 90% is locked in escrow until milestone deliverable acceptance.
4. **Non-Negative Wallets:** Wallet balance constraint `balance >= 0` enforced at the database level.

---

## 5. Frontend Networking & Client-Side Architecture

### 5.1 Centralized API Client (`src/services/api/apiClient.js`)
- Single point of outbound HTTP communication using native `fetch`.
- Injects `Authorization: Bearer <token>` from browser `localStorage`.
- Automatically dispatches a global custom event `authUnauthorized` upon receiving HTTP 401, decoupling session invalidation from UI components.

### 5.2 Dynamic Environment Resolution
- API base URL resolves dynamically via `import.meta.env.VITE_API_BASE_URL`.
- Development defaults to `http://localhost:8081/api`.
- Production builds dynamically target the deployed backend endpoint (e.g. `https://api.workstream.example/api`).
