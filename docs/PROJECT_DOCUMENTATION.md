# WorkStream — Comprehensive Project Documentation

## 1. Project Overview

### 1.1 What is WorkStream?
**WorkStream** is an enterprise-grade, full-stack freelance marketplace platform engineered to bridge the gap between clients (buyers) seeking high-quality digital services and skilled independent professionals (freelancers). It couples modern consumer marketplace aesthetics (glassmorphism, micro-interactions, responsive ergonomics) with a hardened, transactional backend built in Go and backed by PostgreSQL.

### 1.2 Problem Being Addressed
Traditional freelance platforms often suffer from:
1. **Opaque Talent Discovery:** Search algorithms dominated by ad spend rather than objective skill compatibility and verified reputation.
2. **Payment Insecurity & Fraud:** Vulnerabilities in milestone escrow, double-release exploits, or unauthorized chargebacks.
3. **Bloated Web Architectures:** Heavy client bundles, slow server responses, and fragile database consistency.
4. **Poor Governance & Moderation:** Weak admin observability, lack of immutable audit trails, and slow resolution of user disputes.

WorkStream solves these challenges through:
- **Deterministic Skill & Talent Matching:** A transparent multi-factor scoring engine (Skills 40%, Trust 20%, Rating 15%, Experience 15%, Budget 10%).
- **Atomic Escrow Ledger:** Financial workflows guaranteeing that funds cannot be created from nothing, double-spent, or released without authorization.
- **High-Performance Go Engine:** Sub-millisecond routing, strict payload limiting, in-memory token-bucket rate limiting, and zero-allocation JSON handlers.
- **Enterprise Moderation & Audit:** Immutable audit logging, entity suspension triggers, and structured report lifecycle workflows.

---

## 2. Target Users & Core Workflows

### 2.1 Target Users
* **Buyers (Clients / Businesses):** Individuals and companies commissioning design, development, content, or marketing work.
* **Freelancers (Sellers / Talent):** Independent professionals offering packaged services or bidding on bespoke projects.
* **Administrators (Platform Operators):** Governance staff reviewing flagged reports, moderating content, and managing platform compliance.

### 2.2 Buyer Workflow
1. **Onboarding & Discovery:** Register as a Buyer $\rightarrow$ Authenticate via JWT $\rightarrow$ Explore services across taxonomy or search via full-text trigram queries.
2. **Commissioning Projects:** Post a detailed project brief with required skills, budget bounds, and timelines.
3. **Talent Review:** View deterministically ranked candidate matches $\rightarrow$ Review incoming proposals $\rightarrow$ Accept the winning bid.
4. **Contract & Escrow:** Contract auto-generated $\rightarrow$ Fund milestones into escrow (held securely in ledger) $\rightarrow$ Review deliverable submissions.
5. **Approval & Feedback:** Approve work $\rightarrow$ Release payment to freelancer wallet $\rightarrow$ Submit verified directional rating and review.

### 2.3 Freelancer Workflow
1. **Profile & Service Setup:** Register as Freelancer $\rightarrow$ Create trust profile with verified skills and bio $\rightarrow$ Publish fixed-price services across basic/standard/premium tiers.
2. **Project Opportunity Discovery:** Browse open client projects $\rightarrow$ Filter by skills, budget, and scope $\rightarrow$ Submit tailored proposals.
3. **Execution & Milestone Delivery:** Receive contract upon acceptance $\rightarrow$ Work on funded milestones $\rightarrow$ Submit milestone deliverables for review.
4. **Payout & Growth:** Receive escrow funds into personal digital wallet upon buyer approval $\rightarrow$ Advance across growth tiers (*New $\rightarrow$ Rising $\rightarrow$ Established $\rightarrow$ Trusted $\rightarrow$ Top Performer*).

### 2.4 Administrator Workflow
1. **Governance Dashboard:** Access protected `/admin` portal with role-based authentication (`admin`).
2. **Audit & Oversight:** Monitor real-time platform KPIs, volume metrics, and active contracts.
3. **Content Moderation:** Review pending services $\rightarrow$ Approve, reject (with mandatory reason), or suspend abusive services.
4. **User & Project Moderation:** Suspend or reactivate users $\rightarrow$ Close or suspend fraudulent projects.
5. **Dispute & Report Resolution:** Triage incoming reports $\rightarrow$ Mark under review $\rightarrow$ Resolve or dismiss with mandatory resolution logs.
6. **Immutable Audit Trail:** Query time-stamped audit logs detailing every administrative intervention.

---

## 3. Technology Stack

### 3.1 Frontend
- **Core Framework:** React 18.3 (JavaScript / JSX)
- **Build Tool & Bundler:** Vite 5.4 with HMR and Rollup production minification
- **Routing:** React Router v6 with declarative Protected Routes and Role-Based Guards
- **Icons:** Lucide React (`lucide-react`)
- **Interactive Visuals:** Three.js / Canvas 3D background components where applicable
- **Styling Architecture:** Pure Vanilla CSS Design System featuring Glassmorphism, CSS Variables, and Dark/Light theme switching

### 3.2 Backend
- **Programming Language:** Go 1.23+ (Statically typed, high-concurrency compiled binary)
- **HTTP Routing & Middleware:** Gin Web Framework (`github.com/gin-gonic/gin`)
- **CORS Management:** `github.com/gin-contrib/cors`
- **Security & Password Hashing:** `golang.org/x/crypto/bcrypt` (cost 12)
- **Token Authorization:** `github.com/golang-jwt/jwt/v5` (HS256 with algorithm pin)
- **Environment Management:** `github.com/joho/godotenv`

### 3.3 Database
- **Engine:** PostgreSQL 15+
- **Driver:** `github.com/lib/pq`
- **Schema Management:** 12 sequential up/down SQL migrations compiled via Go's native `embed.FS`
- **Connection Management:** Connection pool configured with 25 max connections, 10 idle connections, and 15-minute connection max lifetime

### 3.4 Infrastructure & Release Engineering
- **Containerization:** Multi-stage production `backend/Dockerfile` using Alpine Linux
- **Local Orchestration:** `docker-compose.yml` orchestrating PostgreSQL, auto-migration runner, and Go backend API
- **Infrastructure as Code (IaC):** `render.yaml` declarative blueprint for Render Web Services and Managed PostgreSQL
- **Continuous Integration:** GitHub Actions (`.github/workflows/ci.yml`) validating Go tests, vet, build, frontend lint, and production bundle builds
