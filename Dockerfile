# syntax=docker/dockerfile:1
# KINARA Sovereign Platform — multi-stage Dockerfile (Node 22, pnpm)
# Handles both default Next build (no standalone) and optional output:"standalone".
# See DEPLOYMENT.md §3.2 and next.config.ts

# ── Stage 1: deps ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
# Only package manifests for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# frozen lockfile; if lock absent (first clone) fallback to install
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile || pnpm install

# ── Stage 2: builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure Next telemetry disabled in build
ENV NEXT_TELEMETRY_DISABLED=1
# Build — uses DATABASE_URL placeholder if not present (skip DB access)
# drizzle/ is produced via `pnpm db:generate` before build ideally, but build itself does not need DB
RUN pnpm build

# ── Stage 3: runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user (Next.js best practice)
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Public assets (always)
COPY --from=builder /app/public ./public

# Next build output — default mode (no output: "standalone").
# If you enable `output: "standalone"` in next.config.ts, replace the block below with:
#   COPY --from=builder /app/.next/standalone ./
#   COPY --from=builder /app/.next/static ./.next/static
# and change CMD to ["node","server.js"].
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# drizzle migrations needed if app migrates at runtime
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Healthcheck tool (wget is in busybox; fallback to node fetch if missing)
RUN apk add --no-cache wget curl 2>/dev/null || true

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=45s \
  CMD wget -qO- http://127.0.0.1:3000/api/health | grep -q '"ok":true' || \
      node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.json()).then(j=>process.exit(j.ok?0:1)).catch(()=>process.exit(1))"

# pnpm start runs next start; when using standalone, node server.js would be smaller
CMD ["pnpm","start"]
# For standalone mode, replace CMD with:  CMD ["node","server.js"]
