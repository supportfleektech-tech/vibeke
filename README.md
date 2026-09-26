# KINARA Sovereign Platform — The First Premium African-Designed Digital Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19.2-0a7ea4?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Postgres-16-336791?style=for-the-badge&logo=postgresql" alt="Postgres 16" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F277?style=for-the-badge" alt="Drizzle" />
  <img src="https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TS" />
  <img src="https://img.shields.io/badge/Auth.js-5.x-000?style=flat-square" alt="Auth.js" />
  <img src="https://img.shields.io/badge/Motion-13.x-FF0055?style=flat-square" alt="Motion" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square" alt="Leaflet" />
  <img src="https://img.shields.io/badge/license-MIT-emerald?style=flat-square" alt="MIT" />
  <img src="https://img.shields.io/github/actions/workflow/status/kinara/ci.yml?branch=main&label=CI" alt="CI" />
</p>

> **Don't aim to be "the next Instagram." Aim to be the first premium African-designed digital platform.**

KINARA weaves **Apple's polish**, **Linear's speed**, **Notion's organization**, **Spotify's personalization**, **Discord's communities**, **Google Maps' local discovery**, **Figma's clean interface** — plus **TikTok's Clips**, **Instagram's Stories**, **YouTube Live**, **X's Explore**, and **LinkedIn's Jobs** — into a single **ALL-IN-ONE sovereign operating system** for Africa's 1.4B people — built mobile-first, offline-aware, and trust-native.

> **v3.0.0 ALL-IN-ONE:** `🎞️ Clips` vertical TikTok feed + `🟢 Stories` 24h + `🔴 Live Stages` + `🧭 Explore` masonry + `🔔 Notifications` + `🔖 Bookmarks` + `📅 Events` — all free, no vendor lock-in.

---

## Table of Contents

- [Vision](#vision--design-philosophy)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quickstart](#quickstart)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [API](#api)
- [Design Tokens](#design-tokens)
- [Adaptive Persona UI](#adaptive-persona-ui)
- [Performance — Built for Kenya](#performance--built-for-kenya)
- [Deployment](#deployment)
- [Testing, Linting & Type Checking](#testing-linting--type-checking)
- [Related Docs](#related-docs)
- [Contributing](#contributing)
- [License](#license)

---

## Vision / Design Philosophy

Today every social platform looks identical: white background, bottom nav, endless feed, flat cards, generic icons. KINARA breaks the pattern.

**Guiding principles (from `follow-up-vibeke.md`):**

| Principle | Detail |
|-----------|--------|
| **Depth with restraint** | Soft shadows, rounded corners **16–20px**, large expressive imagery, gentle gradients, glass where it aids clarity |
| **Premium without noise** | Not overloaded; purposeful motion, instant feel |
| **Colors with meaning** | Deep Emerald (growth/trust), Warm Gold (achievement), Deep Indigo (night contrast), Slate Gray (clean neutral) |
| **Typography** | Geist / Inter / Manrope — large bold titles, medium headings, comfortable body, generous spacing |
| **Motion that communicates** | Cards lift on tap, lists animate naturally, messages slide in, likes have subtle haptic feedback — **60 FPS** target, `prefers-reduced-motion` respected |
| **AI Everywhere** | Not a separate screen — inline rewrite / summarize / translate / continue / emojis / professional / sheng / pitch woven into every composer |
| **Trust over virality** | Biometric + escrow verification, trust scores, ratings, distance + delivery transparency |

Dark mode is **first-class**, not an afterthought. Accessibility (screen readers, high contrast, keyboard nav, resizable text, reduced motion, offline-friendly) is table stakes.

---

## Features

### 1. Dynamic Home — Modular Dashboard

Instead of one static feed, the home is an 8-module dashboard the user can rearrange and toggle via `ModuleCustomizerModal` (dnd-kit):

```
👋 Greeting & Persona Status — "Good evening, Brian" + trust / verification badge
🔥 Trending Pulses — Pinned + filtered posts (category/city) with SWR pagination (nextCursor)
📍 Local Radar — Leaflet map + list: friends, businesses, events, deals, listings
👥 Communities — Live audio lounges (voice pulse animation), member counts
💼 Jobs — Pan-African opportunities, salary bands, tags, apply CTA
🛒 Marketplace — Curated escrow listings, AI price check, distance/delivery
🎬 KINARA Cinema — Spotlight media, large imagery
💬 Messages — Pinned/unread/community/business/marketplace/archive preview
```

Persisted to `localStorage` (`kinara:sectionsConfig`) and hydrates on mount.

### 2. AI Everywhere — `POST /api/ai`

Ten sovereign actions, each with a crafted system prompt + fallback stub (so zero budget = graceful):

| Action | Behavior |
|--------|----------|
| `rewrite` | Vivid African-centered rewrite |
| `summarize` | 3-bullet: Thesis / Impact / Action |
| `translate` | Swahili, Yoruba, Amharic, Zulu, French + targetLanguage |
| `sheng` | Nairobi Sheng with emoji |
| `professional` | Institutional B2B tone |
| `pitch` | 1.4B-market founder pitch |
| `continue` | Offline-first + M-Pesa rails |
| `emojis` | Tasteful emoji injection |
| `price_check` | Returns `{ verdict, marketAverage, confidenceScore, riskFactor, summary, advice }` — JSON with Zod + Azure/OSS fallback; mocked against 1,200 Nairobi sales if no key |
| `copilot` | Sovereign assistant (Silicon Savannah, M-Pesa, pan-African trade) |

Provider resolution: `OPENROUTER_API_KEY` → OpenRouter (`openai/gpt-4o-mini` etc, `meta-llama/llama-3.1-8b:free` for free tier) → fallback `OPENAI_API_KEY` → local stub. See `src/app/api/ai/route.ts:49` and `src/lib/env.ts:64`.

Inline UI: `KinaraAICopilot` + composer buttons (`✨ Rewrite / Summarize / Translate / Continue / Add emojis / Professional / Funny / Sheng / Pitch`).

### 3. Marketplace + Escrow — `POST /api/marketplace/[id]/offer`

High-end shopping semantics: large photos, ★ ratings, verified seller, distanceKm, deliverySpeed, `aiPriceEstimate`. **Escrow is the trust primitive**: `escrow_transactions` (`held → delivered → released | disputed | cancelled`) created transactionally with a buyer message (`type: "offer"`). Payment rails: `mpesa | momo | card | bank`. Funds held in "Kinara Smart Vault" until inspection. See `src/app/api/marketplace/[id]/offer/route.ts:64`.

### 4. Business Storefronts — `POST /api/businesses/[id]/book`

Hybrid website + storefront: hero banner, verified badge, catalogCount, monthlyTransactions, services `[{ name, price }]`, reviews, bio/headline, directions, `open_hours`. Booking creates `bookings` row with `BK-{UUID}` ref, `confirmed` status. `src/app/api/businesses/[id]/book/route.ts`.

### 5. Local Radar — Free Leaflet/OSM

No Mapbox key required. `LeafletMapCore` + `LocalRadarMap`: friends (opt-in), events, businesses, deals, listings, services with `lat/lng` (`numeric 10,7`), `distanceKm`, neighborhood. Tiles are OSM by default, optional `NEXT_PUBLIC_MAPBOX_TOKEN` for prettier tiles. Performance: code-split with `dynamic(..., {ssr:false})` in `src/app/page.tsx:47`.

### 6. Communities as Mini-Platforms

Each community is a workspace: Feed, Chat, Voice (live pulse + `activeVoice`, `voiceSpeakersCount`, `voiceRoomTopic`), Files, Events, Marketplace, Jobs, Wiki, Moderation, AI Assistant. Join/leave is idempotent + transactional via `community_members` unique index, with `membersCount` atomic increment (`GREATEST(...-1,0)`). `src/app/api/communities/[slug]/route.ts:113`.

### 7. Trust-Native Identity

`users` carries `trustScore`, `verified`, `verificationType` ("Biometric & Escrow Certified"), `marketplaceRating` (`numeric 3,2`), `skills[]`, `achievements[]`. Profiles expose cover, avatar, bio, followers/following, portfolio, courses, businesses, communities. `ProfileView` + `PostCard` show trust badges.

### 8. Universal Search — `GET /api/search`

Single search bar reaches everything: `q` (1–100 chars) + `type ∈ all|communities|products|businesses|jobs|people|posts`. Parallel ILIKE queries (10/type when `all`, 20 when narrowed), each isolated try/catch so partial failure still returns. Rate limit 30/min. `src/app/api/search/route.ts`.

### 9. Productivity Messaging

Threads (`direct | community | business | marketplace`) with `threadId`, `participants jsonb`, `lastMessageAt`. Message types: `text | voice (waveform metadata) | offer | poll`, with `isMe`, file/scheduling/poll support in UI. `MessagingView` is dynamically imported.

### 10. Jobs

Categorized listings (Tech/Design/Ops etc) with location (supports `"Nairobi (Kilimani) / Remote Pan-Africa"` via `ilike`), salary bands, tags jsonb. Apply creates `job_applications` with unique `(jobId, applicantId)` constraint and race-safe 409 handling.

### 11. ALL-IN-ONE — TikTok Clips + Stories + Live + Explore + Notifications

| Feature | What it replicates | Kinara twist |
|---------|-------------------|--------------|
| **🎞️ Clips** | TikTok vertical feed, Reels, Shorts | `ClipsView` `snap-y` + `IntersectionObserver` autoplay muted loop, double-tap heart burst `motion`, right rail like/comment/share/bookmark/sound disc, bottom `avatar+Follow+title+hashtags+sound marquee`, tabs `For You` (trending `likes*2+views`) vs `Following`, hashtag filter, `POST /api/clips/[id]/like` tx + `POST /api/bookmarks` — 5 seeded clips `BigBuckBunny` etc |
| **🟢 Stories** | Instagram/Snapchat 24h | `StoriesBar` horizontal `emerald` vs `slate` rings, `StoryViewer` `fixed inset-0` `role=dialog` progress `motion` 5s/story `setInterval 50ms`, tap halves/swipe `50px`/`Arrow`/`Escape`, hold pause, `POST /api/stories/[id]/view` after 2s — 4 seeded stories 22h/18h/10h/8h expiry |
| **🔴 Live** | YouTube Live, Clubhouse Stages | `LiveView` grid pulsing `LIVE` badge, Go Live modal `POST /api/lives` + Join `POST /api/lives/[id]/join` viewers++ + chat + gifts `AnimatePresence`, End `POST /api/lives/[id]/end` — 3 seeded lives 342/892/210 viewers |
| **🧭 Explore** | X Explore, Instagram Explore | `ExploreView` masonry `columns-1 sm:2 lg:3` clips/posts/people + `#Tag` pills `GET /api/hashtags/trending` 6 tags `KinaraClips 9800` etc, tabs All/Clips/Posts/People/Tags, `For You` shuffles `trendingScore` |
| **🔔 Notifications** | All platforms activity | `NotificationsView` SWR `15s` polling `GET /api/notifications?limit=20` `unreadCount` badge, Mark all `POST /api/notifications/read {ids:"all"}`, tabs All/Unread/Mentions — 3 seeded `like/live/comment` |
| **🔖 Bookmarks** | Saves, Collections | `BookmarksView` tabs All/Post/Clip/Marketplace/Job `grid/list` + toggle `POST /api/bookmarks {entityType,entityId}` + `GREATEST` |
| **📅 Events** | Facebook Events, Meetup | `EventsView` `GET /api/events` grid banner+date+price `FREE`/`KES`, RSVP `POST /api/events/[id]/rsvp {action:"join"|"leave"}` capacity bar — 2 seeded `Demo Night 180/250` `Sound Lab 89/120` |

All 7 integrate into `DynamicHome` stories+clips peek + `Sidebar` 7 new nav `Clips/Live/Explore/Stories/Events/Notifications/Bookmarks` + persona 12-section configs (creator shows clips/stories/live/explore).

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | **Next.js 16.2** (App Router, RSC, `next/font`) | SSR + streaming (`loading.tsx`), route handlers, image optimization (AVIF/WebP) |
| **UI** | **React 19.2**, Tailwind CSS 4.1, `motion` 13, `lucide-react`, `sonner`, `@dnd-kit` | Premium motion + DnD dashboard; `@tailwindcss/postcss` |
| **State/Data** | **SWR 2.5** + `fetcher` | 8 parallel endpoints in `page.tsx`, `dedupingInterval: 60000`, optimistic local sync |
| **Auth** | **Auth.js 5 (next-auth beta 32)** — Credentials + JWT | Real credential check: bcrypt hash lookup per handle, no bypass identity; JWT callbacks with `trustScore` |
| **DB** | **Postgres 16**, **Drizzle ORM 0.45** + `drizzle-kit` 0.31, `pg` 8.20 (pool max 10) | Typed queries, indexed filters, `pool` singleton, health `SELECT 1` latency |
| **Validation** | **Zod 4.6** | Every API boundary (`zod` schemas in `src/lib/validators.ts`) |
| **Maps** | **Leaflet 1.9 + react-leaflet 5** | Free OSM tiles, no vendor lock-in; Mapbox optional |
| **AI** | **AI SDK `ai` 7 + `openai` 7** via OpenRouter | OpenRouter preferred (OpenAI + OSS), graceful stub fallback |
| **Testing** | Vitest 5 + jsdom + @testing-library/react | `vitest.config.ts` path alias `@` → `src` |
| **Observability** | `pino` + `instrumentation.ts` | Sovereign core logger |
| **Deploy** | Vercel (hosting) · Docker (self-host) | `docker-compose.yml` (postgres + app) |

See `package.json:4` for scripts and `drizzle.config.ts`.

---

## Quickstart

### Prereqs

- **Node 22** (see `.nvmrc`) — `nvm use` or `pnpm env use --global 22`
- **pnpm 9+** — `corepack enable && corepack prepare pnpm@latest --activate`
- **Postgres 16** — local via Docker or Neon/Supabase/Vercel Postgres
- Optional: OpenRouter key for real AI (else stubs)

### 1. Clone & Install

```bash
git clone <your-fork-url> premium-african-social-platform
cd premium-african-social-platform
pnpm install
```

### 2. Configure Env

```bash
cp .env.example .env.local
# Edit .env.local — at minimum set DATABASE_URL + NEXTAUTH_SECRET
# Generate secret:
openssl rand -base64 32
```

### 3. Database — Docker (recommended local)

```bash
# Starts postgres:16-alpine (kinara_db) on 5432
docker compose up -d db
# or full stack (db + app)
docker compose up -d
# logs
docker compose logs -f db
```

Alternatively use hosted Postgres (Neon/Supabase):
```bash
# Set DATABASE_URL to neon/supabase connection string in .env.local
# e.g. postgresql://user:pass@ep-xyz.neon.tech/kinara_db?sslmode=require
```

### 4. Migrate & Seed

```bash
# Generate SQL from src/db/schema.ts -> drizzle/
pnpm drizzle-kit generate
# Apply migrations (or push for dev)
pnpm db:migrate        # or: pnpm db:push (drizzle-kit push — dev only)
# Seed is auto on first read (any GET that finds 0 rows calls seedDatabase()),
# but you can also seed explicitly:
curl -X POST http://localhost:3000/api/seed \
  -H "x-seed-secret: kinara-seed-local-only"
```

`SEED_SECRET` is **required**: with it unset the endpoint answers `503`, and a wrong
or missing `x-seed-secret` always answers `401` — there is no unauthenticated path,
including `GET /api/seed`.

### 5. Run

```bash
pnpm dev      # http://localhost:3000  — Sovereign Core online
pnpm build && pnpm start  # production preview
```

Open `http://localhost:3000`. The health endpoint `GET /api/health` should return `{ ok: true, version: "3.4.0", latencyMs: <n>, seeded: true }`.

### One-Liner (fresh clone → running)

```bash
pnpm i && cp .env.example .env.local && docker compose up -d db && sleep 3 && pnpm db:push && pnpm dev
```

---

## Environment Variables

All variables validated in `src/lib/env.ts:4` (Zod). Missing keys degrade gracefully (stubs / in-memory) rather than crashing.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | `postgresql://postgres:postgres@127.0.0.1:5432/kinara_db` | Postgres connection string (Neon/Supabase/Vercel Postgres or local) |
| `NEXTAUTH_SECRET` | ✅ (prod) | — (random per process in dev) | JWT signing. Prod refuses to boot without a ≥32-char value outside the known-placeholder denylist — `openssl rand -base64 48` |
| `NEXTAUTH_URL` | Recommended | `http://localhost:3000` | Canonical URL (also sets OpenRouter `HTTP-Referer`) |
| `OPENROUTER_API_KEY` | Optional | — | OpenRouter key (preferred AI provider) — https://openrouter.ai/keys |
| `OPENAI_API_KEY` | Optional | — | OpenAI direct fallback (if no OpenRouter key) |
| `AI_MODEL` | Optional | `openai/gpt-4o-mini` | Model ID (free tier: `meta-llama/llama-3.1-8b:free`) |
| `SEED_SECRET` | ✅ | — | Protects `POST /api/seed` (`x-seed-secret` header). Unset → seed endpoint returns 503 |
| `SEED_PASSWORD` | ✅ (to seed logins) | — | Password hashed (bcrypt) into every seeded account. Unset → seeded rows have no hash and cannot log in |
| `UPSTASH_REDIS_REST_URL` | Optional | — | Upstash Redis REST URL (if set, can Back in-memory limiter) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | — | Upstash token |
| `SENTRY_DSN` | Optional | — | Sentry DSN |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Optional | — | Mapbox token for nicer Leaflet tiles (OSM is free default) |
| `NODE_ENV` | Auto | `development` | `development | production | test` |

> **.env file policy**: `.env` and `.env.local` are gitignored. Commit only `.env.example` (which you should extend if you add a variable).

---

## Project Structure

```
premium-african-social-platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout — Geist font, Header/Sidebar shell
│   │   ├── page.tsx                   # "use client" — KinaraApp: 8× SWR, persona adaptive, Cmd+K, customizer, view router
│   │   ├── loading.tsx / error.tsx    # Streaming boundaries
│   │   ├── globals.css                # Tokens, glass, kinara-card, reduced-motion, leaflet overrides
│   │   └── api/
│   │       ├── health/route.ts        # { ok, version, latencyMs, seeded, pool } + 500 on DB down
│   │       ├── seed/route.ts          # POST (x-seed-secret) + deprecated GET, 3/min, idempotent
│   │       ├── ai/route.ts            # 10 actions + OpenRouter/OpenAI + stub fallback
│   │       ├── search/route.ts        # Parallel ILIKE across 6 tables
│   │       ├── posts/route.ts         # GET ?category&city&limit&offset&cursor / POST (zod + denorm author)
│   │       ├── posts/[id]/like/route.ts      # GET list / POST toggle (transaction, race-safe)
│   │       ├── posts/[id]/comments/route.ts  # GET list / POST (transaction + commentsCount++)
│   │       ├── communities/route.ts + [slug]/route.ts  # list + join/leave transactional
│   │       ├── marketplace/route.ts + [id]/offer/route.ts # list/create + escrow transaction
│   │       ├── businesses/route.ts + [id]/book/route.ts  # list + booking
│   │       ├── messages/route.ts      # GET ?threadId&limit&offset / POST (thread upsert)
│   │       ├── jobs/route.ts + [id]/apply/route.ts      # list + apply (409 if duplicate)
│   │       ├── radar/route.ts         # GET ?type&city (index-aware)
│   │       ├── user/route.ts          # GET profile + PATCH bio/role/location
│   │       └── auth/[...nextauth]/route.ts   # Auth.js handlers
│   ├── components/
│   │   ├── dashboard/DynamicHome.tsx + ModuleCustomizerModal.tsx
│   │   ├── layout/Header.tsx + Sidebar.tsx + UniversalSearchModal.tsx
│   │   ├── feed/PostCard.tsx + PostComposer.tsx
│   │   ├── communities/CommunityView.tsx
│   │   ├── marketplace/MarketplaceView.tsx + EscrowModal.tsx + AIPriceCheckModal.tsx
│   │   ├── business/BusinessView.tsx + BookingModal.tsx
│   │   ├── messaging/MessagingView.tsx
│   │   ├── jobs/JobsView.tsx
│   │   ├── profile/ProfileView.tsx
│   │   ├── radar/LocalRadarMap.tsx + LeafletMapCore.tsx
│   │   ├── ai/KinaraAICopilot.tsx
│   │   └── ui/button.tsx card.tsx input.tsx dialog.tsx avatar.tsx badge.tsx tabs.tsx progress.tsx
│   ├── db/
│   │   ├── index.ts                   # pg Pool (max 10, SSL in prod) + drizzle + checkDbHealth
│   │   ├── schema.ts                  # 15 tables, 40+ indexes, jsonb, numeric, relations
│   │   └── seed.ts                    # Sovereign seed (users/posts/communities/items/businesses/messages/jobs/radar)
│   ├── lib/
│   │   ├── auth.ts                    # NextAuth Credentials + JWT (sovereign usr_brian_mwangi)
│   │   ├── env.ts                     # Zod envSchema + hasAiKey/getAiProvider
│   │   ├── ratelimit.ts               # In-memory LRU Map (5-min GC) + getClientIp (xff/x-real-ip)
│   │   ├── validators.ts              # Zod schemas for every API boundary
│   │   ├── tokens.ts                  # Design tokens (emerald/gold/indigo/slate, spacing, shadow)
│   │   ├── fetcher.ts                 # SWR fetcher + fetchJsonSafe
│   │   ├── get-user.ts                # auth() → userId with sovereign fallback
│   │   ├── cn.ts                      # clsx/tailwind-merge helper
│   │   └── logger.ts                  # pino
│   └── types/index.ts                 # UserProfile, PostItem, CommunityItem, etc + PersonaRole/DashboardSectionConfig
├── drizzle/                           # Generated SQL (0000_closed_jackal.sql) + meta
├── drizzle.config.ts                  # dialect:postgresql, schema:./src/db/schema.ts
├── vitest.config.ts / vitest.setup.ts  # jsdom + @ alias
├── next.config.ts                     # images remotePatterns, compress, optimizePackageImports, security headers
├── instrumentation.ts                  # pino on NEXT_RUNTIME === "nodejs"
├── postcss.config.mjs / tsconfig.json / eslint.config.mjs
├── Dockerfile                         # Multi-stage node:22-alpine (deps → builder → runner)
├── docker-compose.yml                 # postgres:16-alpine + app + optional redis + health checks
├── .dockerignore / .nvmrc (22) / .github/workflows/ci.yml
└── docs: README.md ARCHITECTURE.md DESIGN.md API.md DEPLOYMENT.md SECURITY.md CONTRIBUTING.md
```

---

## Architecture

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for full C4, ERD (15 tables + relations + indexes), API matrix (14+ routes), auth/AI/data flow diagrams, trade-off decisions, and scalability notes.

Quick data flow:

```
page.tsx (use client)
  ├─ 8× useSWR("/api/*", fetcher)  { revalidateOnFocus:false, dedupingInterval:60s }
  │     │
  │     └─► Next Route Handlers (validate Zod → rateLimit → getCurrentUserId → Drizzle tx)
  │                          │
  │                          └─► pg Pool (max 10) → Postgres 16 (40+ indexes, jsonb, numeric, FK)
  │                                  │
  │                                  └─► auto-seedDatabase() if table empty (idempotent)
  │
  └─► local optimistic state (useState) synced via useEffect, localStorage for persona/sections
```

Key decisions:
- **Leaflet/OSM**: free, no key, sovereign — Mapbox optional upgrade.
- **Auth.js Credentials + JWT**: `authorize()` already does the DB lookup — `bcrypt.compare` against `users.password_hash`, and a row with no hash cannot log in at all. There is no demo/admin identity that skips verification.
- **`jsonb` for skills/achievements/tags/services/participants/metadata**: flexible without extra join tables; indexed via GIN if needed later.
- **Async rate limiter**: Upstash Redis REST when `UPSTASH_REDIS_REST_URL`+`TOKEN` are set (shared across replicas), in-process `Map` otherwise — any Upstash failure degrades to memory instead of failing the request (see `SECURITY.md`).
- **Denormalized `posts.authorName/handle/avatar/trust`**: fast feed reads, no join per row.
- **Transactions for likes/comments/escrow/join**: atomic counts + race-safe unique violations.

---

## API

Full spec: **[API.md](./API.md)** — OpenAPI-like docs + Zod schemas + rate limits + `curl` examples for every route.

| Method & Path | Purpose | Auth | Rate Limit |
|---------------|---------|------|------------|
| `GET /api/health` | DB latency + seeded + pool | no | — |
| `POST /api/seed` | Idempotent seed (x-seed-secret) | secret | 3/min |
| `GET /api/posts?category&city&limit&offset&cursor` | Paginated posts (indexed) | no | — |
| `POST /api/posts` | Create post (denorm author) | sovereign fallback | 10/min |
| `GET /api/posts/[id]/like` | Likes list + `liked` flag | optional | — |
| `POST /api/posts/[id]/like` | Toggle like (transaction) | ✅ | 10/min |
| `GET /api/posts/[id]/comments?limit&offset` | Paginated comments | no | — |
| `POST /api/posts/[id]/comments` | Create comment (tx + count++) | ✅ | 20/min |
| `GET /api/communities?category&q&limit&offset` | List communities | no | 30/min |
| `GET /api/communities/[slug]` | Community detail | no | — |
| `POST /api/communities/[slug]` | `{ action:"join"|"leave" }` tx + membersCount | ✅ | 20/min |
| `GET /api/marketplace?category&city&maxPrice&limit&offset` | List items (index-aware) | no | 30/min |
| `POST /api/marketplace` | Create listing | sovereign fallback | 10/min |
| `POST /api/marketplace/[id]/offer` | Escrow offer (tx → escrow + message) | sovereign fallback | 10/min |
| `GET /api/businesses?city&category&q&limit&offset` | List businesses | no | 30/min |
| `POST /api/businesses/[id]/book` | Create booking (BK- ref) | sovereign fallback | 10/min |
| `GET /api/messages?threadId&limit&offset` | Chronological messages | no | 30/min |
| `POST /api/messages` | Send message (thread upsert) | sovereign fallback | 30/min |
| `GET /api/jobs?category&location&q&limit&offset` | List jobs | no | 30/min |
| `GET /api/jobs/[id]/apply?limit&offset` | List applications | no | 30/min |
| `POST /api/jobs/[id]/apply` | Apply (409 if duplicate) | ✅ | 5/min |
| `GET /api/radar?type&city&limit&offset` | Radar pins (index-aware) | no | 30/min |
| `POST /api/ai` | AI actions `{ action, text, targetLanguage?, context? }` | no | 20/min |
| `GET /api/search?q&type&` | Universal search (`all|communities|products|businesses|jobs|people|posts`) | no | 30/min |
| `GET /api/user` / `PATCH /api/user` | Profile read/update `{ bio, role, location, name }` | sovereign fallback | — |

Every mutating route returns `Retry-After` on 429 and Zod `details` on 400.

---

## Design Tokens

See **[DESIGN.md](./DESIGN.md)** for complete palette, spacing, typography, motion, component variants (`cva`), glass/depth, dark-mode guide, and a11y checklist.

**Palette (sourced from `src/lib/tokens.ts` + `src/app/globals.css`):**

| Token | Hex | Usage |
|-------|-----|-------|
| `emerald` / `emeraldBright` / `emeraldDeep` | `#059669` / `#10b981` / `#022c22` | Primary, growth/trust, CTA |
| `gold` / `goldWarm` / `goldLight` | `#f59e0b` / `#d97706` / `#fde68a` | Accent, achievements, badges |
| `indigo` / `indigoLight` | `#1e1b4b` / `#4338ca` | Secondary, night contrast, badges |
| `slate` / `slateLight` / `slateDark` | `#475569` / `#94a3b8` / `#1e293b` | Neutral text/borders |
| `bg` / `surface` / `surfaceElevated` | `#070c0e` / `#0c1616` / `#112020` | Background hierarchy (dark-first) |

- **Radius**: `sm 12px · md 16px · lg 20px · xl 24px · full 9999px`
- **Typography**: `Geist` (primary), fallback `Inter, -apple-system, BlinkMacSystemFont` — `h1: text-3xl md:text-4xl font-black`, `h2: text-xl font-bold`, `body: text-sm leading-relaxed`, `label: text-xs font-mono uppercase tracking-widest`.
- **Shadow**: card `0 12px 28px -8px rgba(0,0,0,0.6), 0 0 20px -5px rgba(16,185,129,0.15)`.
- **Components**: `Button` (variants: primary/secondary/ghost/gold/danger, sizes sm/md/lg/icon), `Card` (`kinara-card` hover lift), `Input`, `Dialog`, `Avatar`, `Badge` (gold/emerald/indigo/slate), `Tabs`, `Progress`.
- **Motion**: Tailwind + `motion` (spring, `cubic-bezier(0.16,1,0.3,1)`), 60fps, `prefers-reduced-motion` disables; tactile: `active:scale-[0.98]`, `touch-target` 44px.

---

## Adaptive Persona UI

Not one interface for everyone — the platform reshapes by role. Toggled in `Header` via `currentPersona` (`citizen | creator | business | student | buyer`), persisted as `kinara:currentPersona`:

| Persona | Dashboard Priority | Visible Modules |
|---------|--------------------|----------------|
| **Citizen** (default) | Balanced discovery | All 8 visible |
| **Creator** | Analytics + cinema + community voice | cinema↑, marketplace↓, jobs↓ |
| **Business** | Orders + customers + promo | marketplace↑, messages↑ |
| **Student** | Study pods + fellowships | communities ("Study Pods"), jobs ("Fellowships"), marketplace↓ |
| **Buyer** | Recommendations + nearby drops | marketplace↑, radar ("Nearby Drops & Artisan Studios"), cinema↓ |

See `src/app/page.tsx:248` (`handleSelectPersona`). Adding a persona is a config array swap — zero routing changes.

---

## Performance — Built for Kenya

Optimized for Kenya's network reality (2G edge, 120ms local vectors, sub-100ms offline queries):

- **Image**: `next/image` with `remotePatterns` (pexels), `formats: ["image/avif","image/webp"]`, `nextConfig.compress: true`, tailored `sizes` where possible.
- **Code splitting**: `next/dynamic` for `DynamicHome`, `LocalRadarMap` (`ssr:false`), `MessagingView`, `KinaraAICopilot` — see `src/app/page.tsx:43`.
- **SWR caching**: `dedupingInterval 60s`, `revalidateOnFocus: false`, `fetchJsonSafe` fallback.
- **DB indexing**: 40+ indexes (category/city/featured/price/author/location/type/lat-lng etc), `ilike` only where needed, `limit/offset` + `nextCursor` server pagination — no JS filtering.
- **Lazy media, compressed video, intelligent cache, low-bandwidth mode**: toggled via `kinara:lowBandwidth` or `navigator.connection.effectiveType === "2g" | "slow-2g" | saveData` → disables `backdrop-filter`, transitions, shadows (`low-bandwidth-mode` class in `globals.css:144`).
- **Startup**: `loading.tsx` streaming + SWR placeholder (`SkeletonCard`).
- **Smooth scroll**: 60fps motion + prefers-reduced-motion guard; leaflet z-index fixed for no thrash.

---

## Deployment

### Vercel (recommended hosting)

1. Push to GitHub → Import in Vercel dashboard.
2. Set env vars in **Project → Settings → Environment Variables**:
   - `DATABASE_URL` → Neon/Supabase/Vercel Postgres (must include `?sslmode=require`)
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your vercel domain)
   - `OPENROUTER_API_KEY` / `OPENAI_API_KEY` / `AI_MODEL` (optional)
   - `SEED_SECRET`, `UPSTASH_*`, `SENTRY_DSN` as needed
3. Deploy. Vercel runs `next build` automatically (no extra config — `next.config.ts` handles headers, `compress`, `optimizePackageImports`).
4. Migrate & seed:
   ```bash
   # locally with production DATABASE_URL:
   pnpm db:migrate
   curl -X POST https://your-app.vercel.app/api/seed -H "x-seed-secret: $SEED_SECRET"
   # SEED_SECRET is required — an empty value returns 503, never an open endpoint
   ```
5. Verify: `curl https://your-app.vercel.app/api/health` → `{ ok:true }`

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for Docker/self-host, Neon vs Supabase, health check wiring, CI.

### Docker (self-host / local)

```bash
docker compose up --build -d
docker compose exec app pnpm db:migrate  # or db:push
curl -X POST http://localhost:3000/api/seed -H "x-seed-secret: kinara-seed-local-only"
docker compose logs -f app
```

Images are `node:22-alpine`. Data persists in `pgdata` volume; app runs on `3000`.

---

## Testing, Linting & Type Checking

```bash
pnpm lint          # eslint (flat config + next/core-web-vitals)
pnpm lint:fix      # --fix
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # vitest run (jsdom, globals, src/**/*.{test,spec}.ts(x))
pnpm test:watch    # vitest watch
pnpm test:coverage # with coverage
pnpm build         # next build (also typechecks)
pnpm format        # prettier --write .   (on demand — see note below)
pnpm test:e2e      # playwright, browser-driven (see note below)
```

**Prettier** is kept as a dependency and `pnpm format` still works, but there is no
`format:check` gate and the repository is *not* uniformly formatted — running
`pnpm format` today would rewrite ~110 files. Reformatting the whole tree would bury
every real diff under whitespace noise, so it is deferred to a dedicated formatting
PR of its own. Lint/typecheck/tests are the enforced gates.

**E2E** (`pnpm test:e2e`) drives a real browser against a migrated + seeded database:
run `pnpm db:migrate` and `POST /api/seed` first, and make sure `SEED_PASSWORD` is set
(it is read from `.env.local` by `playwright.config.ts`). Playwright reuses a server
already listening on port 3000, otherwise it starts `pnpm dev --webpack`.
It is **not** wired into CI — it needs a browser install and a seeded database, and
the workflow's smoke checks already cover the same HTTP contracts server-side.
`playwright.config.ts` keeps `fullyParallel: false` so the wrong-password case in
`e2e/auth.spec.ts` always runs before a successful sign-in that clears its throttle
counter — otherwise enough reruns would lock the seeded account.

CI (`.github/workflows/ci.yml`) runs **lint → typecheck → migrate → unit tests → build →
8-check smoke** (health, seed auth, anonymous 401s, credential sign-in, admin/citizen
authorization, privilege-escalation rejection, rate limit, credential lockout) on every
push/PR. The lockout check fails the build if a locked handle ever issues a session for
the *correct* password, or if one locked handle locks out every account on that IP.

Existing suites: `src/lib/validators.test.ts`, `src/lib/ratelimit.test.ts`,
`src/lib/login-throttle.test.ts`, `src/components/ui/button.test.tsx`, plus
`e2e/smoke.spec.ts` and `e2e/auth.spec.ts`; add new specs under
`src/**/*.{test,spec}.{ts,tsx}`.

---

## Related Docs

| Doc | What it covers |
|-----|----------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | C4, ERD (15 tables + indexes), API matrix, auth/AI/data flows, decisions, scaling |
| **[DESIGN.md](./DESIGN.md)** | Tokens, components (cva), motion 60fps, glass/restrained depth, dark-mode, a11y |
| **[API.md](./API.md)** | OpenAPI-like spec for every route + Zod schemas + curl examples + rate limits |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Docker, Vercel, Neon/Supabase, drizzle migrate, health, CI |
| **[SECURITY.md](./SECURITY.md)** | Auth, rate-limit, seed secret, Zod, headers, token rotation, escrow |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Branching, conventional commits, PR checklist |
| **[ROADMAP.md](./ROADMAP.md)** | What's next — Horizon 0 ship, Horizon 1 harden, Horizon 2 grow |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history — v2.0.0 sovereign sweep (10 phases) + v1.0.0 |

---

## What's Next

> After v2.0.0 sovereign sweep: **ship → harden → grow**. See **[ROADMAP.md](./ROADMAP.md)** for full Horizon plan with owner/effort.

**Immediate (this week) — ship:**
1. **Deploy** `DATABASE_URL` (Neon pooled) + `NEXTAUTH_SECRET` + `SEED_SECRET` → Vercel → verify `GET /api/health` `ok:true` + `seeded:true` — `DEPLOYMENT.md:4.1`
2. **Domain + TLS** `kinara.africa` via Vercel
3. **E2E Smoke** Playwright 5 specs (`pnpm test:e2e` — to be added) + **Sentry** DSN + **Vercel Analytics** — already deps: `@vercel/analytics`
4. **Backup cron** `pg_dump` daily → `backups/`

**Next:** Daraja STK payments (`POST /api/webhooks/mpesa`), Uploads (Vercel Blob), Realtime (`socket.io`), `pg_trgm` Search v2, PWA offline — see `ROADMAP.md:1.x`.

> **Build note:** `package.json` now uses `next build --webpack` + `next dev --webpack` (Turbopack blocked by `next-auth@beta` — `build:turbo` keeps `--turbopack` for when resolved). `pnpm dev` / `pnpm build` already handle the flag.

---

## Contributing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for branching (`feat/*`, `fix/*`), conventional commits (`feat:`, `fix:`, `docs:`, ...), PR template, and code review checklist.

---

## License

MIT — see `LICENSE` if present, otherwise treat as MIT for sovereign community use. Built with pride for the Pan-African tech ecosystem 🇰🇪 🇳🇬 🇷🇼 🇬🇭 🇿🇦 🇪🇹.

---

<p align="center"><i>Kinara Sovereign Core — craft, speed, and dignity for the African century.</i></p>

