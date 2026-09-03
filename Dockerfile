# ALBA Finance v3 - Dockerfile
# For Hostinger deployment with standalone output

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

# Copy only the built artefacts
COPY --from=builder /app/.next/standalone/ ./
COPY --from=builder /app/.next/static/ ./.next/static/
COPY --from=builder /app/public/ ./public/
COPY --from=builder /app/prisma/ ./prisma/
COPY --from=builder /app/server.js ./

# Copy package files to install production deps (including raw-loader)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
# Install only production dependencies
RUN npm ci --production

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
