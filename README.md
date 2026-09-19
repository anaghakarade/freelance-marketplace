# WorkStream — Freelance Marketplace Platform

> A full-stack, production-hardened freelance marketplace built with **React 18 + Vite** (frontend) and **Go (Gin) + PostgreSQL** (backend).

WorkStream enables buyers to post project briefs and commission services, freelancers to discover opportunities and submit proposals, and administrators to govern the platform through a comprehensive moderation suite — all backed by an atomic financial escrow ledger and deterministic talent matching engine.

---

## Quick Links

| Document | Purpose |
| :--- | :--- |
| [Project Documentation](docs/PROJECT_DOCUMENTATION.md) | Platform overview, user workflows, tech stack |
| [Architecture Guide](docs/ARCHITECTURE.md) | Request lifecycle, layered clean architecture |
| [Database Schema](docs/DATABASE_SCHEMA.md) | All tables, migrations, and data relationships |
| [API Documentation](docs/API_DOCUMENTATION.md) | All REST endpoints with parameters and responses |
| [Security Guide](docs/SECURITY.md) | Auth, RBAC, IDOR protection, rate limiting |
| [Demo Script](docs/DEMO_GUIDE.md) | 10–15 minute live demonstration guide |
| [Viva Q&A](docs/VIVA_QUESTIONS.md) | Technical defense questions and answers |
| [Release Checklist](docs/RELEASE_CHECKLIST.md) | Final gate verification |
| [Deployment Guide](docs/PHASE_13_DEPLOYMENT.md) | Cloud deployment architecture and runbooks |
| [Deployment Commands](docs/DEPLOYMENT_COMMANDS.md) | All verified operational commands |

---

## Prerequisites

| Requirement | Minimum Version |
| :--- | :--- |
| **Go** | 1.23+ |
| **Node.js** | 20+ |
| **npm** | 10+ |
| **PostgreSQL** | 15+ |
| **Docker** *(optional)* | 24+ |

---

## Local Development Setup

### Option A — Quick Start with Docker Compose

```bash
# 1. Clone the repository
git clone <repository-url>
cd freelance-marketplace

# 2. Start PostgreSQL, run migrations, and start the backend API in containers
docker-compose up --build -d

# 3. Start the frontend development server
cp .env.example .env
npm install
npm run dev
# Frontend: http://localhost:5173
```

### Option B — Manual Setup (Without Docker)

#### 1. Configure Environment Files

```bash
# Frontend (root directory)
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME, JWT_SECRET
```

#### 2. Create PostgreSQL Database

```sql
CREATE DATABASE workstream;
```

#### 3. Apply Database Migrations

```bash
cd backend
go run ./cmd/migrate up
# Verify: go run ./cmd/migrate status
```

#### 4. Start Backend Server

```bash
cd backend
go run ./cmd/server
# Backend API: http://localhost:8081
# Health check: http://localhost:8081/api/health
```

#### 5. Start Frontend Development Server

```bash
# In root directory
npm install
npm run dev
# Frontend: http://localhost:5173
```

---

## Running Tests

### Backend (Go)

```bash
cd backend

# Run all tests with statement coverage:
go test -v -cover ./...

# Run static analysis:
go vet ./...

# Verify compilation:
go build ./...
```

### Frontend

```bash
# Lint with zero-warnings policy:
npm run lint

# Verify production build:
npm run build
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime mode | `development` or `production` |
| `PORT` | HTTP port | `8081` |
| `DATABASE_URL` | Unified PostgreSQL URL (takes priority) | `postgres://user:pass@host:5432/db?sslmode=require` |
| `DATABASE_HOST` | DB hostname (if not using DATABASE_URL) | `localhost` |
| `DATABASE_PORT` | DB port | `5432` |
| `DATABASE_USER` | DB user | `postgres` |
| `DATABASE_PASSWORD` | DB password | *(set in .env, never commit)* |
| `DATABASE_NAME` | Database name | `workstream` |
| `DATABASE_SSLMODE` | SSL mode | `disable` (dev), `require` (prod) |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |
| `JWT_SECRET` | 256-bit signing key | *(generated via `openssl rand -hex 32`)* |
| `JWT_EXPIRATION_HOURS` | Token validity | `24` |

### Frontend (`.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8081/api` |

---

## Production Deployment

WorkStream is fully configured for production deployment. See the guides:

- **[Phase 13 Deployment Guide](docs/PHASE_13_DEPLOYMENT.md)** — Architecture, providers, and migration runbook.
- **[Deployment Command Reference](docs/DEPLOYMENT_COMMANDS.md)** — All verified production commands.

### Key Production Files

| File | Purpose |
| :--- | :--- |
| `backend/Dockerfile` | Multi-stage Alpine container build |
| `docker-compose.yml` | Full local stack orchestration |
| `render.yaml` | Render IaC blueprint (backend, frontend, PostgreSQL) |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline |

### Deployment Status

> **DEPLOYMENT READY — CLOUD PROVISIONING PENDING**
>
> All infrastructure code is complete. Actual cloud deployment requires external provider credentials and DNS configuration.
