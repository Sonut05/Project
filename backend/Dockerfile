# Multi-stage production Dockerfile for RentIt Backend API

# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies needed for Prisma generate)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Prune development dependencies for lean production image
RUN npm prune --production

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat curl

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -G nodejs rentit

# Copy production dependencies and generated Prisma client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
COPY src ./src

# Create uploads directory and set permissions for non-root user
RUN mkdir -p uploads && chown -R rentit:nodejs /app

USER rentit

EXPOSE 5000

# Health check compatible with GET /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-5000}/health || exit 1

CMD ["node", "src/server.js"]
