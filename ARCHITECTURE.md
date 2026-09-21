# ARCHITECTURE — KINARA Sovereign Platform

> C4, data model, API matrix, flows, trade-offs & scalability for the premium African-designed platform.

---

## Table of Contents

- [1. System Context (C4 Level 1)](#1-system-context-c4-level-1)
- [2. Container Diagram (C4 Level 2)](#2-container-diagram-c4-level-2)
- [3. Component Diagram — Next.js App](#3-component-diagram--nextjs-app-c4-level-3)
- [4. Data Model — ERD (15 Tables)](#4-data-model--erd-15-tables)
- [5. API Matrix (14+ Routes)](#5-api-matrix)
- [6. Auth Flow](#6-auth-flow--nextauth-credentials--jwt)
- [7. AI Flow — OpenRouter / OpenAI / Stub](#7-ai-flow--openrouter--openai--stub)
- [8. Data Flow — page.tsx → SWR → API → DB](#8-data-flow--pagetsx--swr--api--db)
- [9. Architectural Decisions (ADRs)](#9-architectural-decisions-adrs)
- [10. Scalability & Evolution](#10-scalability--evolution)
- [11. File → Responsibility Map](#11-file--responsibility-map)

---

## 1. System Context (C4 Level 1)

```
                         ┌─────────────────────────────────┐
                         │         External Users            │
                         │  Creators  Businesses  Students  │
                         │  Buyers    Citizens   Artisans   │
                         └──────────────┬────────────────────┘
                                        │ HTTPS + WS (future)
                                        ▼
                 ┌──────────────────────────────────────────┐
                 │         KINARA Sovereign Platform        │
                 │  Next.js 16 App (Vercel / Docker)      │
                 │  Premium African social, marketplace,   │
                 │  business, jobs, radar, AI platform      │
                 └──────┬──────────────────┬────────────────┘
                        │                  │
            ┌───────────▼─────┐  ┌────────▼──────────┐  ┌──────────────┐
            │   Postgres 16    │  │  OpenRouter /     │  │  Leaflet/OSM │
            │  (Neon/Supabase  │  │  OpenAI (AI SDK)  │  │  Tiles (free)│
            │   / Docker pg)   │  │  kinara AI        │  │  + Mapbox opt│
            └──────────────────┘  └───────────────────┘  └──────────────┘
                        │                  │                    │
            ┌───────────▼─────┐  ┌────────▼──────────┐  ┌─────▼────────┐
            │  Upstash Redis  │  │  Sentry (opt)     │  │  Pexels CDN  │
            │  (rate-limit    │  │  observability    │  │  images      │
            │   future swap)  │  │                   │  │              │
            └──────────────────┘  └───────────────────┘  └──────────────┘
```

**External dependencies kept optional** — platform runs fully on Postgres + local stubs.

---

## 2. Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Client — Browser / Mobile Web                    │
│  React 19 SPA (page.tsx)  ·  motion  ·  Tailwind  ·  leaflet          │
│  SWR ×8 endpoints  ·  dnd-kit dashboard  ·  Cmd+K search               │
│  localStorage: sectionsConfig, persona, city, lowBandwidth              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ fetch /api/*  (JSON, Zod-validated)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Next.js 16 Server (Node 22-alpine)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Route Handlers│  │ Auth.js (JWT)│  │ Rate limiter │  │instrumenta-│  │
│  │ /api/* 14+    │  │ Credentials  │  │ in-memory LRU│  │tion.ts pino│  │
│  │ validate Zod  │  │ sovereign    │  │ x-ff/x-real-ip│  │            │  │
│  │ tx / seed     │  │ usr_brian... │  │ 5-min GC     │  │            │  │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│         │                                                               │
│         │  drizzle-orm  +  pg Pool (max10, SSL prod, 30s idle)          │
│         ▼                                                               │
└─────────┬───────────────────────────────────────────────────────────────┘
          │  TCP 5432 (pg)
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Postgres 16                                          │
│  15 tables  ·  40+ indexes  ·  jsonb  ·  numeric  ·  FK + cascades     │
│  drizzle-kit migrate (drizzle/*.sql)                                     │
└─────────────────────────────────────────────────────────────────────────┘
          ▲
          │  HTTPS (optional)
┌─────────┴───────────────────────────────────────────────────────────────┐
│  OpenRouter (https://openrouter.ai/api/v1/chat/completions)  preferred │
│  OpenAI    (https://api.openai.com/v1/chat/completions)     fallback   │
│  Stub (Kinara Sovereign NLP v3.4)                            offline    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Container ports**: app `3000`, db `5432`, redis `6379` (optional compose service).

---

## 3. Component Diagram — Next.js App (C4 Level 3)

```
src/app/page.tsx (use client)  ── KinaraApp
  ├── Header  (persona switcher, city, lowBandwidth, Cmd+K, customizer, mobile sidebar toggle)
  ├── Sidebar (currentView, unreadCount, activeVoiceCount, isMobileOpen)
  ├── main#main-content
  │   ├── DynamicHome  (dynamic import)  ← 8 sections (greeting/trending/radar/communities/jobs/marketplace/cinema/messages)
  │   ├── LocalRadarMap  (dynamic ssr:false)  ← LeafletMapCore
  │   ├── CommunityView
  │   ├── MarketplaceView ← EscrowModal + AIPriceCheckModal
  │   ├── BusinessView ← BookingModal
  │   ├── MessagingView (dynamic)
  │   ├── JobsView
  │   ├── ProfileView
  │   └── KinaraAICopilot (dynamic ssr:false)
  ├── UniversalSearchModal (Cmd+K)
  └── ModuleCustomizerModal (dnd-kit sortable)

src/app/api/*  (server-only)
  health, seed, ai, search, posts(+like/comments), communities(+slug), marketplace(+offer),
  businesses(+book), messages, jobs(+apply), radar, user, auth/[...nextauth]

src/lib
  auth.ts, env.ts, ratelimit.ts, validators.ts, tokens.ts, fetcher.ts, get-user.ts, cn.ts, logger.ts

src/db
  index.ts (pool), schema.ts (15 tables), seed.ts

src/components/ui
  button, card, input, dialog, avatar, badge, tabs, progress
```

**Boundary rule**: `src/app/*` (pages/handlers) never import UI components directly with deep paths — use `@/` alias.

---

## 4. Data Model — ERD (15 Tables)

> Source: `src/db/schema.ts:4` — all columns shown with type, every `index`/`uniqueIndex` enumerated.

### 4.1 Overview (ASCII ERD)

```
users 1──∞ posts              (authorId FK cascade)
users 1──∞ likes              (userId)    + posts 1──∞ likes (postId)  => likes unique (postId,userId)
users 1──∞ comments           (authorId)  + posts 1──∞ comments
users 1──∞ communityMembers   + communities 1──∞ communityMembers  => unique (communityId,userId)
users 1──∞ bookings           + businesses 1──∞ bookings
users 1──∞ escrowTransactions (buyerId/sellerId) + marketplaceItems 1──∞ escrowTransactions (itemId)
users 1──∞ messages           (senderId)  + threads 1──∞ messages (threadId text, not FK but participants jsonb)
users 1──∞ jobApplications    + jobs 1──∞ jobApplications => unique (jobId,applicantId)

users.preferences jsonb { persona?, lowBandwidth?, sections? }
marketplaceItems ← users (sellerId)
businesses ← users (ownerId)
communities ← users (createdBy)
localRadar / threads standalone (no FK to users, threads.participants jsonb)
```

### 4.2 Tables in detail

#### `users` — sovereign identity  [src/db/schema.ts:5]
| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| `id` | `text PK` | `usr_brian_mwangi` etc |
| `name, handle, avatar, cover, bio` | `text` | `handle unique`, avatar/cover CDN URLs |
| `role` | `text default 'citizen'` | `citizen|creator|business|student|buyer` |
| `location` | `text` | e.g. "Nairobi, Kenya • Kilimani Hub" |
| `trustScore` | `integer default 95` |  |
| `verified, verificationType` | `boolean, text` | e.g. "National ID + Biometric & Escrow Certified" |
| `followersCount, followingCount` | `integer` |  |
| `marketplaceRating` | `numeric(3,2) default "4.95"` | ★ |
| `skills, achievements` | `jsonb` | `string[]` / `{title,desc,icon}[]` |
| `preferences` | `jsonb default {}` | `{ persona?, lowBandwidth?, sections? }` |
| `createdAt, updatedAt` | `timestamp defaultNow` |  |
| **Indexes** | `users_location_idx`, `users_trust_idx`, `users_role_idx` |  |

#### `posts`  [src/db/schema.ts:31]
| Column | Type |
|--------|------|
| `id` | `serial PK` |
| `authorId` | `text FK users.id cascade` + denorm `authorName/handle/avatar/trust/verified` for fast feed reads |
| `content` | `text` (1–2000, Zod) |
| `category, city` | `text` defaults `trending`/`Nairobi` |
| `likes, commentsCount, sharesCount` | `integer` (atomic `sql``like +1`) |
| `mediaUrl, mediaType` | `text nullable, text default text` |
| `tags` | `jsonb string[]` |
| `pinned, createdAt, updatedAt` | `boolean false, timestamp` |
| **Indexes** | `posts_category_idx`, `posts_city_idx`, `posts_pinned_idx`, `posts_created_idx`, `posts_author_idx` |

#### `communities`  [src/db/schema.ts:59]
| Column | Type |
|--------|------|
| `id, slug` | `text PK, text unique` |
| `name, tagline, description, avatar, banner, category, city` | `text` |
| `membersCount` | `integer default 100` (atomic +/-1) |
| `activeVoice, voiceSpeakersCount, voiceRoomTopic` | `boolean false, integer 0, text nullable` |
| `rules` | `jsonb string[]` |
| `createdBy, createdAt` | `text FK users, timestamp` |
| **Indexes** | `communities_category_idx`, `communities_active_voice_idx`, `communities_city_idx` |

#### `marketplace_items`  [src/db/schema.ts:82]
| Column | Type |
|--------|------|
| `id` | `serial PK` |
| `title, description, price, currency, category, image` | `text/text/integer/text/text/text` |
| `sellerId → users.id`, `sellerName/Avatar/TrustScore/Verified` | denorm |
| `city, neighborhood, distanceKm numeric(3,1), deliverySpeed, aiPriceEstimate, escrowSecured, featured` | |
| `rating numeric(3,2) default "4.9", reviewsCount integer` | |
| **Indexes** | `marketplace_category_idx/city_idx/featured_idx/price_idx/seller_idx` |

#### `businesses`  [src/db/schema.ts:113]
| Column | Type |
|--------|------|
| `id` | `text PK` (e.g. `biz_ikigai_nairobi`) |
| `name, category, banner, avatar, headline, bio, city, neighborhood` | `text` |
| `rating numeric(3,2), reviewsCount, verified, openHours` | |
| `services jsonb {name,price}[], catalogCount, monthlyTransactions, phone, website` | |
| `ownerId → users, createdAt, updatedAt` | |
| **Indexes** | `businesses_city_idx/category_idx/verified_idx` |

#### `messages`  [src/db/schema.ts:141]
| Column | Type |
|--------|------|
| `id` | `serial PK` |
| `threadId` | `text` (not FK — free-form ID, e.g. `th_folake`, `th_seller_3`) |
| `senderId → users`, `senderName/Avatar/Role` | denorm |
| `text` | `text` |
| `timestamp, isMe, type, metadata jsonb Record<string,any>, createdAt` | |
| **Indexes** | `messages_thread_idx/sender_idx/created_idx` |

#### `jobs`  [src/db/schema.ts:160]
| Column | Type |
|--------|------|
| `id` | `serial PK` |
| `title, company, companyLogo, location, type, salary, category` | `text` |
| `tags jsonb string[]`, `postedAt, createdAt` | `timestamp` |
| **Indexes** | `jobs_category_idx/location_idx/posted_idx` |

#### `local_radar`  [src/db/schema.ts:178]
| Column | Type |
|--------|------|
| `id` | `serial PK` |
| `type` | `text` enum `friend|business|event|deal|listing|service` |
| `name, avatar, city, neighborhood` | `text` |
| `lat, lng numeric(10,7)`, `distance text, distanceKm numeric(5,2), details, status` | |
| **Indexes** | `radar_type_idx/city_idx/(lat,lng)` composite |

#### `likes`  [src/db/schema.ts:200]
| Column | Type |
|--------|------|
| `id` | `serial PK` |
| `postId → posts cascade`, `userId → users cascade` | |
| **Constraints / Indexes** | `uniqueIndex likes_unique (postId,userId)` + `likes_post_idx/user_idx` |

#### `comments`  [src/db/schema.ts:211]
| `id` | `serial PK` |
| `postId → posts cascade`, `authorId → users cascade`, `authorName/Avatar`, `content text`, `createdAt` | |
| **Indexes** | `comments_post_idx/author_idx` |

#### `community_members`  [src/db/schema.ts:224]
| `id serial PK`, `communityId → communities cascade`, `userId → users cascade`, `role text member`, `joinedAt` |
| `uniqueIndex community_members_unique (communityId,userId)` + two indexes |

#### `bookings`  [src/db/schema.ts:236]
| `id uuid PK defaultRandom()`, `businessId → businesses cascade`, `userId → users`, `serviceName/date/timeSlot text`, `notes text`, `status default confirmed`, `bookingRef unique`, `createdAt` |
| Indexes: `bookings_business_idx/user_idx/ref_idx` |

#### `escrow_transactions`  [src/db/schema.ts:253]
| `id uuid PK defaultRandom()`, `itemId → marketplaceItems cascade`, `buyerId/sellerId → users`, `amount integer`, `currency KES`, `status held|delivered|released|disputed|cancelled`, `paymentRail mpesa|momo|card|bank`, `escrowRef unique`, `metadata jsonb`, `createdAt/updatedAt` |
| Indexes: `escrow_item_idx/buyer_idx/status_idx/ref_idx` |

#### `threads`  [src/db/schema.ts:273]
| `id text PK`, `title text`, `participants jsonb string[]`, `type direct|community|business|marketplace`, `lastMessageAt, createdAt` |
| Index: `threads_type_idx` |

#### `job_applications`  [src/db/schema.ts:284]
| `id serial PK`, `jobId → jobs cascade`, `applicantId → users cascade`, `status pending`, `coverNote text`, `createdAt` |
| `uniqueIndex job_applications_unique (jobId,applicantId)` + two indexes |

> **FK cascade** ensures referential cleanliness; `messages.threadId` and `threads.participants` remain free-form for flexibility (future room types without migrations).

---

## 5. API Matrix

> Every route validates with **Zod**, enforces **per-IP rate limits** (see `src/lib/ratelimit.ts`), and returns Zod `details` on 400 / `Retry-After` on 429.
> `dynamic = "force-dynamic"` on all handlers (no static caching).

| # | Method | Path | File | Auth | Rate Limit | Query / Body | Success | Errors |
|---|--------|------|------|------|------------|--------------|---------|--------|
| 1 | GET | `/api/health` | `api/health/route.ts` | no | — | — | `200 {ok,version,latencyMs,seeded,pool,timestamp}` | `500 {ok:false,error}` |
| 2 | POST | `/api/seed` | `api/seed/route.ts` | `x-seed-secret` | `seed:{ip} 3/60s` | — | `200 {success,message}` (idempotent) | `401` secret mismatch, `429` |
| 2b | GET | `/api/seed` | (deprecated) | no | same | — | `200 {deprecated:true}` | — |
| 3 | POST | `/api/ai` | `api/ai/route.ts` | no | `ai:{ip} 20/60s` | `{action,text?,targetLanguage?,context?}` | `200 {success,action,result,model}` | `400 zod, 429` |
| 4 | GET | `/api/search?q&type` | `api/search/route.ts` | no | `search:{ip} 30/60s` | `q=1..100, type=all\|communities\|products\|businesses\|jobs\|people\|posts` | `200 {results:{communities,products,businesses,jobs,posts,people},query,type,count}` | `400,429` |
| 5 | GET | `/api/posts?category&city&limit&offset&cursor` | `api/posts/route.ts` | no | — | `category≠all via eq, city≠all via eq, limit 1..100, offset, cursor` | `200 {posts,nextCursor,limit,offset}` auto-seeds if empty | `500` |
| 6 | POST | `/api/posts` | same | sovereign fallback | `posts:create:{ip} 10/60s` | `postCreateSchema {content1..2000,category,city,mediaUrl?,mediaType?,tags?,pinned?}` | `{post}` | `400,429` |
| 7 | GET | `/api/posts/[id]/like` | `api/posts/[id]/like/route.ts` | optional | — | `limit/offset` | `200 {likes,count,totalLikes,postId,liked,limit,offset}` | `400 invalid id,404 post` |
| 8 | POST | `/api/posts/[id]/like` | same | ✅ (`getCurrentUserId`) | `like:{ip} 10/60s` | toggle via tx | `200 {liked,likes}` or `409 race` | `400,401,404,429` |
| 9 | GET | `/api/posts/[id]/comments?limit&offset` | `api/posts/[id]/comments/route.ts` | no | — | `limit1..100,offset` | `200 {comments,count,totalComments,postId,limit,offset}` | `400,404` |
| 10 | POST | `/api/posts/[id]/comments` | same | ✅ | `comments:{ip} 20/60s` | `{content 1..1000}` | `200 {comment,success,commentsCount}` tx | `400,401,404,429` |
| 11 | GET | `/api/communities?category&q&limit&offset` | `api/communities/route.ts` | no | `communities:get:{ip} 30/60s` | `category ilike, q ilike name/tagline/city/category/description` | `200 {communities,data,count,limit,offset}` | `400,429` |
| 12 | GET | `/api/communities/[slug]` | `api/communities/[slug]/route.ts` | no | — | slug `^[a-z0-9-]+$` | `200 {community}` | `400 slug,404` |
| 13 | POST | `/api/communities/[slug]` | same | ✅ | `communities:join:{ip} 20/60s` | `{action:join\|leave}` tx + membersCount | `200 {joined,membersCount,success}` idempotent + 409 race | `400,401,404,429` |
| 14 | GET | `/api/marketplace?category&city&maxPrice&limit&offset` | `api/marketplace/route.ts` | no | `marketplace:get:{ip} 30/60s` | `category/city eq, maxPrice lte` | `200 {data,items,count}` | `400,429` |
| 15 | POST | `/api/marketplace` | same | sovereign fallback | `marketplace:create:{ip} 10/60s` | `marketplaceCreateSchema` | `201 {item,data}` | `400,429` |
| 16 | POST | `/api/marketplace/[id]/offer` | `api/marketplace/[id]/offer/route.ts` | sovereign fallback | `marketplace:offer:{ip} 10/60s` | `offerSchema {offerPrice?,note?,paymentRail?}` | `200 {escrowRef,escrowId,status,amount,currency}` tx → escrow+message | `400,404,429` |
| 17 | GET | `/api/businesses?city&category&q&limit&offset` | `api/businesses/route.ts` | no | `businesses:get:{ip} 30/60s` | `city ilike, category ilike, q ilike name/category/city/headline/bio` | `200 {businesses,data,count}` | `400,429` |
| 18 | POST | `/api/businesses/[id]/book` | `api/businesses/[id]/book/route.ts` | sovereign fallback | `businesses:book:{ip} 10/60s` | `bookingSchema {serviceName,date,timeSlot,notes?}` | `201 {bookingRef,booking,businessName}` | `400,404,429` |
| 19 | GET | `/api/messages?threadId&limit&offset` | `api/messages/route.ts` | no | `messages:get:{ip} 30/60s` | `threadId? eq` + pagination (validates `^[1..100]` if present) | `200 {messages,count,limit,offset}` asc `createdAt` | `400,429` |
| 20 | POST | `/api/messages` | same | sovereign fallback | `messages:post:{ip} 30/60s` | `{threadId 1..100, text? max5000, type,text|voice|offer|poll, metadata?}` | `200 {message,success}` + upserts `threads` | `400,429` |
| 21 | GET | `/api/jobs?category&location&q&limit&offset` | `api/jobs/route.ts` | no | `jobs:get:{ip} 30/60s` | `category eq, location ilike, q ilike title/company/category` | `200 {jobs,count}` | `400,429` |
| 22 | POST | `/api/jobs/[id]/apply` | `api/jobs/[id]/apply/route.ts` | ✅ | `jobs:apply:{ip} 5/60s` | `{coverNote? max2000}` | `201 {application}` + `409` if already applied | `400,401,404,409,429` |
| 23 | GET | `/api/jobs/[id]/apply?limit&offset` | same | no | `jobs:apply:get:{ip} 30/60s` | pagination | `200 {applications,jobId,count}` | `400,404,429` |
| 24 | GET | `/api/radar?type&city&limit&offset` | `api/radar/route.ts` | no | `radar:{ip} 30/60s` | `type ∈ friend|business|event|deal|listing|service, city eq` | `200 {radar,data,count}` | `400,429` |
| 25 | GET/PATCH | `/api/user` | `api/user/route.ts` | sovereign fallback | — | `PATCH {bio?,role?,location?,name?}` via `userPatchSchema` | `200 {user}` | `400` |
| 26 | * | `/api/auth/[...nextauth]` | `api/auth/[...nextauth]/route.ts` | — | — | Auth.js handlers | — | — |

> **Idempotency noted**: community join/leave and marketplace offer are transactional + unique-constraint aware (race → 409 or idempotent success). Like toggle, comment count increment, escrow+message are wrapped in `db.transaction`.

---

## 6. Auth Flow — NextAuth Credentials + JWT

```
Browser                          NextAuth handler              DB (future)
  │ POST /api/auth/callback/          │                          │
  │ credentials {handle,password}     │                          │
  ├────────────────────────────────►  │                          │
  │                            authorize(credentials)            │
  │                            ┌─────────────────┐               │
  │                            │ Zod credentials │               │
  │                            │ handle fallback │               │
  │                            │ "brianmwangi"   │               │
  │                            │                 │               │
  │                            │ return {        │               │
  │                            │  id:"usr_brian_ │               │
  │                            │     mwangi",   │               │
  │                            │  name,email,    │               │
  │                            │  handle,image,  │               │
  │                            │  trustScore:98 }│               │
  │                            └────────┬────────┘               │
  │                            jwt() callback  ──► token.id/handle/trustScore
  │                            session() ──► session.userId/handle
  │  ◄────────────────────────  Set-Cookie: next-auth.session-token (JWT, httpOnly)
  │

  Subsequent GET/POST                            │
  fetch("/api/posts", { headers: Cookie })  ──► getCurrentUserId() ──► auth() ──► session.userId
                                                     │  (try/catch → fallback "usr_brian_mwangi")
                                                     └──►  used for denorm author fields, membership, escrow, booking
```

**Env**: `NEXTAUTH_SECRET` (32+ chars, `openssl rand -base64 32`), `NEXTAUTH_URL` (also `HTTP-Referer` for OpenRouter).  
**Security**: `trustHost:true`, `session.strategy:"jwt"`, headers: `X-Frame-Options:DENY`, `X-Content-Type-Options:nosniff`, `Referrer-Policy:strict-origin-when-cross-origin`. See `SECURITY.md`.  
**Production swap** (`src/lib/auth.ts:28`): replace hardcoded return with `await db.select().from(users).where(eq(users.handle, handle))` + `bcrypt.compare`.

---

## 7. AI Flow — OpenRouter → OpenAI → Stub

```
POST /api/ai {action,text,targetLanguage,context}
      │
      ├─ rateLimit  ai:{ip} 20/60s  ──► 429 if exceeded
      ├─ zod aiSchema  ──► 400 if invalid
      │
      ├─ getAiProvider()  [src/lib/env.ts:65]
      │    ├─ env.OPENROUTER_API_KEY ? "openrouter"
      │    ├─ else env.OPENAI_API_KEY ? "openai"
      │    └─ else "stub"
      │
      ├─ if hasAiKey():  callOpenRouter(action,text,context,targetLanguage,env.AI_MODEL,apiKey,provider)
      │       │  HTTP POST  https://openrouter.ai/api/v1/chat/completions  or  https://api.openai.com/v1/chat/completions
      │       │  Headers: Authorization: Bearer {key}  (+ HTTP-Referer/X-Title for OpenRouter)
      │       │  Body: { model, messages:[{system: getSystemPrompt(action)}, {user: buildUserContent(...) }], temperature (0.3 for price_check), max_tokens 800 }
      │       │  Timeout 15s (AbortController)
      │       ├─ if !res.ok → warn + return null (falls through)
      │       ├─ if action==="price_check":  strip ```json fences, JSON.parse(cleaned) → {result,model}
      │       └─ else:  return {result: choices[0].message.content.trim(), model}
      │               └─ if success → 200 {success:true,action,result,model}
      │
      └─ if null or !hasAiKey → local stub switch:
           rewrite → rewriteText()  |  summarize → summarizeText()  |  translate → translateAfrican(lang)
           sheng → convertToSheng() |  professional → makeProfessional()  |  pitch → makeFounderPitch()
           continue → continueThought()  |  emojis → addTastefulEmojis()
           price_check → evaluatePriceAndTrust()  |  copilot → answerCopilot()
              └─ 200 {success:true,action,result,model:"Kinara Sovereign NLP v3.4 (Edge-Accelerated)"}
```

**System prompts** live in `src/app/api/ai/route.ts:8` (`getSystemPrompt`), each African-centered, token-capped. `price_check` enforces `temperature 0.3` for deterministic JSON.  
**Zero-budget path**: stubs require no key; free tier uses `meta-llama/llama-3.1-8b:free` (`AI_MODEL` env). See `DEPLOYMENT.md`.

---

## 8. Data Flow — `page.tsx` → SWR → API → DB

```
┌──────────────────────────────────────────────────────────────────────────┐
│ page.tsx  (export default KinaraApp)  "use client"                      │
│                                                                          │
│  const swrConfig = { revalidateOnFocus:false, dedupingInterval:60000 }   │
│  useSWR("/api/user", fetcher, swrConfig)          → UserProfile          │
│  useSWR("/api/posts?limit=20", fetcher, swrConfig) → PostItem[] + nextCursor│
│  useSWR("/api/communities", ...)                  → CommunityItem[]      │
│  useSWR("/api/marketplace?limit=20", ...)         → MarketplaceProduct[] │
│  useSWR("/api/businesses", ...)                   → BusinessStorefront[] │
│  useSWR("/api/messages", ...)                     → MessageItem[]        │
│  useSWR("/api/jobs", ...)                         → JobListing[]         │
│  useSWR("/api/radar", ...)                        → RadarPin[]           │
│         │                                                               │
│   fetcher = (url) => fetch(url).then(r => { if(!r.ok) throw ...; return r.json() })  [src/lib/fetcher.ts:1]
│         │                                                               │
│         ▼  Next.js route handlers (fetch, server-side, Zod + rateLimit + Drizzle)
│                                                                          │
│   sync to local optimistic state:                                      │
│   useEffect(()=> setPosts(postsData.posts), [postsData])  ×8             │
│   postCreated: setPosts([newPost, ...posts])  (optimistic)              │
│   unreadCount = useMemo(()=>messages.filter(!isMe).length)   derived     │
│                                                                          │
│   localStorage (after hydration):                                        │
│   kinara:sectionsConfig  → DynamicHome module visibility/order           │
│   kinara:currentPersona  → citizen|creator|business|student|buyer        │
│   kinara:selectedCity    → Nairobi|Lagos|Kigali…                        │
│   kinara:lowBandwidth    → boolean (or auto via navigator.connection)     │
│                                                                          │
│   navigation: currentView ∈ home|radar|communities|marketplace|business │
│                              messaging|jobs|profile|ai                  │
│   + activeCommunitySlug / activeBusinessId for deep-link                │
│   + ModuleCustomizerModal (dnd-kit) → setSectionsConfig                  │
│   + persona switch → handleSelectPersona reorders sections              │
│   + Cmd+K → UniversalSearchModal (client filter fallback + /api/search) │
│                                                                          │
│   dynamic imports (code splitting):                                     │
│   DynamicHome, LocalRadarMap(ssr:false), MessagingView, KinaraAICopilot │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ JSON + nextCursor (cursor = posts.id, featured sort)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Next Route Handlers  (src/app/api/*)                                     │
│  - Zod parse (400 + flatten details)                                     │
│  - rateLimit(key, limit, windowMs) + Return 429 + Retry-After            │
│  - getCurrentUserId() (sovereign fallback) or 401                        │
│  - drizzle:  eq/and/ilike/lte/sql, indexed whereClause, orderBy, limit/offset│
│  - transaction for mutations (likes, comments, escrow, join/leave)       │
│  - if table empty: await seedDatabase() (idempotent check 1 row)         │
│  - return NextResponse.json({posts/items/messages/...})                  │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │  drizzle-orm  +  Pool (pg)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Postgres 16  (pool max10, idleTimeout 30s, connTimeout 10s, SSL prod)    │
│  src/db/index.ts: checkDbHealth()  →  pool.query("SELECT 1") latencyMs  │
│  /api/health reflects seeded? via SELECT 1 row check                    │
│  schema auto-handled via drizzle-kit generate → drizzle/*.sql            │
└──────────────────────────────────────────────────────────────────────────┘
```

**Polling note**: SWR `dedupingInterval:60s` + `revalidateOnFocus:false` balances freshness vs Kenya bandwidth. Mutations revalidate optimistically; explicit `mutate` calls can be added where needed.

---

## 9. Architectural Decisions (ADRs)

| # | Decision | Alternatives | Why this |
|---|----------|--------------|----------|
| ADR-1 | **Leaflet + OSM (react-leaflet)** | Mapbox, Google Maps | Zero cost, offline-friendly, no key, sovereign. Optional `NEXT_PUBLIC_MAPBOX_TOKEN` for upgrade without code change. See `src/components/radar/LeafletMapCore.tsx`, `ARCH-004` |
| ADR-2 | **Auth.js Credentials + JWT (sovereign hardcoded)** | Supabase Auth, Clerk, NextAuth OAuth | Zero budget, demo-ready; JWT avoids DB session store. Swap `authorize()` for `bcrypt + drizzle` lookup when funds available. `src/lib/auth.ts:28` |
| ADR-3 | **`jsonb` for skills/achievements/tags/services/participants/metadata** | Extra join tables / enum columns | Flexible evolution without migrations; GIN indexable later if searchable; aligns with Vercel Postgres playbooks. |
| ADR-4 | **In-memory rate limiter** (`Map` + 5-min GC) | Upstash Redis, `express-rate-limit` Redis store | Zero dependency, fast, sufficient for single-instance (Vercel/Docker one replica). Upstash env vars accepted for multi-instance migration (see `SECURITY.md#rate-limiting`). `src/lib/ratelimit.ts:10` |
| ADR-5 | **Denormalized author fields on `posts`** (`authorName/handle/avatar/trust/verified`) | JOIN `users` per feed row | Feed read latency dominates; avoid `N+1` joins. Author update path refreshes denorm rows or tolerates eventual staleness. |
| ADR-6 | **SWR vs React Query** | TanStack Query | Smaller bundle, `fetcher` simplicity, native `next` caching compat, sufficient for 8 endpoints. `src/lib/fetcher.ts:1` |
| ADR-7 | **Sticky auth fallback** (`usr_brian_mwangi`) | Fail-closed 401 | Demo continuity with zero friction. `getCurrentUserId` falls back inside `try/catch`, while transactional routes like `like/apply` still enforce `401` when truly required. `src/lib/get-user.ts:6` |
| ADR-8 | **Numeric PK for posts/marketplace/messages vs text PK for users/communities/businesses** | All `uuid` | User/community/business IDs are semantic slugs (`usr_*`, `biz_*`), posts/marketplace sequential for `cursor` pagination + cheap indexes. |
| ADR-9 | **Seed idempotency** (`SELECT 1` before `seedDatabase()` + `onConflictDoNothing` for threads) | Truncate & re-seed | Safe for auto-call from any `GET` that finds empty table + protects against thundering herd. `src/db/seed.ts:6`, `src/app/api/seed/route.ts:45` |
| ADR-10 | **Tailwind 4 + `@tailwindcss/postcss`** | Styled-components, CSS Modules only | Utility-speed + design token single source (`src/lib/tokens.ts` + `globals.css`) + PostCSS pipeline native to Next. |
| ADR-11 | **No `output: "standalone"` yet** | Standalone Docker output | Works with current `next.config.ts`; Dockerfile handles both (see `DEPLOYMENT.md#docker`). Enable `output: "standalone"` in `next.config.ts` for smaller images if needed. |
| ADR-12 | **pino + `instrumentation.ts`** | winston / console | Structured logs, `NEXT_RUNTIME === "nodejs"` gate, Vercel log drains ready. |

---

## 10. Scalability & Evolution

| Concern | Current | Path to scale |
|---------|---------|---------------|
| **DB pool** | `pg.Pool max:10, idleTimeout 30s, connectionTimeout 10s` | Raise `max` per instance; move to Neon pooled connection (`-pooler.neon.tech`); add `drizzle` read replicas where needed. |
| **Rate limiting** | In-memory `Map` (single instance) | Set `UPSTASH_REDIS_REST_URL/TOKEN` → switch `rateLimit()` to Upstash sliding window (atomic). Vercel KV / Redis deployment. |
| **Indexes** | 40+ B-tree indexes (category, city, featured, price, location, type, createdAt etc) | Add GIN on `jsonb` (`skills`, `tags`) if search-by-tag grows; add trigram `pg_trgm` for richer ILIKE; consider `pg_search` extensions. |
| **Pagination** | `limit/offset` + `nextCursor = posts.id` | `keyset` pagination (`WHERE id > cursor`) already supported in `posts` GET (`sql``posts.id > cursor``). Adopt everywhere to avoid offset scan. |
| **Seed** | `SELECT 1 LIMIT 1` gate + sequential inserts | Guard with advisory lock or `pg_try_advisory_xact_lock()` for concurrent deploys; currently mitigated by idempotency + 3/min rate limit on `/api/seed`. |
| **AI** | Per-request `callOpenRouter` + 15s AbortController + stub fallback | Add streaming (`/api/ai` → `streamText` via AI SDK), request coalescing, and Upstash/Redis caching per `(action,textHash)` to cut LLM cost. |
| **Realtime** | polling via SWR (60s dedup) | Upgrade to `ws` / `Socket.IO` / Pusher for Messaging + voice pulses; add `threads.lastMessageAt` pub/sub. Current dir is `src/components/messaging/`. |
| **Media** | Pexels CDN external URLs | Migrate to Vercel Blob / R2 / S3 + `next/image` `loader`; add upload route; compress in background (Sharp already in `pnpm-workspace.yaml`). |
| **Auth** | Credentials + JWT (single `usr_brian_mwangi`) | Switch to `bcrypt` + `users` lookup + email/password + OAuth (Google, Apple) via Auth.js providers; add RBAC via `role`. |
| **Tiles** | OSM free tiles | Move to Mapbox (`NEXT_PUBLIC_MAPBOX_TOKEN`) or self-hosted `tileserver-gl` for offline tile bundles in low-bandwidth regions. |
| **Observability** | `pino` + `/api/health` (latencyMs + pool counts + seeded flag) | Add Sentry (`SENTRY_DSN`), Vercel Analytics (`@vercel/analytics` already in deps), OpenTelemetry via `instrumentation.ts`. |
| **Deploy** | Single Next instance (Vercel or Docker) | Horizontal via Vercel auto-scale or Docker replicas behind nginx/traefik; move stateful `lowBandwidth` toggle to `localStorage` (already) to keep stateless. |

---

## 11. File → Responsibility Map

| Path | Responsibility |
|------|---------------|
| `src/db/schema.ts` | Single source of truth for 15 tables + indexes |
| `src/db/index.ts` | Singleton `Pool` + `drizzle(pool)` + `checkDbHealth()` |
| `src/db/seed.ts` | Sovereign seed, idempotent guard |
| `src/lib/env.ts` | Zod env validation + `hasAiKey/getAiProvider` |
| `src/lib/auth.ts` | NextAuth sovereign Credentials, JWT/session callbacks |
| `src/lib/ratelimit.ts` | In-memory LRU + `getClientIp` |
| `src/lib/validators.ts` | Zod API boundaries |
| `src/lib/tokens.ts` | JS tokens (palette, spacing, shadow, typography) |
| `src/lib/cn.ts` | `clsx`/`twMerge` + class helper |
| `src/lib/fetcher.ts` | SWR fetcher |
| `src/lib/get-user.ts` | `auth() → userId` with fallback |
| `src/app/api/*` | Route handlers (matrix above) |
| `src/app/page.tsx` | Sovereign dashboard orchestrator (8 SWRs, persona, radar, search) |
| `src/app/globals.css` | CSS tokens + kinara-card/glass/leaflet/a11y |
| `next.config.ts` | Images, compress, `optimizePackageImports`, security headers |
| `drizzle.config.ts` | Kit dialect + credentials |

---

*Kinara Sovereign Core — architecture for craft, speed, and continental scale. See `DESIGN.md` for tokens & components, `API.md` for route contracts, `DEPLOYMENT.md` for ship.*

