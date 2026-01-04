# Build stage - build frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root package files
COPY package.json pnpm-lock.yaml ./

# Copy client package files
COPY client/package.json ./client/
COPY client/pnpm-lock.yaml ./client/

# Install all dependencies (including devDependencies for build)
RUN pnpm install

# Copy source code
COPY . .

# Build the client (Vite)
RUN pnpm client-build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (tsx is in devDependencies but needed to run)
RUN pnpm install

# Copy server source code (will run with tsx)
COPY server ./server
COPY shared ./shared
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# Copy built client from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application using tsx
CMD ["npx", "tsx", "server/_core/index.ts"]
