# ALBA Finance v3 - Production Docker image

FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev) needed for build
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app (standalone output)
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# The standalone output already contains the production dependency tree.
COPY --from=builder /app/.next/standalone/ ./
COPY --from=builder /app/.next/static/ ./.next/static/
COPY --from=builder /app/public/ ./public/
COPY --from=builder /app/prisma/ ./prisma/
COPY --from=builder /app/server.js ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
