# Stage 1: Build the client
FROM node:23-alpine3.20 AS client-builder

# Set working directory for client build
WORKDIR /build/client

# Copy client package.json and package-lock.json
COPY client/package*.json ./

# Install client dependencies
RUN npm install

# Copy client source code
COPY client/ ./

# Build the client
RUN npm run build

# Stage 2: Build the server
FROM golang:1.23-alpine AS server-builder

# Install build dependencies
RUN apk add --no-cache gcc musl-dev git ca-certificates

# Set working directory for server build
WORKDIR /build/server

# Copy go.mod and go.sum first to leverage Docker cache
COPY server/go.* ./
RUN go mod download

# Copy the rest of the server source code
COPY server/ ./

# Build the server binary
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o tiny-ollama-chat ./cmd/server/main.go

# Stage 3: Create the runtime image
FROM alpine:latest

# Install runtime dependencies and ca-certificates for HTTPS connections
RUN apk --no-cache add ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy the binary from the server-builder stage
COPY --from=server-builder /build/server/tiny-ollama-chat .

# Copy static files from client build
COPY --from=client-builder /build/client/dist ./static

# Copy entrypoint script
COPY entrypoint.sh .

# Make script executable
RUN chmod +x entrypoint.sh

# Create data directory
RUN mkdir -p data

# Environment variables with defaults
ENV PORT=8080 \
    OLLAMA_URL="http://host.docker.internal:11434" \
    DB_PATH="/app/data/chat.db"

# Expose the port (using the environment variable)
EXPOSE ${PORT}

# Create volume for persistent data
VOLUME ["/app/data"]

# Use the script as the entrypoint
ENTRYPOINT ["./entrypoint.sh"]
