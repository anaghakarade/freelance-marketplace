# WorkStream — Viva & Technical Defense Questions & Answers

This document provides definitive, technically precise answers to anticipated questions from professors, project reviewers, and technical supervisors.

---

### Q1: Why did you choose React for the frontend?
**Answer:** React's component-driven architecture allows encapsulation of complex UI elements (such as milestone trackers, dynamic proposal drawers, and glassmorphic dashboards) into reusable units. Combined with Vite, it provides instant Hot Module Replacement (HMR) during development and tree-shaken, minified Rollup bundles for production.

---

### Q2: Why choose Go for the backend instead of Node.js or Python?
**Answer:** Go compiles directly to static machine code with negligible memory overhead (~15MB runtime vs. 150MB+ for Node/Python). Its lightweight goroutine concurrency model enables high request throughput and predictable latency without complex asynchronous callback chains. Furthermore, Go’s strict type system catches schema and contract mismatches at compile time.

---

### Q3: Why Gin specifically among Go web frameworks?
**Answer:** Gin utilizes a custom radix-tree routing engine with zero dynamic memory allocations during route matching. It provides idiomatic middleware chaining, robust JSON binding and validation, and proven performance that is up to 40x faster than standard library routing.

---

### Q4: Why PostgreSQL instead of a NoSQL database like MongoDB?
**Answer:** WorkStream is fundamentally a transactional marketplace. Operations such as milestone escrow funding, proposal acceptance, and wallet balances demand ACID guarantees (Atomicity, Consistency, Isolation, Durability) and relational foreign keys to prevent orphan records or corrupted balances. PostgreSQL also offers powerful GIN trigram indexes for typo-tolerant full-text search.

---

### Q5: Why use JWT for authentication rather than server-side sessions?
**Answer:** JWTs (JSON Web Tokens) are stateless. The server does not need to query a shared session store (like Redis) on every HTTP request to authenticate a user; it cryptographically verifies the token signature using the secret key in memory. This reduces database I/O and allows horizontal backend scaling.

---

### Q6: How does Role-Based Access Control (RBAC) work in WorkStream?
**Answer:** The user's role (`buyer`, `freelancer`, `admin`) is embedded as a verified claim in the JWT. The `RequireRole` middleware inspects this claim and compares it against authorized roles for that endpoint. If the user’s role does not match, the request is aborted immediately with HTTP 403 Forbidden.

---

### Q7: How is Insecure Direct Object Reference (IDOR) prevented?
**Answer:** Authenticated endpoints never blindly trust resource IDs in the URL path. The domain service layer extracts the authenticated `currentUserID` from the request context and verifies ownership or participation before executing queries. For example, a buyer cannot fund milestones for a contract they do not own, and a freelancer cannot view another freelancer’s unaccepted proposal.

---

### Q8: How are user passwords secured?
**Answer:** Passwords are never stored in plaintext. They are hashed using `bcrypt` with a cost factor of 12 (`2^12` iterations). Bcrypt automatically generates a cryptographic salt per hash, mitigating rainbow table attacks, and introduces deliberate computational work to thwart brute-force attacks.

---

### Q9: How does the internal milestone escrow system work?
**Answer:** When a buyer funds a milestone, 10% is deducted as a platform fee, and 90% is placed in an `escrow_hold` state in the financial ledger. The funds are held by the platform until the freelancer submits work and the buyer explicitly approves the milestone. Only upon approval are the funds transferred into the freelancer's wallet balance.

---

### Q10: How are financial transactions made atomic? Why use database transactions?
**Answer:** All financial operations execute inside a PostgreSQL transaction block (`BeginTx`). If any step fails (e.g. updating milestone status, deducting buyer balance, or writing ledger entries), the entire transaction is rolled back via `defer tx.Rollback()`. This guarantees that money is never created from nothing, deducted without credit, or partially processed.

---

### Q11: How does the deterministic matching algorithm work?
**Answer:** The algorithm evaluates 5 weighted dimensions:
$$\text{FinalScore} = \text{round}(S_{\text{skill}} \times 0.40 + S_{\text{trust}} \times 0.20 + S_{\text{rating}} \times 0.15 + S_{\text{exp}} \times 0.15 + S_{\text{budget}} \times 0.10)$$
- **Skills (40%):** Ratio of matched project skills to required skills.
- **Trust (20%):** Tier score (*Top: 100, Trusted: 85, Established: 70, Rising: 50, New: 30*).
- **Rating (15%):** Normalized average review rating out of 5.
- **Experience (15%):** Completed contract count mapped logarithmically.
- **Budget (10%):** Compatibility between project budget and freelancer hourly rate.

---

### Q12: Why is the matching algorithm deterministic instead of using black-box machine learning?
**Answer:** In professional labor marketplaces, transparency and trust are critical. Black-box ML models can introduce unexplainable bias, hallucinated rankings, and non-reproducible results. A deterministic algorithm ensures that identical candidate profiles and project briefs always produce identical, auditable scores.

---

### Q13: How does skill normalization work?
**Answer:** The `SkillNormalizer` converts incoming skill strings to lowercase, removes punctuation, and maps common synonyms and aliases to a canonical token (e.g. `"React.js"`, `"ReactJS"`, and `"react js"` all resolve to canonical `"react"`).

---

### Q14: How does search work in the marketplace?
**Answer:** Full-text search leverages PostgreSQL GIN trigram indexes (`pg_trgm`) on service titles, descriptions, and user names. Queries use `%` similarity matching to provide typo-tolerant, sub-10ms keyword discovery without requiring external search clusters like Elasticsearch.

---

### Q15: How are personalized service recommendations generated?
**Answer:** The recommendation engine logs user interaction telemetry (`view`, `click`, `proposal`, `contract`). When generating recommendations, interactions are weighted by intent and decayed over time. If a user has no interaction history, the engine gracefully falls back to popularity-weighted recommendations.

---

### Q16: How does rate limiting work?
**Answer:** WorkStream employs an in-memory token-bucket rate limiter. Each client IP is assigned a bucket that refills at a fixed rate per minute (e.g. 60 requests/minute for authentication). Bursts up to bucket capacity are allowed; requests exceeding the limit are dropped with HTTP 429 and a `Retry-After` header.

---

### Q17: How does CORS work, and how is it configured in production?
**Answer:** Cross-Origin Resource Sharing (CORS) informs the browser whether client scripts on one origin can access resources on another origin. In WorkStream, `CORS_ALLOWED_ORIGINS` restricts access to the exact production frontend domain. Wildcard origins (`*`) are disallowed on authenticated routes.

---

### Q18: How does the deployment architecture work?
**Answer:** The React frontend is built into static assets deployed to an edge CDN (Vercel/Render). The Go backend is packaged as a minimal Alpine Docker container deployed to a container host (Render/Railway). Both communicate over HTTPS/TLS, with the Go backend connecting to a managed PostgreSQL database over encrypted SSL.

---

### Q19: Why use Docker for the backend?
**Answer:** Docker guarantees identical execution environments across local development, staging, and production. The multi-stage build compiles a standalone static binary without bundling Go compilers or build tools, producing an Alpine image under 25MB with no root privileges.

---

### Q20: What does the CI/CD pipeline do?
**Answer:** Implemented via GitHub Actions (`.github/workflows/ci.yml`), it triggers on push and pull requests to `main`. It automatically executes `go test -v -cover ./...`, `go vet ./...`, `go build ./...`, `npm run lint`, and `npm run build`. A commit cannot merge if any test or build fails.

---

### Q21: How are database migrations handled safely?
**Answer:** Migrations are sequentially numbered (`000001` to `000012`) and compiled into the Go binary using `embed.FS`. The `cmd/migrate` utility checks a `schema_migrations` tracking table, applying only unexecuted migrations inside transactions. Every migration has a matching `.down.sql` file for rollback.

---

### Q22: How are database backups and disaster recovery handled?
**Answer:** Automated daily snapshots are managed by the cloud database provider. For manual procedures, `pg_dump -F c` produces a compressed binary dump that can be restored with `pg_restore --clean`.

---

### Q23: How is application rollback handled?
**Answer:** Application rollback is decoupled from database rollback. If an application regression occurs, the cloud host immediately reverts traffic to the previous Git SHA or container image. Database schema rollback is executed only if a migration introduces breaking changes.

---

### Q24: What testing was performed on WorkStream?
**Answer:** Testing spans 117 automated unit and integration tests across services, handlers, middleware, and repositories. Tests validate financial invariants (no double release, fee calculations), state machines (proposals, contracts, milestones), search boundary conditions, security headers, and rate limiting.

---

### Q25: What are the known limitations of the current system?
**Answer:**
1. **In-Memory Rate Limiting:** Single-instance only; horizontal scaling across multiple backend instances would require a shared Redis store.
2. **Internal Test Ledger:** Uses simulated digital wallets rather than live credit card gateways (Stripe/PayPal).
3. **File Deliverables:** URLs and text links are submitted for deliverables rather than direct binary uploads to an S3 bucket.
