# WorkStream API Architecture

This document describes the layered architectural design used in the **WorkStream Go Backend**.

---

## Architectural Overview

The backend follows the **Layered Clean Architecture** pattern. This enforces strict separation of concerns, ensures testability, and keeps the codebase maintainable as the application expands into Authentication (Phase 2), Orders, Payments, and AI matching.

```text
       ┌─────────────────────────────────────────┐
       │         React Frontend (Client)         │
       └────────────────────┬────────────────────┘
                            │ HTTP / JSON
                            ▼
       ┌─────────────────────────────────────────┐
       │          Gin Router & Middleware        │
       │         (internal/routes/)              │
       └────────────────────┬────────────────────┘
                            │
                            ▼
       ┌─────────────────────────────────────────┐
       │             Handler Layer               │
       │         (internal/handlers/)            │
       └────────────────────┬────────────────────┘
                            │
                            ▼
       ┌─────────────────────────────────────────┐
       │             Service Layer               │
       │         (internal/services/)            │
       └────────────────────┬────────────────────┘
                            │
                            ▼
       ┌─────────────────────────────────────────┐
       │            Repository Layer             │
       │       (internal/repositories/)          │
       └────────────────────┬────────────────────┘
                            │ SQL Queries
                            ▼
       ┌─────────────────────────────────────────┐
       │           PostgreSQL Database           │
       └─────────────────────────────────────────┘
```

---

## Detailed Layer Responsibilities

### 1. Routes Layer (`internal/routes/`)
- **Purpose**: Defines URL routing, path parameters, and HTTP methods.
- **Middleware**: Applies CORS policies, logging, panic recovery, and rate limiting.
- **Rule**: Does not process business logic or interact with the database directly.

### 2. Handler Layer (`internal/handlers/`)
- **Purpose**: Acts as the HTTP adapter / controller.
- **Responsibilities**:
  - Parses HTTP query parameters, path variables, and JSON request bodies.
  - Performs initial input validation (checking for required IDs, formats).
  - Invokes the appropriate Service method.
  - Translates service output into standardized JSON responses with proper HTTP status codes (`200 OK`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).

### 3. Service Layer (`internal/services/`)
- **Purpose**: Encapsulates core business rules and workflows.
- **Responsibilities**:
  - Validates domain constraints (e.g., checking if a user is authorized, verifying state transitions).
  - Orchestrates interactions across multiple repositories.
  - Returns domain models or clean error types (e.g. `ErrCategoryNotFound`).
  - Completely decoupled from HTTP frameworks (does not import `gin`).

### 4. Repository Layer (`internal/repositories/`)
- **Purpose**: Manages all database persistence and SQL execution.
- **Responsibilities**:
  - Executes parameterized SQL queries using PostgreSQL connection pools.
  - Maps database rows into Go struct models (`models.Category`, `models.Service`).
  - Manages database transactions when atomic operations are needed.
  - Protects against SQL injection by using parameterized queries (`$1`, `$2`).

### 5. Models Layer (`internal/models/`)
- **Purpose**: Defines pure data structures and serialization tags.
- **Characteristics**:
  - Shared across Handlers, Services, and Repositories.
  - Includes JSON tags (`json:"..."`) for consistent frontend contract matching.

---

## Key Benefits of this Architecture

1. **Separation of Concerns**: Each package has exactly one responsibility.
2. **Easy Testing**: Services and Repositories can be unit-tested or mocked independently.
3. **Database Flexibility**: If storage logic changes, only the repository layer needs modification.
4. **Clean Error Handling**: Database internals are never exposed to HTTP clients; errors are transformed into clean, safe API responses.

---

## Phase 8 review routes

Contract reviews are handled by `ReviewHandler` → `ReviewRepository` (no extra service layer). Persistence of a new review plus `new_review` notification plus `review_created` activity uses `BeginTx` / `Commit` / `Rollback` in the repository, matching other transactional repositories.

See `backend/README.md` (Phase 8) for request rules, trust formulas, and which metrics are calculated vs returned as `null`.
