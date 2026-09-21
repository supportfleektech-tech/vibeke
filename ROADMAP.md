# ROADMAP — KINARA Sovereign Platform

> What's next after v2 sovereign sweep (10 phases). Organized by horizon — immediate, near-term, long-term — with owner, effort, and dependency.

---

## Horizon 0 — Ship (This Week) — P0

| # | Item | Owner | Effort | Dependency | Done When |
|---|------|-------|--------|------------|-----------|
| 0.1 | **Deploy to Vercel + Neon** — set `DATABASE_URL` (pooled), `NEXTAUTH_SECRET`, `SEED_SECRET`, `NEXTAUTH_URL`, optional `OPENROUTER_API_KEY`, push → verify `GET /api/health` `ok:true` + `seeded:true` | DevOps | 2h | `DEPLOYMENT.md` | `curl https://kinara.vercel.app/api/health` 200 |
| 0.2 | **Domain + TLS** — `kinara.africa` or `kinara.ke` via Vercel domains or Cloudflare + Caddy self-host | DevOps | 1h | 0.1 | `https://kinara.africa` green lock |
| 0.3 | **Sentry + Vercel Analytics** — add `SENTRY_DSN` env, `instrumentation.ts` already pino; add `@sentry/nextjs` + `@vercel/analytics` + `@vercel/speed-insights` | Frontend | 3h | — | Errors appear in Sentry, Web Vitals in Vercel |
| 0.4 | **E2E Smoke** — Playwright `tests/e2e/smoke.spec.ts` : persona switch, Cmd+K, low-bandwidth, escrow, booking, like toggle, search | QA | 4h | — | `pnpm test:e2e` 5 specs pass in CI |
| 0.5 | **Seed prod + backup cron** — `pg_dump` cron + Neon PITR enabled, `docker compose exec db pg_dump` documented | DevOps | 1h | 0.1 | Daily backup in `backups/` |

---

## Horizon 1 — Harden (Month 1) — P1

| # | Item | Why | Effort |
|---|------|-----|--------|
| 1.1 | **Real Auth (bcrypt + email)** — replace `authorize()` hardcoded `usr_brian_mwangi` with `db.select(users).where(eq(handle))` + `bcrypt.compare`, add `users.passwordHash`, magic-link + OAuth (Google/Apple) via Auth.js | Trust + multi-user | 2d |
| 1.2 | **Payments live** — M-Pesa Daraja STK push + NIBSS (Nigeria) + MoMo Rwanda; `escrow_transactions.paymentRail` → real Daraja `initiated→pending→completed`, webhook `POST /api/webhooks/mpesa` verifies signature, releases escrow on delivery confirmation | Revenue | 1w |
| 1.3 | **Uploads** — Vercel Blob / S3 + `POST /api/upload` (presigned), `next/image` loader, Sharp compression pipeline, replace Pexels URLs with user uploads | Creator economy | 3d |
| 1.4 | **Realtime** — `socket.io` or Pusher for `MessagingView` + `CommunityView` voice pulses + `threads.lastMessageAt` pub/sub; replace SWR polling 60s | UX | 1w |
| 1.5 | **Search v2** — `pg_trgm` GIN + `tsvector` for `posts.content` + `marketplace.title`, `threads` FTS, `type` facets, recent searches history | Discovery | 4d |
| 1.6 | **Offline PWA** — `next-pwa` + Workbox, cache `GET /api/posts` + images, `navigator.onLine` banner, background sync for `POST /api/posts` when offline | Kenya networks | 1w |
| 1.7 | **Admin Console** — `/admin` (moderation queue, reports, community bans, escrow disputes, analytics `monthlyTransactions` charts via Recharts) | Ops | 1w |
| 1.8 | **Observability v2** — OpenTelemetry traces + Grafana dashboards for `latencyMs`, `pool`, `rateLimit`, `ai` token usage | Scale | 3d |

---

## Horizon 2 — Grow (Quarter) — P2

| # | Item | Why |
|---|------|-----|
| 2.1 | **Mobile App** — React Native (Expo) + `react-native-maps` (Leaflet equivalent), share `src/types` + `src/lib/validators` via monorepo `apps/mobile` | Pan-African mobile-first (continent is mobile) |
| 2.2 | **Creator Monetization** — subscriptions, tipping (M-Pesa), `marketplaceRating` → payout via escrow, `users.marketplaceRating` ledger | Economy |
| 2.3 | **Video** — Cloudflare Stream / Mux for `KINARA Cinema` real video (now static thumbs), `mediaType:video` pipeline, HLS |
| 2.4 | **i18n** — Swahili / Yoruba / Amharic / Zulu / French first-class (already `translate` action), UI strings via `next-intl` + `Geist` supports Ge'ez/Adlam/Tifinagh via `Noto` fallback | Inclusion |
| 2.5 | **Feed Algorithm** — `posts.pinned` + `trustScore` + `city` + `engagement` ranking, not just `createdAt desc`; A/B via Vercel edge config |
| 2.6 | **Compliance** — Kenya DPA + GDPR, data residency, `users` consent, `SECURITY.md` DPA annex, audit logs (`audit_logs` table) |

---

## How to Choose What's Next

Ask:

1. **Is it deployed?** If not, do **0.1–0.2** first — everything else needs a URL.
2. **Does trust pay?** If yes, **1.2 payments** before **1.3 uploads**.
3. **Is it mobile?** If audience is 90% mobile, prioritize **2.1** early (Expo can reuse `src/components/ui`).

**Recommended order for zero-budget solo builder:** `0.1 → 0.3 → 0.4 → 1.1 → 1.4 → 1.2 → 2.1`.

---

## Tracking

- **Board:** GitHub Projects `Kinara Roadmap` — columns `Backlog → Next → Doing → Review → Done`
- **Versioning:** `CHANGELOG.md` — `v2.0.0` today (10-phase sweep), next `v2.1.0` after 0.x horizon, `v3.0.0` after mobile.

---

*Last updated: 2026-09-21 — v2.0.0 sovereign sweep completed. Next: `0.1 Deploy`.*
