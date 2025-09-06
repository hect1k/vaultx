# ---- Build Stage ----
FROM golang:1.24-bullseye AS builder

WORKDIR /app

# Copy go mod files first (cache deps)
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o vaultx-backend ./cmd/server

# ---- Runtime Stage ----
FROM gcr.io/distroless/base-debian12

WORKDIR /app

# Copy compiled binary
COPY --from=builder /app/vaultx-backend .

EXPOSE 8080
CMD ["./vaultx-backend"]
