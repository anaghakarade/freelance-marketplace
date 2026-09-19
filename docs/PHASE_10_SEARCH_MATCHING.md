# WorkStream — Phase 10: Intelligent Search, Freelancer Matching & Personalized Discovery

## 1. Overview & Objectives

The primary goal of Phase 10 is to make WorkStream's marketplace search and discovery intelligent, deterministic, and explainable. Instead of black-box ML or arbitrary scores, Phase 10 implements a deterministic 5-factor matching engine and multi-entity search platform backed by Go, Gin, PostgreSQL, and clean architecture.

### Flagship User Journey:
```
Buyer
  │
  ├─► Posts project (Requirements, Category, Budget, Skills)
  │
  ├─► WorkStream parses project requirements & normalizes required skills
  │
  ├─► Queries candidate talent pool
  │
  ├─► Computes deterministic 5-factor match score & breakdown
  │
  ├─► Buyer views Recommended Freelancers on Project Details with explainable checkmarks
  │
  └─► Buyer messages/invites freelancer directly into proposal and contract workflow
```

---

## 2. Architecture & Layering

```
Frontend (React + Vite)
  ├── services/api/searchApi.js          ── Multi-entity search client
  ├── services/api/matchingApi.js        ── Project talent matching client
  ├── services/api/recommendationApi.js  ── Personalized suggestions & interaction events
  ├── pages/marketplace/Marketplace.jsx  ── URL-synced search with relevance indicators
  ├── pages/marketplace/ProjectDetails.jsx── "Intelligent Talent Recommendations" card section
  └── pages/marketplace/FreelancersDiscovery.jsx ── Advanced talent filters & trust badges
         │
         ▼ (HTTP JSON via apiClient)
Backend (Go + Gin Clean Architecture)
  ├── handlers/search_handler.go         ── /api/search/*
  ├── handlers/matching_handler.go       ── /api/projects/:id/matches (RBAC)
  ├── handlers/recommendation_handler.go ── /api/recommendations/*
  │      │
  │      ▼
  ├── services/search_service.go         ── Parameter validation & sanitization
  ├── services/matching_service.go       ── Deterministic 5-factor scoring engine
  ├── services/skill_normalizer.go       ── Skill normalization & overlap analysis
  ├── services/recommendation_service.go ── Interaction signal aggregation & fallback
  │      │
  │      ▼
  ├── repositories/search_repository.go  ── SQL queries with weighted relevance
  ├── repositories/recommendation_repository.go ── user_interactions query & fallback
  └── PostgreSQL (with GIN indexes & user_interactions table)
```

---

## 3. The Matching Algorithm & Scoring Formula

The matching engine calculates a deterministic score $S \in [0, 100]$ using real database records.

### Configurable Weight Constants:
```go
const (
    WeightSkill      = 0.40  // 40%
    WeightTrust      = 0.20  // 20%
    WeightRating     = 0.15  // 15%
    WeightExperience = 0.15  // 15%
    WeightBudget     = 0.10  // 10%
)
```

### Mathematical Formula:
$$\text{MatchScore} = \text{round}\Big( S_{\text{skill}} \times 0.40 + S_{\text{trust}} \times 0.20 + S_{\text{rating}} \times 0.15 + S_{\text{exp}} \times 0.15 + S_{\text{budget}} \times 0.10 \Big)$$

### Score Components Breakdown:

1. **Skill Relevance ($S_{\text{skill}}$, 40%)**:
   - Skills are normalized using `NormalizeSkill()` to resolve aliases (e.g., `React.js`, `ReactJS`, `React` $\to$ `react`).
   - $$S_{\text{skill}} = \frac{|\text{MatchedSkills}|}{|\text{RequiredSkills}|} \times 100$$
   - If a project specifies no mandatory skills, $S_{\text{skill}} = 100.0$.

2. **Trust & Reliability ($S_{\text{trust}}$, 20%)**:
   - Integrated directly with Phase 8 trust profile and growth tiers:
     - **Elite**: $100.0$
     - **Top Performer / Top Rated**: $90.0$
     - **Trusted / Established**: $75.0$
     - **Rising**: $60.0$
     - **New / Unrated**: $40.0$

3. **Rating Score ($S_{\text{rating}}$, 15%)**:
   - $$S_{\text{rating}} = \min\left(100.0, \frac{\text{AverageRating}}{5.0} \times 100\right)$$
   - Baseline for unrated freelancers is set to $60.0$ to avoid excessive penalty for new accounts.

4. **Experience Score ($S_{\text{exp}}$, 15%)**:
   - Uses actual completed contracts and projects:
     - $$S_{\text{exp}} = \min(100.0, \text{CompletedContracts} \times 10)$$
     - 10+ completed contracts yields the maximum $100.0$.

5. **Budget Compatibility ($S_{\text{budget}}$, 10%)**:
   - Compares freelancer's `starting_price` ($P_{\text{fl}}$) against project budget ($B_{\text{proj}}$):
     - If $P_{\text{fl}} \le B_{\text{proj}}$: $100.0$
     - If $P_{\text{fl}} \le B_{\text{proj}} \times 1.25$: $80.0$
     - If $P_{\text{fl}} \le B_{\text{proj}} \times 1.50$: $60.0$
     - Otherwise: $40.0$
     - If project has no specified budget: $100.0$ (graceful fallback).

### Explainable Match Reasons:
Every match response includes a human-readable `reasons` list generated deterministically:
- `✓ Full match on all required skills (React, TypeScript)`
- `✓ Top Performer trust profile with verified track record`
- `✓ 5.0 average rating across client reviews`
- `✓ 10 completed freelance contracts`
- `✓ Starting rates fully align with project budget`

---

## 4. Skill Normalization

Defined in [`internal/services/skill_normalizer.go`](file:///c:/Users/User/.gemini/antigravity-ide/scratch/freelance-marketplace/backend/internal/services/skill_normalizer.go):
- Strips punctuation and extraneous whitespace.
- Maps canonical variations:
  - `react.js`, `reactjs`, `react js` $\to$ `react`
  - `node.js`, `nodejs`, `node js` $\to$ `node`
  - `next.js`, `nextjs` $\to$ `next`
  - `ts`, `typescript.js` $\to$ `typescript`
  - `js`, `javascript.js` $\to$ `javascript`
  - `postgres`, `psql`, `postgres-db` $\to$ `postgresql`
  - `ui/ux`, `ui-ux`, `ux/ui` $\to$ `ui/ux`
  - `golang`, `go lang` $\to$ `go`
  - `three.js`, `threejs` $\to$ `three.js`
  - `tailwind css`, `tailwind` $\to$ `tailwindcss`

---

## 5. Advanced Search & Relevance Scoring

Endpoint: `GET /api/search/services`

### Relevance Calculation:
When a query string $q$ is provided, services are ranked with an in-database score:
- **Title match**: $+50.0$
- **Tag match**: $+30.0$
- **Description match**: $+15.0$
- **Rating bonus**: $\text{Rating} \times 5.0$ (up to $+25.0$)

Supported filters: `q`, `category`, `subcategory`, `min_price`, `max_price`, `rating`, `delivery_time`, `tier`, `sort`, `page`, `limit`.

---

## 6. Personalized Recommendations

Endpoint: `GET /api/recommendations/services`

- **For Authenticated Users**:
  - Analyzes the `user_interactions` table for recent views, clicks, and searches.
  - Queries past contracts for category alignment.
  - Ranks services in matching categories by rating and volume.
- **For Anonymous Users**:
  - Deterministic popularity fallback: sorts by `is_featured DESC`, `rating DESC`, `order_count DESC`, `views_count DESC`.

---

## 7. API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search/services` | Public | Advanced service search with relevance scoring |
| `GET` | `/api/search/freelancers` | Public | Talent discovery with skill, rating, price & tier filters |
| `GET` | `/api/search/projects` | Public | Open buyer projects search |
| `GET` | `/api/projects/:id/matches` | Buyer / Admin | 5-factor explainable project talent matching |
| `GET` | `/api/recommendations/services` | Optional | Personalized service recommendations |
| `POST` | `/api/recommendations/events` | Optional | Log user interaction signals |

---

## 8. Security & Authorization

- **IDOR Protection**: `GET /api/projects/:id/matches` verifies that the requester is the project owner (`project.BuyerID == claims.UserID`) or an administrator (`claims.Role == "admin"`). Unauthorized users receive `403 Forbidden`.
- **Query Bounds**: Queries are capped at $200$ characters. Pagination `limit` is bounded between $1$ and $100$.
- **Validation**: `min_price > max_price` returns `400 Bad Request`.
- **SQL Injection**: All queries use parameterized `$1, $2, ...` placeholders.
