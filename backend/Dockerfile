# ==============================================================================
# WorkStream Go Backend — Production Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Static Compilation
# ------------------------------------------------------------------------------
FROM golang:1.23-alpine AS builder

# Install build dependencies & SSL certs
RUN apk update && apk add --no-cache git ca-certificates tzdata && update-ca-certificates

WORKDIR /build

# Cache dependency layer
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code and embedded SQL migrations
COPY . .

# Compile static binary without CGO for minimal attack surface
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /build/bin/server ./cmd/server

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /build/bin/migrate ./cmd/migrate

# ------------------------------------------------------------------------------
# Stage 2: Production Distroless / Minimal Alpine Runtime
# ------------------------------------------------------------------------------
FROM alpine:3.20

# Create unprivileged application user
RUN addgroup -S workstream && adduser -S workstream -G workstream

# Copy runtime certificates and timezone data
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

WORKDIR /app

# Copy compiled binaries from builder stage
COPY --from=builder --chown=workstream:workstream /build/bin/server /app/server
COPY --from=builder --chown=workstream:workstream /build/bin/migrate /app/migrate

# Drop root privileges
USER workstream

# Default port (can be overridden by cloud platform via $PORT)
ENV PORT=8080 \
    ENVIRONMENT=production

EXPOSE 8080

# Built-in lightweight container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

ENTRYPOINT ["/app/server"]
