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
