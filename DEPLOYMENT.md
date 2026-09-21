# DEPLOYMENT — KINARA Sovereign Platform

> Running KINARA locally (Docker) or in production (Vercel + Neon/Supabase) + migration, health & CI.

---

## 1. Overview

| Mode | Stack | DB | Command |
|------|-------|----|---------|
| **Local** | `node:22-alpine` + `postgres:16-alpine` via `docker-compose.yml` | Local `kinara_db` Docker volume | `docker compose up --build -d` |
| **Production** | **Vercel** (Next.js hosting) | **Neon** or **Supabase** (Vercel Postgres also supported) | `git push` → Vercel auto-build |
| **Self-host** | Any VPS with Docker Compose | Compose `db` service or external `DATABASE_URL` | same `docker compose` + Caddy/Nginx |

Build artifact is `next build` (Turbopack disabled for compatibility); images use multi-stage `Dockerfile` with `pnpm` + healthcheck at `GET /api/health`.

---

## 2. Prereqs

- **Node 22** (see `.nvmrc`) — `nvm use` or `pnpm env use --global 22`
- **pnpm 9+**
- **Postgres 16** (Docker or hosted)
- Optional: `OPENROUTER_API_KEY` or `OPENAI_API_KEY` (AI), `UPSTASH_*` (distributed rate-limit), `SENTRY_DSN`

---

## 3. Local — `Docker` (recommended)

### 3.1 `docker-compose.yml`

```yaml
# Simplified (see the real file for full comments + optional redis)
services:
  db:
    image: postgres:16-alpine
    container_name: kinara_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: kinara_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d kinara_db"]
      interval: 5s
      retries: 10

  app:
    build: { context: ., dockerfile: Dockerfile }
    container_name: kinara_app
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/kinara_db
      NEXTAUTH_SECRET: change-me-in-production-generate-32chars-min
      NEXTAUTH_URL: http://localhost:3000
      SEED_SECRET: kinara-seed-local-only
      # optional: OPENROUTER_API_KEY, AI_MODEL, UPSTASH_*, SENTRY_DSN
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/api/health | grep -q '\"ok\":true' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 45s      # Next build + cold start

volumes: { pgdata: {} }
```

Optional `redis` service is commented out — enable if you switch to Upstash/Redis rate limiting.

### 3.2 `Dockerfile` (multi-stage, `node:22-alpine`)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps       # pnpm install (cached)
  RUN corepack enable
  COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
  RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder    # build
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN pnpm build                  # next build
  # Optional prune for runner:
  # RUN pnpm prune --prod

FROM node:22-alpine AS runner     # runtime
  ENV NODE_ENV=production PORT=3000
  WORKDIR /app
  COPY --from=builder /app/public ./public
  COPY --from=builder /app/.next  ./.next
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/package.json ./package.json
  COPY --from=builder /app/drizzle ./drizzle
  EXPOSE 3000
  CMD ["pnpm","start"]            # or node_modules/.bin/next start
```

Notes:

- Base `node:22-alpine` matches `.nvmrc`.
- `next.config.ts` currently has **no** `output: "standalone"` — so we copy full `.next` + `node_modules`. If you enable `output: "standalone"` (see comment in Dockerfile), switch to `COPY --from=builder /app/.next/standalone ./` + `COPY --from=builder /app/.next/static ./.next/static` for a slimmer image.
- `pnpm` via `corepack enable`.
- `.dockerignore` excludes `node_modules`, `.next`, `.git`, `drizzle` local, etc.
- Security headers enforced in `next.config.ts:headers()` even inside Docker.

### 3.3 Commands

```bash
# Full stack (db + app)
docker compose up --build -d
docker compose logs -f app      # Next logs + pino
docker compose logs -f db

# Migrate (inside container or locally with DATABASE_URL pointing at db)
docker compose exec app pnpm db:migrate
# or locally, ensure DATABASE_URL is postgresql://postgres:postgres@127.0.0.1:5432/kinara_db
pnpm db:migrate
pnpm db:push                    # dev shortcut — drizzle-kit push

# Seed
curl -X POST http://localhost:3000/api/seed \
  -H "x-seed-secret: kinara-seed-local-only"   # if SEED_SECRET set
# or (GET deprecated, no secret)
curl http://localhost:3000/api/seed

# Health
curl http://localhost:3000/api/health | jq

# Tear down (keep volume)
docker compose down
# Nuke volume (DESTROYS DATA)
docker compose down -v
```

### 3.4 Healthcheck tuning

- `db` healthcheck: `pg_isready -U postgres -d kinara_db` — 5s interval.
- `app` healthcheck: `wget` (busybox) hits `/api/health` and greps `"ok":true`. `start_period 45s` allows Next cold start. On failure `docker ps` shows `unhealthy`; `docker inspect kinara_app --format='{{json .State.Health}}'`.

If `wget` is missing, replace with `node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1))"` (Node is already present).

---

## 4. Production — Vercel

### 4.1 Import & env

1. Push repo to GitHub → Vercel → **Add New Project** → import `premium-african-social-platform`.
2. Framework preset: **Next.js** (detected via `next.config.ts` + `package.json: build = "next build"`).
3. Set **Environment Variables** (Project → Settings → Environment Variables):

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `DATABASE_URL` | `postgresql://user:pass@ep-xyz.pooler.neon.tech/kinara_db?sslmode=require` | Neon pooled hostname (`-pooler`) recommended; Supabase `...supabase.co` also OK. Keep `?sslmode=require`. |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` output | 32+ chars, never commit |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` | Canonical URL (sets OpenRouter `HTTP-Referer`) |
   | `OPENROUTER_API_KEY` | `sk-or-v1-...` | Optional — enables real LLM instead of stubs |
   | `OPENAI_API_KEY` | `sk-proj-...` | Alternative if not using OpenRouter |
   | `AI_MODEL` | `openai/gpt-4o-mini` or `meta-llama/llama-3.1-8b:free` | Free tier model. Default is mini |
   | `SEED_SECRET` | random 16+ chars | Protects `POST /api/seed` |
   | `UPSTASH_REDIS_REST_URL/TOKEN` | Upstash URLs | Optional — distributed limiter |
   | `SENTRY_DSN` | `https://...` | Optional |
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | `pk....` | Optional — prettier OSM tiles |

4. Deploy → Vercel runs `pnpm install && pnpm build`.

### 4.2 Database provisioning

**Neon** (recommended):

- Create project → copy pooled connection string (ends with `-pooler.neon.tech`) → paste as `DATABASE_URL` in Vercel.
- Ensure `sslmode=require` is present.
- `drizzle.config.ts:8` uses `process.env.DATABASE_URL`; no extra config.
- `src/db/index.ts:18` auto-enables `ssl: { rejectUnauthorized:false }` when `NODE_ENV===production`.

**Supabase**:

- Project → Settings → Database → Connection string → URI → `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` + `?sslmode=require` variant if needed.
- Same env swap.

**Vercel Postgres** (legacy / `Vercel Storage`):

- Vercel Dashboard → Storage → Create Postgres → connect to project (auto-sets `POSTGRES_URL` etc). Either map `POSTGRES_URL` → `DATABASE_URL` or change `drizzle.config.ts` to read both.

### 4.3 Drizzle migrate (production)

Migrations live in `drizzle/0000_closed_jackal.sql` + `drizzle/meta/*.json`. Two options:

**Option A — locally against prod** (one-time, before first deploy succeeds):

```bash
DATABASE_URL="postgresql://.../kinara_db?sslmode=require" pnpm db:migrate
# or dev push (faster but not versioned)
DATABASE_URL="..." pnpm drizzle-kit push
```

**Option B — build hook (future enhancement)** — add to `package.json` if you want every deploy to migrate:

```json
{ "scripts": { "vercel-build": "drizzle-kit migrate && next build" } }
```

Then set Vercel **Build Command** to `pnpm vercel-build`. Be mindful of concurrent deploys → advisory lock consideration (see `ARCHITECTURE.md`).

**Verify**: `DATABASE_URL=... DATABASE_URL=... psql -c "\dt"` should show `users, posts, …`.

### 4.4 Seed production

After migration:

```bash
curl -X POST https://your-app.vercel.app/api/seed \
  -H "x-seed-secret: $SEED_SECRET" | jq

# without SEED_SECRET (if not set in Vercel env):
curl https://your-app.vercel.app/api/seed | jq
```

Rate limit: `seed:{ip} 3/min`. Subsequent deploys don't need re-seed (idempotent).

### 4.5 Verify

```bash
curl https://your-app.vercel.app/api/health | jq
# Expect: { "ok": true, "version":"3.4.0", "seeded": true, "latencyMs": <20 }

# Smoke few endpoints:
curl "https://your-app.vercel.app/api/posts?limit=2" | jq
curl "https://your-app.vercel.app/api/search?q=kinara&type=all" | jq
```

### 4.6 Health wiring

- Vercel has native uptime via its analytics; add a cron (Vercel Crons or UptimeRobot) hitting `GET /api/health` every minute.
- `src/app/api/health/route.ts:7` reports `pool: {totalCount,idleCount,waitingCount,max}` — useful for log drains.

---

## 5. DB — Detailed

### 5.1 `drizzle.config.ts`

```ts
defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/kinara_db" },
  verbose: true, strict: true,
})
```

### 5.2 Generate & migrate

```bash
pnpm db:generate    # drizzle-kit generate — emits drizzle/<timestamp>.sql + meta journal
pnpm db:migrate     # drizzle-kit migrate — applies against DATABASE_URL
pnpm db:push        # drizzle-kit push — direct schema push (dev, no history) — fast iteration
pnpm db:studio      # drizzle-kit studio — visual explorer (opens http://local.drizzle.studio)
```

**Workflow when editing `src/db/schema.ts`**: edit → `pnpm db:generate` → review `drizzle/*.sql` → commit both `src/db/schema.ts` + `drizzle/*.sql` + `drizzle/meta` → run `pnpm db:migrate` locally or against prod via `DATABASE_URL` prefix.

### 5.3 Data persist & backup

- Compose volume `pgdata` is durable across `docker compose down` (without `-v`). Back up via:
  ```bash
  docker compose exec db pg_dump -U postgres kinara_db | gzip > backup-$(date +%F).sql.gz
  # restore:
  cat backup-*.sql.gz | gunzip | docker compose exec -T db psql -U postgres kinara_db
  ```
- For hosted (Neon/Supabase), use provider backups / PITR.

---

## 6. CI

### 6.1 `.github/workflows/ci.yml`

```yaml
name: CI
on: { push: { branches: [main, master] }, pull_request: { branches: [main, master] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - name: Health check (after build)
        run: |
          pnpm start &
          for i in {1..30}; do
            curl -fsS http://127.0.0.1:3000/api/health | grep -q '"ok":true' && break
            sleep 2
          done
          curl -fsS http://127.0.0.1:3000/api/health | tee /tmp/health.json
          cat /tmp/health.json
          kill %1 || true   # (CI builds may skip if DATABASE_URL absent — then health is expected to fail 500)
```

Actual file includes concurrency cancel, DB env var handling, artifact upload on failure. See deployed `.github/workflows/ci.yml` for full.

**Overrides for more strict CI** (future):

- Add `docker compose up -d db` before `pnpm build` if you want `build` to have a real DB.
- Or inject Neon preview `DATABASE_URL` via GitHub encrypted secret.

---

## 7. Self-host (VPS) Checklist

1. Provision Ubuntu 22.04 LTS + `docker` + `docker compose`.
2. Clone → `cp .env.example .env.local` → set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your domain), optional AI keys, `SENTRY_DSN`.
3. `docker compose up --build -d`.
4. `docker compose exec app pnpm db:migrate` (or locally with `DATABASE_URL` pointing at the host).
5. `curl -X POST http://localhost:3000/api/seed -H "x-seed-secret: $SEED_SECRET"`.
6. Front with `Caddy` / `nginx` for TLS reverse-proxy `→ localhost:3000` + set proper `X-Forwarded-For` so rate-limit IP is correct.
7. `HEALTHCHECK` in `Dockerfile` self-monitors; add systemd service or watchtower for restarts.

---

## 8. Rollback & Secrets Rotation

- **Rollback**: `git revert <commit>` → push → Vercel rebuild; DB is forward-only — keep `drizzle` migrations reversible via `DOWN` section if you add custom SQL. For breaking seed changes, bump `seed.ts` guard.
- **Secrets**: rotate `NEXTAUTH_SECRET` requires all JWT sessions to re-authenticate (users signed out). Rotate `DATABASE_URL` / API keys by updating Vercel env vars + redeploy (no code change). See `SECURITY.md` for leaked token rotation.

---

*See `SECURITY.md` for auth, headers, token rotation. `ARCHITECTURE.md:10` for scaling to Redis/replicas.*

