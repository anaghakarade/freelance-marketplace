# WorkStream Deployment & Operations Command Reference

This document catalogs the verified commands for local development, automated testing, database migrations, backups, and production deployment across the WorkStream stack.

---

## 1. Local Development

### 1.1 Start Database (Local PostgreSQL or Docker)
```bash
# Option A: Start via Docker Compose
docker-compose up -d postgres

# Option B: Run local PostgreSQL service
# Ensure PostgreSQL service is running on port 5432 with database 'workstream'
```

### 1.2 Run Database Migrations
```bash
cd backend
go run ./cmd/migrate up
```

### 1.3 Start Backend Server
```bash
cd backend
go run ./cmd/server
# Server listens on configured PORT (default: http://localhost:8080 or 8081)
```

### 1.4 Start Frontend Development Server
```bash
# In the root directory:
npm run dev
# Frontend runs at: http://localhost:5173
```

---

## 2. Testing & Quality Assurance

### 2.1 Backend Unit & Integration Tests
```bash
cd backend

# Run all tests:
go test ./...

# Run all tests with statement coverage:
go test -v -cover ./...

# Static analysis and vetting:
go vet ./...
```

### 2.2 Frontend Linting & Build Verification
```bash
# In the root directory:

# Run linter with strict zero-warning policy:
npm run lint

# Compile production bundle:
npm run build
```

---

## 3. Database Operations

### 3.1 Migration Status Check
```bash
cd backend
go run ./cmd/migrate status
```

### 3.2 Database Backup (pg_dump)
```bash
# Take binary compressed backup:
pg_dump --clean --if-exists --no-owner --no-privileges \
  -d "$DATABASE_URL" \
  -F c -f "workstream_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 3.3 Database Restore (pg_restore)
```bash
# Restore from dump file:
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$DATABASE_URL" \
  "workstream_backup_YYYYMMDD_HHMMSS.dump"
```

---

## 4. Containerization (Docker)

### 4.1 Build Backend Docker Image
```bash
docker build -t workstream-backend:latest ./backend
```

### 4.2 Run Containerized Multi-Service Stack
```bash
# Spins up PostgreSQL, runs migrations, and starts the Go backend API
docker-compose up --build -d
```

### 4.3 Container Logs & Health Check
```bash
# View backend logs:
docker logs -f workstream-api

# Check container health status:
docker inspect --format='{{json .State.Health}}' workstream-api
```

---

## 5. Production Deployment Commands

### 5.1 Compile Static Go Binaries
```bash
cd backend

# Compile backend server:
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s -extldflags '-static'" -o bin/server ./cmd/server

# Compile migration utility:
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s -extldflags '-static'" -o bin/migrate ./cmd/migrate
```

### 5.2 Compile Frontend Production Bundle
```bash
# Build production bundle with target API URL:
VITE_API_BASE_URL="https://api.workstream.example/api" npm run build
```

### 5.3 Verify Production Health Endpoint
```bash
curl -i https://api.workstream.example/api/health
```
