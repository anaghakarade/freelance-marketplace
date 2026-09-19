# WorkStream — Security Architecture & Hardening Guide

## 1. Overview
WorkStream implements an in-depth security defense model spanning application middleware, cryptographic protocols, database transaction locks, and operational error handling.

This document details all implemented security controls and explicitly distinguishes between **Application-Level Implemented Controls** and **Deployment-Dependent Controls**.

---

## 2. Authentication & Identity Safeguards

### 2.1 Password Hashing
* **Algorithm:** `bcrypt` (`golang.org/x/crypto/bcrypt`) with work factor cost `12`.
* **Salt:** Automatically generated per-password by bcrypt; passwords are never stored in plaintext.
* **Input Bounds:** Passwords enforced between 6 and 128 characters; usernames between 2 and 100 characters.

### 2.2 JWT Verification & Algorithm Pinning
* **Standard:** Signed using HMAC-SHA256 (`HS256`).
* **Algorithm Pinning:** In `ValidateToken`, the token header is explicitly asserted:
  ```go
  if token.Method.Alg() != "HS256" {
      return nil, errors.New("unexpected signing algorithm")
  }
  ```
  This completely blocks algorithm-confusion attacks (e.g., `none` or asymmetric public key spoofing).
* **Expiration & Claims:** Tokens include `exp` (default 24h), `sub` (user ID), `email`, and `role`. Expired tokens are immediately invalidated.

---

## 3. Authorization & IDOR Protection

### 3.1 Role-Based Access Control (RBAC)
* Roles: `buyer`, `freelancer`, `admin`.
* Routes enforce strict access guards via `RequireRole`:
  * Buyer-only: `/api/projects` (POST), `/api/proposals/:id/accept`, `/api/milestones/:id/fund`.
  * Freelancer-only: `/api/projects/:id/proposals` (POST), `/api/services` (POST), `/api/seller/*`.
  * Admin-only: `/api/admin/*`.

### 3.2 Insecure Direct Object Reference (IDOR) Mitigation
* Project updates verify `project.ClientID == currentUserID`.
* Proposal viewing verifies caller is either the project owner or the proposing freelancer.
* Contract and milestone actions verify caller is an active participant (`BuyerID == currentUserID || FreelancerID == currentUserID`).
* Project matching (`/api/projects/:id/matches`) prevents unauthorized viewing of talent scores by asserting caller ownership.

---

## 4. Input Validation & Denial of Service Defenses

### 4.1 Request Body Limiting
* Middleware `RequestBodyLimit(2 * 1024 * 1024)` caps all incoming HTTP request bodies at 2MB. Oversized payloads receive HTTP 413 Payload Too Large before allocating memory.

### 4.2 In-Memory Token-Bucket Rate Limiting
* Thread-safe rate limiters protect high-risk surfaces:
  * `/api/auth/login`, `/api/auth/register`: 60 requests/minute (burst 20).
  * `/api/reports`: 30 requests/minute (burst 10).
  * `/api/recommendations/events`: 120 requests/minute (burst 40).
* Exceeding the bucket returns HTTP 429 Too Many Requests with a `Retry-After: 60` header.

### 4.3 Query Parameter Clamping
* Search query text is clamped to 200 characters to prevent ReDoS.
* Pagination `limit` is clamped to 1–100 across all endpoints.
* Review ratings are strictly bounded between 1 and 5.
* Milestone funding requires `amount > 0`.

---

## 5. Database & Financial Security

### 5.1 SQL Injection Prevention
* All database interactions in `internal/repositories/` utilize prepared statements with parameterized placeholders (`$1, $2, ...`). Dynamic string interpolation in SQL queries is prohibited.
* Dynamic sorting fields are verified against strict allowlists (`created_at`, `price`, `rating`).

### 5.2 Atomic Escrow & Double-Spend Locks
* Financial mutations use `SELECT ... FOR UPDATE` row-level locks inside PostgreSQL transactions.
* Double-funding and double-release are physically prevented via milestone state machines and unique constraints (`payments.milestone_id UNIQUE`).

---

## 6. HTTP & Transport Security

### 6.1 Security Headers
The following headers are automatically injected into all HTTP responses:
* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: DENY`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `X-XSS-Protection: 1; mode=block`
* `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production mode)

### 6.2 Error Sanitization
* All internal database errors, Go stack traces, and filesystem paths are intercepted by `RespondError`. Clients receive generic, structured error messages without schema exposure.

### 6.3 Sensitive Data Scrubbing
* Passwords, JWT secrets, authorization tokens, and payment secrets are omitted from logging pipelines.

---

## 7. Security Status: Implemented vs. Deployment-Dependent

| Security Control | Implementation Mechanism | Status |
| :--- | :--- | :--- |
| **Password Hashing (bcrypt)** | Go backend `internal/services/auth_service.go` | **IMPLEMENTED** |
| **JWT Algorithm Pinning** | Go backend `internal/services/auth_service.go` | **IMPLEMENTED** |
| **RBAC Authorization** | Gin Middleware `internal/middleware/auth_middleware.go` | **IMPLEMENTED** |
| **IDOR Access Checks** | Domain Service Layer `internal/services/*` | **IMPLEMENTED** |
| **SQL Injection Prevention** | PostgreSQL Parameterized Queries `internal/repositories/*` | **IMPLEMENTED** |
| **In-Memory Rate Limiting**| Token-Bucket Middleware `internal/middleware/rate_limiter.go` | **IMPLEMENTED** |
| **Request Size Limits (2MB)**| RequestBodyLimit Middleware `internal/middleware/body_limit.go` | **IMPLEMENTED** |
| **Security Headers** | SecurityHeaders Middleware `internal/middleware/security_headers.go` | **IMPLEMENTED** |
| **Error Sanitization** | Response Helper `internal/handlers/response.go` | **IMPLEMENTED** |
| **Transaction Escrow Locks** | PostgreSQL `BeginTx` + `FOR UPDATE` | **IMPLEMENTED** |
| **Cloud Managed HTTPS / TLS** | Cloudflare / Render Edge TLS Certificates | **DEPLOYMENT-DEPENDENT** |
| **Cloud WAF & DDoS Shield** | Cloudflare Edge / AWS Shield | **DEPLOYMENT-DEPENDENT** |
| **Distributed Redis Limiter**| Redis Cluster Rate Limiting (Multi-instance) | **DEPLOYMENT-DEPENDENT** |
| **Encrypted Backups At Rest**| Cloud Provider Storage Encryption (AES-256) | **DEPLOYMENT-DEPENDENT** |
