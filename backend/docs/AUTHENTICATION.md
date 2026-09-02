# WorkStream — Authentication & Authorization Guide

## Overview

WorkStream Phase 2 introduces a secure, stateless authentication and role-based authorization system using:
- **bcrypt** (golang.org/x/crypto/bcrypt) for password hashing
- **HMAC-SHA256 JWT** (custom stdlib implementation) for session tokens
- **Go Gin middleware** for route protection
- **PostgreSQL** for user persistence

---

## Architecture

```
POST /api/auth/register  →  AuthHandler.Register  →  AuthService.Register  →  UserRepository.Create
POST /api/auth/login     →  AuthHandler.Login     →  AuthService.Login     →  UserRepository.FindByEmail
GET  /api/auth/me        →  RequireAuth middleware →  AuthHandler.Me       →  AuthService.GetCurrentUser
POST /api/auth/logout    →  AuthHandler.Logout    (stateless: client clears token)
```

---

## User Roles

| Role    | Description                        | Can Self-Register |
|---------|------------------------------------|-------------------|
| `buyer` | Hires freelancers, places orders   | ✅ Yes             |
| `seller`| Provides services (aka freelancer) | ✅ Yes             |
| `admin` | Platform administrator             | ❌ No (seed only)  |

> **Frontend Note**: The frontend uses `freelancer` as an alias for `seller`. The backend canonically stores `seller` in the database.

---

## Registration Flow

```
Client → POST /api/auth/register
  Body: { name, email, password, role, accountType }

Server:
  1. Validate inputs (name ≥ 2 chars, valid email, password ≥ 6 chars)
  2. Reject if role = "admin"
  3. Check email uniqueness in users table
  4. bcrypt.GenerateFromPassword(password, cost=10)
  5. INSERT INTO users (id, name, email, password_hash, role, ...)
  6. GenerateToken(user) → HMAC-SHA256 JWT
  7. Return { token, user } (password_hash NEVER returned)

Response (201 Created):
  { "success": true, "message": "Account created successfully", "data": { "token": "...", "user": {...} } }
```

---

## Login Flow

```
Client → POST /api/auth/login
  Body: { email, password }

Server:
  1. SELECT user WHERE LOWER(email) = LOWER($1)
  2. Check user.status != 'suspended' and user.is_active = true
  3. bcrypt.CompareHashAndPassword(user.password_hash, password)
  4. On success: GenerateToken(user)
  5. Return { token, user }

Response (200 OK):
  { "success": true, "message": "Login successful", "data": { "token": "...", "user": {...} } }
```

---

## JWT Token Format

Tokens are standard JWT (Header.Payload.Signature) signed with HMAC-SHA256:

```json
// Header
{ "alg": "HS256", "typ": "JWT" }

// Payload (JWTClaims)
{
  "userId": "usr_123456789",
  "email": "user@example.com",
  "role": "buyer",
  "sub": "usr_123456789",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Configuration:**
- `JWT_SECRET` — HMAC signing key (in `.env`)
- `JWT_EXPIRATION_HOURS` — Token lifetime (default: 24 hours)

> ⚠️ **Production**: Use a strong, randomly generated `JWT_SECRET` (min 32 bytes). Never commit it.

---

## Middleware

### `RequireAuth(authService)`

Validates the JWT token from the `Authorization: Bearer <token>` header.

On success: injects `user_id`, `email`, `role` into `gin.Context`.
On failure: returns `401 Unauthorized`.

### `RequireRole(roles ...string)`

Must be chained after `RequireAuth`. Checks the context role against the provided list.

On failure: returns `403 Forbidden`.

**Example usage in routes:**

```go
protected := api.Group("/admin")
protected.Use(middleware.RequireAuth(authService))
protected.Use(middleware.RequireRole("admin"))
{
    protected.GET("/dashboard", adminHandler.Dashboard)
}
```

---

## Frontend Integration

### Token Storage

The JWT token is stored in localStorage under `workstream_token`.

### Auto-Attachment

`apiClient.js` automatically reads and injects `Authorization: Bearer <token>` on every API request when a token is present.

### Auth State

```js
// Login (tries backend first, fallback to localStorage)
const user = await authService.login(email, password);

// Register
const user = await authService.register({ name, email, password, role });

// Logout (clears token + user from localStorage)
await authService.logout();

// Get current user (from localStorage)
const user = authService.getCurrentUser();

// Listen for auth changes
const sub = authService.onAuthStateChange((event, user) => { ... });
sub.unsubscribe();
```

---

## Security

| Concern                  | Implementation                                        |
|--------------------------|-------------------------------------------------------|
| Password storage         | bcrypt hash only (`json:"-"` — never returned in API) |
| Token forgery            | HMAC-SHA256 signature verified on every request       |
| Token expiry             | `exp` claim checked on validation                     |
| Admin self-registration  | Rejected with 400 if `role = "admin"` on register     |
| SQL injection            | Parameterized queries (`$1`, `$2`, ...)               |
| Logging                  | Passwords NEVER logged                                |

---

## Admin Provisioning

Admin users cannot register via the public API. To create an admin:

**Option 1 — SQL (recommended for seed):**
```sql
-- Generate bcrypt hash first: e.g., $2a$10$... for 'adminpassword'
INSERT INTO users (id, name, email, password_hash, role, account_type, status, is_active)
VALUES ('usr_admin_1', 'Admin User', 'admin@workstream.io', '$2a$10$...', 'admin', 'individual', 'active', TRUE);
```

**Option 2 — Direct database update (for existing user):**
```sql
UPDATE users SET role = 'admin' WHERE email = 'trusted@workstream.io';
```

---

## Endpoints Reference

| Method | Endpoint              | Auth Required | Body                                     | Response                    |
|--------|-----------------------|---------------|------------------------------------------|-----------------------------|
| POST   | `/api/auth/register`  | No            | `{ name, email, password, role }`        | `201 { token, user }`       |
| POST   | `/api/auth/login`     | No            | `{ email, password }`                    | `200 { token, user }`       |
| GET    | `/api/auth/me`        | Yes (Bearer)  | —                                        | `200 { user }`              |
| POST   | `/api/auth/logout`    | No            | —                                        | `200 { message }`           |

---

## Error Codes

| Status | Meaning                                    |
|--------|--------------------------------------------|
| 400    | Validation error or admin registration     |
| 401    | Missing/expired/invalid JWT token          |
| 403    | Insufficient role permissions              |
| 409    | Email already registered                   |
| 500    | Internal server error                      |

---

## Testing with curl

```bash
# Register
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"secret123","role":"buyer"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'

# Get current user (replace TOKEN with JWT from login response)
curl -X GET http://localhost:8081/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Logout
curl -X POST http://localhost:8081/api/auth/logout \
  -H "Authorization: Bearer TOKEN"
```

---

## Seed User Credentials

Seeded via `000003_add_auth_to_users.up.sql`:

| Email                        | Password       | Role     |
|------------------------------|----------------|----------|
| sarah.j@workstream.io        | workstream123  | seller   |
| alice@corporateventures.com  | workstream123  | buyer    |
| admin@workstream.io          | admin123       | admin    |

*(All other seed users also use `workstream123`)*
