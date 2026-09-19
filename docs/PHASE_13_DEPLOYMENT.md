# WorkStream — Phase 13 Production Deployment & Infrastructure Guide

## Overview
This document outlines the production architecture, hosting platform evaluation, infrastructure-as-code configuration, database migration procedures, SSL/TLS termination, monitoring, and disaster recovery workflows for the **WorkStream Freelance Marketplace** platform.

---

## 1. Production Deployment Architecture

```text
                                INTERNET
                                   │
                                   ▼ [HTTPS / TLS 1.3]
                        Cloudflare / CDN Edge
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
         [Production Frontend]             [Production Backend API]
          Vercel / Render SPA               Render / Railway Web Service
       https://workstream.example       https://api.workstream.example
                  │                                 │
                  │ REST (JSON + JWT)               │ Bounded SQL Connection Pool
                  └─────────────────────────────────► (max 25 conns, SSL required)
                                                    ▼
                                          [Managed PostgreSQL]
                                        Supabase / Render / Neon
                                          PostgreSQL 15+ (Encrypted)
```

---

## 2. Recommended Hosting Providers

| Component | Recommended Provider | Alternative Provider | Selection Rationale | Free Tier / Cost Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel / Render Static** | Cloudflare Pages / Netlify | Seamless Vite static SPA build, automatic HTTPS certificates, instant global CDN edge caching, and URL rewrites to `/index.html`. | Free tier includes generous bandwidth and global CDN. |
| **Backend** | **Render Web Service** | Railway / Fly.io | Native Go runtime and Dockerfile support, automatic port binding via `$PORT`, continuous deployment via GitHub triggers, built-in HTTPS, and health checks. | Generous starter tier; simple zero-ops deployment. |
| **Database** | **Supabase / Render PostgreSQL** | Neon / Railway DB | Fully managed PostgreSQL 15+, automated daily backups, SSL connection strings (`sslmode=require`), and connection pooling. | Free/starter tier available with zero maintenance. |

---

## 3. Production Environment Configuration

All production configurations are provided strictly via environment variables. **No credentials or secrets are ever hardcoded in the codebase.**

### 3.1 Backend Environment Variables

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Operating environment mode | `production` |
| `PORT` | HTTP port provided by hosting environment | `8080` (or dynamically injected by provider) |
| `DATABASE_URL` | PostgreSQL connection URI | `postgres://user:password@host:5432/dbname?sslmode=require` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `https://workstream.example,https://workstream-frontend.onrender.com` |
| `JWT_SECRET` | Cryptographically secure 256-bit key | Generated via `openssl rand -hex 32` |
| `JWT_EXPIRATION_HOURS`| Lifetime of issued JWT tokens | `24` |
| `AUTH_RATE_LIMIT_RPM` | Login/register rate limit per client IP | `60` |
| `REPORT_RATE_LIMIT_RPM`| Report submission rate limit | `30` |
| `MAX_REQUEST_BODY_BYTES`| Maximum HTTP request body limit | `2097152` (2MB) |

### 3.2 Frontend Environment Variables

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Fully qualified backend API base URL | `https://api.workstream.example/api` |

---

## 4. Database Migration & Deployment Safety

All schema migrations are version-tracked and compiled into the Go binary via Go's `embed.FS` (`backend/migrations`).

### Migration Execution Procedure
1. **Pre-Migration Safety Backup**: Take an automated snapshot or `pg_dump` before applying any migrations.
2. **Execute Migration**:
   ```bash
   # Using Go migration CLI:
   DATABASE_URL="postgres://user:pass@host:5432/dbname?sslmode=require" ./bin/migrate up
   ```
3. **Verify Status**:
   ```bash
   ./bin/migrate status
   ```
4. **Health Check Verification**: Query `GET /api/health` to confirm healthy database connection pool status (`{"status":"ok","database":"connected"}`).

---

## 5. Backup & Disaster Recovery Strategy

### 5.1 Automated Snapshots
- Managed PostgreSQL providers (Render, Supabase, Neon) take daily point-in-time snapshots with a 7-day retention window.

### 5.2 Manual Backup Command
```bash
pg_dump --clean --if-exists --no-owner --no-privileges \
  -d "$DATABASE_URL" \
  -F c -f "workstream_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 5.3 Restore Procedure
```bash
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$DATABASE_URL" \
  "workstream_backup_<timestamp>.dump"
```

---

## 6. Observability, Health Checks & Logging

### 6.1 Health Check Endpoint
- **URL:** `GET /api/health`
- **Behavior:** Executes `db.PingContext()` against the database pool.
- **Healthy Response (HTTP 200):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-16T18:40:00Z",
    "version": "1.0.0",
    "database": "connected"
  }
  ```
- **Degraded Response (HTTP 503):**
  ```json
  {
    "status": "degraded",
    "timestamp": "2026-09-16T18:40:00Z",
    "version": "1.0.0",
    "database": "disconnected"
  }
  ```

### 6.2 Production Logging Principles
- Logs output exclusively to standard output (`stdout`) / standard error (`stderr`) formatted for container log ingestion.
- Passwords, JWT secrets, authorization headers, credit card info, and stack traces are strictly scrubbed from logs.

---

## 7. Rollback Plan

If a production deployment introduces regressions:
1. **Application Rollback:** Revert to previous Git SHA / container image via host console.
2. **Database Schema Evaluation:** Check if migration is backwards-compatible. If yes, leave schema intact; if breaking, restore from pre-deployment snapshot.
3. **Smoke Test Verification:** Run health checks and critical flow smoke tests (auth, project creation, escrow funding).

---

## 8. Production Readiness Checklist

### Infrastructure
- [x] Multi-stage Go production Dockerfile implemented
- [x] Docker Compose orchestration configured
- [x] Render Blueprint (`render.yaml`) IaC configured
- [x] GitHub Actions CI pipeline configured (`.github/workflows/ci.yml`)
- [x] Health check endpoint operational (`GET /api/health`)

### Configuration & Security
- [x] Environment-driven configuration supporting `DATABASE_URL`
- [x] CORS restricted to authorized frontend origins
- [x] In-memory rate limiting active on auth routes
- [x] Security headers active (HSTS, nosniff, DENY, XSS protection)
- [x] Request payload capped at 2MB (`RequestBodyLimit`)
- [x] Secrets isolated to environment variables (never committed to git)

### Application Quality
- [x] All 117 Go unit & integration tests pass (exit code 0)
- [x] Go code passes `go vet` without issues
- [x] Frontend passes ESLint with 0 warnings/errors
- [x] Frontend production bundle compiled cleanly (`npm run build`)
