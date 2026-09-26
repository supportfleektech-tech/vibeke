# API — KINARA Sovereign Platform

> OpenAPI-like reference for all `src/app/api/*` routes. Conventions, Zod schemas, rate limits & curl examples.

Base URL: `http://localhost:3000` (or your Vercel URL). All timestamps are ISO-8601 UTC (`timestamp` / `createdAt`). All handlers set `export const dynamic = "force-dynamic"` so they are never statically cached.

---

## Conventions

| Topic | Detail |
|-------|--------|
| **Validation** | Every boundary validated with **Zod 4** (`src/lib/validators.ts`). On failure `400 { error, details: flatten() }`. |
| **Rate limiting** | `src/lib/ratelimit.ts` — in-memory `Map<key, {count,resetAt}>` (5-min GC). Key = `"{route}:{clientIp}"` or `"{route}:{id}:{ip}"`. Client IP from `x-forwarded-for` (first) → `x-real-ip` → `127.0.0.1`. On exceed `429 { error, ... }` + header `Retry-After: <seconds>` and for some routes `X-RateLimit-Limit/Remaining/Reset`. Falls back to Upstash Redis if `UPSTASH_*` set (see `SECURITY.md`). |
| **Auth** | `getCurrentUserId()` → `auth()` (Auth.js JWT) → `session.userId` or fallback `"usr_brian_mwangi"` (`src/lib/get-user.ts:6`). Mutations that require real identity return `401 Unauthorized` when `getCurrentUserId` yields nothing (like/dislike, comments, jobs apply, community join/leave). Others use sovereign fallback for demo continuity. |
| **Pagination** | `limit` 1–100 (default 20) via `paginationSchema`; `offset` 0+; for posts also `cursor` (post `id` numeric). Responses include `limit, offset, count` plus `nextCursor` where cursor-pagination is offered. |
| **Seed** | Any `GET` whose table is empty auto-calls `await seedDatabase()` (idempotent, `src/db/seed.ts:6`). `POST /api/seed` is the explicit, rate-limited, secret-protected seeder. |
| **Content-Type** | `application/json` for request & response. |
| **Error envelope** | `500 { error: string }` or `504` on timeout (AI 15s). `404` includes `{ error }`. |

---

## Table of Contents

1. [Health](#get-apihealth)
2. [Seed](#post-apiseed)
3. [AI](#post-apiai)
4. [Search](#get-apisearchqtype)
5. [Posts](#get-apiposts)
6. [Likes](#get-apipostsidlike)
7. [Comments](#get-apipostsidcomments)
8. [Communities](#get-apicommunities)
9. [Marketplace](#get-apimarketplace)
10. [Businesses](#get-apibusinesses)
11. [Messages](#get-apimessages)
12. [Jobs](#get-apijobs)
13. [Radar](#get-apiradar)
14. [User](#get-apiuser)
15. [Auth](#apiauthnextauth)
16. [Rate Limit Summary](#rate-limit-summary)
17. [Zod Schema Reference](#zod-schema-reference)

---

## `GET /api/health`

**File**: `src/app/api/health/route.ts:7`

Liveness + DB probe. Used by Docker `HEALTHCHECK` and CI.

| Field | Type |
|-------|------|
| `ok` | `boolean` |
| `version` | `string` (`"3.4.0"`) |
| `latencyMs` | `number | null` — `SELECT 1` round-trip (ms) |
| `seeded` | `boolean` — `SELECT * FROM users LIMIT 1` > 0 |
| `pool` | `{ totalCount, idleCount, waitingCount, max:10 }` — from `pg.Pool` |
| `timestamp` | `string` ISO |
| `error?` | `string` — set only when `ok:false` |

**Response 200**:

```json
{
  "ok": true,
  "version": "3.4.0",
  "latencyMs": 4,
  "seeded": true,
  "pool": { "totalCount": 2, "idleCount": 1, "waitingCount": 0, "max": 10 },
  "timestamp": "2026-09-21T02:53:00.000Z"
}
```

**Response 500** (DB down):

```json
{ "ok": false, "version":"3.4.0","latencyMs":null,"seeded":false,"pool":{...},"timestamp":"...","error":"connect ECONNREFUSED" }
```

**curl**:

```bash
curl http://localhost:3000/api/health | jq
# Docker healthcheck:
curl -f http://localhost:3000/api/health || exit 1
```

---

## `POST /api/seed`

**Files**: `src/app/api/seed/route.ts:8` + `src/db/seed.ts`

Idempotently populates all 15 tables. Called automatically by any read that finds an empty table, but the explicit POST is the operator entrypoint.

**Auth**: `SEED_SECRET` **must** be configured. Requests without the header, or with a
value that does not match (compared timing-safe), get `401`. If `SEED_SECRET` is unset
or empty the endpoint gets `503` — seeding is never left open by omission.
**Rate limit**: `seed:{ip} 3/min`.

| Header | Required | Description |
|--------|----------|-------------|
| `x-seed-secret` | ✅ | Must equal `SEED_SECRET` |

**Request**: empty body (any JSON ignored).

**Response 200** (already seeded or newly seeded):

```json
{ "success": true, "message": "Kinara database seeded successfully." }
```

**Response 401**:

```json
{ "success": false, "error": "Unauthorized: invalid or missing x-seed-secret" }
```

**Response 503** (no `SEED_SECRET` configured):

```json
{ "success": false, "error": "Seeding is disabled: SEED_SECRET is not configured." }
```

**Response 429** + `Retry-After`.

**`GET /api/seed`** — not an auth bypass. It is rejected with `401` like every other
seeding entrypoint; only `POST` with the secret can seed.

**curl**:

```bash
# with secret
curl -X POST http://localhost:3000/api/seed -H "x-seed-secret: kinara-seed-local-only" | jq

# missing / wrong secret -> 401
curl -X POST http://localhost:3000/api/seed | jq

# GET is also 401, not an open alternative
curl http://localhost:3000/api/seed | jq
```

**Idempotency**: `SELECT * FROM users LIMIT 1` guard in `seedDatabase()` (`src/db/seed.ts`). Concurrent calls safe (rate limit + guard). Data inserted: 5 users (citizen/creator/business/creator + a dedicated `kinara_admin`), 4 posts, 4 communities, 3 communityMembers, 5 marketplaceItems, 2 businesses, 3 messages, 3 jobs, 5 radar pins, 3 threads. Every seeded user gets `password_hash = bcrypt(SEED_PASSWORD)`; if `SEED_PASSWORD` is unset the hash is `NULL` and those accounts cannot log in.

---

## `POST /api/ai`

**File**: `src/app/api/ai/route.ts:129`

Sovereign AI — 10 actions, provider fallback: **OpenRouter → OpenAI → Stub**.

**Rate limit**: `ai:{ip} 20/min`.

### Zod `aiSchema` (`src/lib/validators.ts:24`):

```ts
aiSchema = z.object({
  action: z.enum(["rewrite","summarize","translate","sheng","professional","pitch","continue","emojis","price_check","copilot"]),
  text: z.string().max(5000).optional().default(""),
  context: z.any().optional(),
  targetLanguage: z.string().max(20).optional(),
})
```

| Field | Type | Notes |
|-------|------|-------|
| `action` | enum (required) | see action table |
| `text` | `string` max 5000 | source text / listing title / copilot query |
| `context` | `any` | optional extra (e.g. for `price_check`: `{ category, city, price }`) |
| `targetLanguage` | `string` max 20 | for `translate`: `swahili|yoruba|amharic|zulu|french|...` |

**Provider selection** (`src/lib/env.ts:64`): if `OPENROUTER_API_KEY` → `openrouter`, else if `OPENAI_API_KEY` → `openai`, else `stub`.  
Model: `env.AI_MODEL` default `openai/gpt-4o-mini`; free tier use `meta-llama/llama-3.1-8b:free`.

**Response 200**:

```json
{ "success": true, "action":"rewrite","result":"...","model":"openai/gpt-4o-mini" }
```

If stub: `"model":"Kinara Sovereign NLP v3.4 (Edge-Accelerated)"`.

**For `price_check`** the `result` is an **object** (parsed JSON):

```json
{
  "success": true,
  "action": "price_check",
  "result": {
    "verdict": "High Trust & Fair Value",
    "marketAverage": "KES 16,500",
    "confidenceScore": "99.4%",
    "riskFactor": "Near Zero (Kinara Biometric Escrow Enabled)",
    "summary": "Verified against 1,200 regional sales...",
    "advice": "Proceed with 1-click Kinara Escrow..."
  },
  "model": "..."
}
```

Raw LLM string fallback if JSON parse fails.

**Response 400**: `{ success:false, error:"Validation failed", details }`  
**Response 429**: `{ success:false, error:"Rate limit exceeded. Try again soon. (20/min)" }` + `Retry-After`.

**Action catalog**:

| `action` | `text` meaning | `targetLanguage`/`context` | Example `result` |
|----------|----------------|----------------------------|------------------|
| `rewrite` | prose | — | Africa doesn't follow standard playbooks... |
| `summarize` | long doc | — | `📌 Key Takeaways: • Core Thesis: ...` |
| `translate` | source | `targetLanguage` required for best | `[Kiswahili]: ...` |
| `sheng` | source | — | `Bana cheki hii: rada ni safi kuruka! ... 🔥🇰🇪` |
| `professional` | source | — | `Strategically, our objective is...` |
| `pitch` | idea | — | `With over 1.4B people ... $400B market ...` |
| `continue` | thought | — | Completed with M-Pesa/offline vector continuation |
| `emojis` | source | — | `✨ ... 🚀🌍🤝⚡` |
| `price_check` | listing title | optional `context` | object (see above) |
| `copilot` | user query | — | Answer about M-Pesa / Silicon Savannah / Lagos |

**curl**:

```bash
# Rewrite
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"rewrite","text":"Our platform enables local commerce at scale."}' | jq

# Translate to Swahili
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"translate","text":"Hello, welcome to Kinara","targetLanguage":"swahili"}' | jq

# Price check (listing)
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"price_check","text":"MacBook Pro 16 M3 Pro","context":{"category":"Electronics","price":215000}}' | jq

# Copilot
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"copilot","text":"How does Kinara escrow work with M-Pesa?"}' | jq

# Rate-limited (429) case returns Retry-After
```

---

## `GET /api/search?q&type`

**File**: `src/app/api/search/route.ts:12`

Universal search — single bar reaches 6 entities. Parallel `ILIKE` per entity, each try/catch-isolated.

**Rate limit**: `search:{ip} 30/min`.

**Query**:

| Param | Type | Validation |
|-------|------|------------|
| `q` | `string` 1–100 trim | Zod `querySchema`; `400` if empty/too long |
| `type` | enum `all|communities|products|businesses|jobs|people|posts` | `400` if invalid; default `all` |

**Behavior**:

- `shouldSearch(t)` — if `type===all`, all 6 fire; else only that one.
- `limitPerType`: `10` when `all` (to bound total 60), `20` when specific.
- `ILIKE %q%` patterns: communities (`name|tagline`), products (`title|description`), businesses (`name|headline`), jobs (`title|company`), posts (`content` orderBy `createdAt desc`), people (`name|handle`).
- Results shape: `{ results:{communities:[],products:[],businesses:[],jobs:[],posts:[],people:[]}, query,type,count }`. `count` = sum of lengths.

**Response 200**:

```json
{
  "results": {
    "communities": [{ "id":"silicon-savannah","name":"Silicon Savannah Innovators", ... }],
    "products": [{ "id":1,"title":"Handcrafted Rift Valley Saddle-Leather Weekender", ... }],
    "businesses": [],
    "jobs": [],
    "posts": [],
    "people": [{ "id":"usr_brian_mwangi","name":"Brian Mwangi", ... }]
  },
  "query": "savannah",
  "type": "all",
  "count": 2
}
```

**Response 400** (q/type invalid): `{ error, details }`  
**Response 429**: `search` rate limit.

**curl**:

```bash
curl "http://localhost:3000/api/search?q=savannah&type=all" | jq
curl "http://localhost:3000/api/search?q=nairobi&type=products" | jq
curl "http://localhost:3000/api/search?q=brian&type=people" | jq
# Invalid type
curl "http://localhost:3000/api/search?q=test&type=invalid"  # 400
curl "http://localhost:3000/api/search?q=&type=all"           # 400 (q required)
```

---

## `GET /api/posts`

**File**: `src/app/api/posts/route.ts:9`

Paginated feed — indexed by `category`, `city`, `pinned`, `createdAt`, `authorId`.

**Query**:

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `category` | `string` | none | `eq(posts.category)` when present and not `"all"` |
| `city` | `string` | none | `eq(posts.city)` when present and not `"all"` |
| `limit` | `int` 1–100 | `20` | clamped (`Math.min(...,100)`) |
| `offset` | `int` 0+ | `0` | |
| `cursor` | `string` numeric id | none | `sql` posts.id > cursor` (keyset) |

**Ordering**: `orderBy desc(posts.pinned), desc(posts.createdAt)` — pinned first.

**Auto-seed**: if `posts` table empty, `await seedDatabase()` then re-query.

**Response 200**:

```json
{
  "posts": [
    {
      "id": 1, "authorId":"usr_brian_mwangi","authorName":"Brian Mwangi","authorHandle":"brianmwangi",
      "authorAvatar":"https://...","authorTrust":98,"authorVerified":true,
      "content":"Why copy Silicon Valley...","category":"trending","city":"Nairobi",
      "likes":842,"commentsCount":2,"sharesCount":184,
      "mediaUrl":"https://...","mediaType":"image","tags":["SovereignTech","AfricanDesign"],
      "pinned":true,"createdAt":"2026-09-21T...","updatedAt":"2026-09-21T..."
    }
  ],
  "nextCursor": "4",
  "limit": 20, "offset": 0
}
```

`nextCursor` is last `id` when `result.length === limit`, else `null`.

**curl**:

```bash
curl "http://localhost:3000/api/posts?limit=20&category=trending&city=Nairobi" | jq
curl "http://localhost:3000/api/posts?cursor=2&limit=10" | jq
```

---

## `POST /api/posts`

**File**: `src/app/api/posts/route.ts:52`

Create a feed item. Author resolved via `getCurrentUserId()` + `users` lookup (denorm).

**Rate limit**: `posts:create:{ip} 10/min`.  
**Validation**: `postCreateSchema` (`src/lib/validators.ts:7`):

```ts
postCreateSchema = z.object({
  content:  z.string().min(1).max(2000).trim(),
  category: z.string().min(1).max(50).default("trending"),
  city:     z.string().min(1).max(50).default("Nairobi"),
  mediaUrl: z.string().url().optional().or(z.literal("")).nullable(),
  mediaType: z.enum(["text","image","video"]).default("text"),
  tags:    z.array(z.string().max(30)).max(10).optional().default([]),
  pinned:  z.boolean().optional().default(false),
})
```

**Request**:

```json
{
  "content": "New drop: Kishushe sisal cooperative just listed 40 tapestries",
  "category": "culture",
  "city": "Nairobi",
  "mediaUrl": "https://images.pexels.com/...",
  "mediaType": "image",
  "tags": ["Kinara","Craft"]
}
```

**Response 200** (success is `200` in code, not `201`):

```json
{ "post": { "id":5, "authorId":"usr_brian_mwangi", ... }, "success": true }
```

Tags default to `["Kinara","SovereignTech"]` if empty. Author fallback when `users` miss → Brian stub.

**Response 400**: `{ error:"Validation failed", details }`  
**Response 429**: rate limit + `Retry-After`.

**curl**:

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"content":"Test from curl — sovereign dispatch","category":"innovation","city":"Kigali","tags":["Test"]}' | jq
```

---

## `GET /api/posts/[id]/like`

**File**: `src/app/api/posts/[id]/like/route.ts:19`

Fetch likes list for a post. Public read, id must be positive integer.

**Params**: `id` must be integer `>0` (validated by `parsePostId`).

**Query**: `limit` 1–100 default 20, `offset` 0+.

**Logic**: verifies `posts` exists → `404` if not → `SELECT * FROM likes WHERE postId ORDER BY createdAt desc` → computes `likedByMe` via current page + explicit check.

**Response 200**:

```json
{
  "likes": [ { "id":1, "postId":2, "userId":"usr_brian_mwangi","createdAt":"..." } ],
  "count": 1,
  "totalLikes": 42,
  "postId": 2,
  "liked": true,
  "limit": 20, "offset": 0
}
```

**curl**:

```bash
curl http://localhost:3000/api/posts/1/like?limit=10 | jq
```

---

## `POST /api/posts/[id]/like`

**File**: `src/app/api/posts/[id]/like/route.ts:82`

Toggle like/unlike **transactionally** (atomic, race-safe).

**Auth**: ✅ required — `401 Unauthorized` if no `userId`.  
**Rate limit**: `like:{ip} 10/min`.

**Transactional logic** (`src/app/api/posts/[id]/like/route.ts:124`):

1. `SELECT * FROM likes WHERE postId AND userId LIMIT 1`.
2. If exists → `DELETE` + `UPDATE posts SET likes = GREATEST(likes-1,0)` → `{ liked:false, likes }`.
3. Else → `INSERT likes` (catch `23505` unique violation with race message sniff) → `UPDATE posts SET likes=likes+1` → `{ liked:true, likes }`.
4. On unique violation during insert: treat as race, `DELETE` + decrement → return `liked:false`.
5. Outer unique catch → `409 { error:"Concurrent like conflict, please retry" }`.

**Request**: empty body.

**Response 200**:

```json
{ "liked": true, "likes": 43 }
# or
{ "liked": false, "likes": 42 }
```

**Errors**: `400 invalid id`, `401 unauthorized`, `404 post not found`, `409 concurrent conflict`, `429 rate limit`, `500`.

**curl**:

```bash
curl -X POST http://localhost:3000/api/posts/2/like | jq
# Toggle back
curl -X POST http://localhost:3000/api/posts/2/like | jq
```

---

## `GET /api/posts/[id]/comments`

**File**: `src/app/api/posts/[id]/comments/route.ts:21`

Paginated comments (desc by `createdAt`).

**Params**: `id` numeric `>0`.  
**Query**: `limit` 1–100 default 20, `offset` 0+.

**Response 200**:

```json
{
  "comments": [
    { "id":1,"postId":2,"authorId":"usr_amina_odhiambo","authorName":"Amina Odhiambo", "authorAvatar":"...", "content":"Edge sync in Turkana is ...","createdAt":"..." }
  ],
  "count": 1,
  "totalComments": 3,
  "postId": 2,
  "limit":20,"offset":0
}
```

**curl**:

```bash
curl http://localhost:3000/api/posts/2/comments | jq
```

---

## `POST /api/posts/[id]/comments`

**File**: `src/app/api/posts/[id]/comments/route.ts:68`

Create comment — transactional insert + `commentsCount++`.

**Auth**: ✅ required.  
**Rate limit**: `comments:{ip} 20/min`.

**Zod** (`commentCreateSchema`): `{ content: string 1..1000 trim }`.

**Transactional** (`src/app/api/posts/[id]/comments/route.ts:129`):

```ts
db.transaction(async (tx) => {
  const [newComment] = await tx.insert(comments).values({ postId, authorId, authorName, authorAvatar, content }).returning();
  const [updatedPost] = await tx.update(posts).set({ commentsCount: sql`commentsCount+1`, updatedAt: new Date() }).where(eq(posts.id, postId)).returning();
  return { comment: newComment, post: updatedPost };
})
```

**Request**:

```json
{ "content": "Sovereign edge sync is brilliant — what vector store are you using for local RAG?" }
```

**Response 200**:

```json
{ "comment": { "id": 10, "postId":2, ... }, "success": true, "commentsCount": 4 }
```

**Errors**: `400 invalid id / validation`, `401`, `404 post not found`, `429`.

**curl**:

```bash
curl -X POST http://localhost:3000/api/posts/2/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Amazing build — where can I join the Nairobi testnet?"}' | jq
```

---

## `GET /api/communities`

**File**: `src/app/api/communities/route.ts:18`

List communities with index-aware filtering + auto-seed.

**Query + Zod**:

```ts
communitiesQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
```

- `category` → `ilike(communities.category, %category%)` when not `"all"`.
- `q` → `or(ilike(name, %q%), ilike(tagline,…), ilike(city,…), ilike(category,…), ilike(description,…))`.
- Combined with `and(...)` when both present.

**Rate limit**: `communities:get:{ip} 30/min`.

**Response 200**:

```json
{
  "success": true,
  "data": [ { "id":"silicon-savannah","slug":"silicon-savannah","name":"Silicon Savannah Innovators", ... } ],
  "communities": [ /* same as data (compat) */ ],
  "limit":20,"offset":0,"count":4
}
```

**curl**:

```bash
curl "http://localhost:3000/api/communities?category=Tech&q=savannah" | jq
curl "http://localhost:3000/api/communities?q=kigali&limit=5" | jq
```

---

## `GET /api/communities/[slug]`

**File**: `src/app/api/communities/[slug]/route.ts:18`

Fetch single community by slug (validated `^[a-z0-9-]+$` 1–100).

**Response 200**:

```json
{ "community": { "id":"silicon-savannah","slug":"silicon-savannah","membersCount":3420,"activeVoice":true,... } }
```

**Response 400**: invalid slug.  
**Response 404**: not found.

**curl**:

```bash
curl http://localhost:3000/api/communities/silicon-savannah | jq
```

---

## `POST /api/communities/[slug]`

**File**: `src/app/api/communities/[slug]/route.ts:42`

Idempotent join / leave — transactional membership + atomic `membersCount`.

**Auth**: ✅ required.  
**Rate limit**: `communities:join:{ip} 20/min`.

**Request**:

```json
{ "action": "join" }    // or "leave" — default "join" when omitted
```

Zod: `actionSchema = z.enum(["join","leave"])`, `slugSchema = z.string().regex(/^[a-z0-9-]+$/)`.

**Logic**:

- `join` when already member → idempotent `200 { joined:true, membersCount, message:"Already a member" }`.
- `join` new → `tx.insert(communityMembers)` (catch `23505` → treat as race + return current count) → `tx.update(communities) membersCount+1` → return `joined:true`.
- `leave` when not member → `200 { joined:false, message:"Not a member" }`.
- `leave` new → `tx.delete(communityMembers) where both` → `update membersCount=GREATEST(-1,0)` → return `joined:false`.

**Response 200**:

```json
{ "joined": true, "membersCount": 3421, "success": true }
{ "joined": false, "membersCount": 3420, "success": true }
```

**Errors**: `400 slug/action invalid`, `401`, `404 community not found`, `409 race`, `429`.

**curl**:

```bash
curl -X POST http://localhost:3000/api/communities/silicon-savannah \
  -H "Content-Type: application/json" \
  -d '{"action":"join"}' | jq

curl -X POST http://localhost:3000/api/communities/silicon-savannah \
  -H "Content-Type: application/json" \
  -d '{"action":"leave"}' | jq
```

---

## `GET /api/marketplace`

**File**: `src/app/api/marketplace/route.ts:21`

List escrow-secured listings.

**Zod**:

```ts
marketplaceQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
```

- `category !== "all"` → `eq(category)`.
- `city !== "all"` → `eq(city)`.
- `maxPrice` → `lte(price, maxPrice)`.
- Order: `featured desc, createdAt desc`.

**Rate limit**: `marketplace:get:{ip} 30/min`. Auto-seeds if empty.

**Response 200**:

```json
{
  "success": true,
  "data": [ { "id":1,"title":"Handcrafted Rift Valley Saddle-Leather Weekender","price":14500,"currency":"KES","category":"Craft & Fashion","city":"Nairobi","distanceKm":"1.2","featured":true,... } ],
  "items": [ /* same */ ],
  "limit":20,"offset":0,"count":5
}
```

**curl**:

```bash
curl "http://localhost:3000/api/marketplace?limit=10&city=Nairobi&category=Craft%20%26%20Fashion" | jq
curl "http://localhost:3000/api/marketplace?maxPrice=20000&limit=5" | jq
```

---

## `POST /api/marketplace`

**File**: `src/app/api/marketplace/route.ts:103`

Create a listing — seller resolved via `getCurrentUserId()` + users fallback.

**Rate limit**: `marketplace:create:{ip} 10/min`.

**Zod** (`src/lib/validators.ts:31`):

```ts
marketplaceCreateSchema = z.object({
  title:       z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  price:      z.coerce.number().int().positive().max(10_000_000),
  category:   z.string().min(1).max(50),
  image:      z.string().url().optional(),
  city:       z.string().min(1).max(50).default("Nairobi"),
  neighborhood: z.string().min(1).max(100).default("Kilimani"),
  currency:   z.string().max(10).default("KES"),
})
```

Extra body fields honored (not in schema): `tags[]`, `deliverySpeed`, `distanceKm`.

**Request**:

```json
{
  "title":"Inziza Sisal Tapestry — 2026 Drop",
  "description":"Sweetgrass + tea-dyed, banana bark accent, emerald/ochre geometry.",
  "price": 10800,
  "category":"Art & Decor",
  "city":"Nairobi","neighborhood":"Lavington"
}
```

**Response 201**:

```json
{ "success": true, "data": { "id":6, "title":"...", "aiPriceEstimate":"Fair Value: KES 11,664 (Verified competitive)", ... }, "item": { ... } }
```

**curl**:

```bash
curl -X POST http://localhost:3000/api/marketplace \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Kitenge Double Wrap","description":"Hand-printed cotton kitenge, 6 yards, pre-washed.","price":3200,"category":"Craft & Fashion","city":"Nairobi"}' | jq
```

---

## `POST /api/marketplace/[id]/offer`

**File**: `src/app/api/marketplace/[id]/offer/route.ts:11`

Escrow offer — the trust primitive. Creates `escrowTransactions` + companion `messages` row atomically.

**Rate limit**: `marketplace:offer:{ip} 10/min`.

**Zod** (`src/lib/validators.ts:49`):

```ts
offerSchema = z.object({
  offerPrice: z.coerce.number().int().positive().optional(),
  note:       z.string().max(500).optional(),
  paymentRail: z.enum(["mpesa","momo","card","bank"]).optional().default("mpesa"),
})
```

**Params**: `id` must be parseable integer.

**Flow**:

1. `SELECT marketplaceItems WHERE id`.
2. `amount = offerPrice ?? item.price`.
3. `escrowRef = ESC-{randomUUID()}`.
4. `db.transaction(async(tx)=> insert escrowTransactions{ itemId, buyerId, sellerId, amount, currency, status:"held", paymentRail, escrowRef, metadata:{itemTitle,price,currency,status:"Escrow Held in Vault",seller,deliveryETA,note} } + insert messages{ threadId:"th_seller_{itemId}", senderId:buyerId, senderName/Avatar, senderRole:"Buyer", text:"Escrow Offer Locked: …", type:"offer", metadata:{...escrowRef,escrowId} })`.
5. Transaction fallback to sequential inserts if `db.transaction` helper throws.

**Request**:

```json
{ "offerPrice": 14000, "note": "Can collect in Kilimani at 3pm?", "paymentRail": "mpesa" }
# or minimal: { "paymentRail":"mpesa" } → uses listing price
```

**Response 200**:

```json
{
  "success": true,
  "data": { "escrowRef":"ESC-...","escrowId":"uuid","status":"held" },
  "escrowRef":"ESC-...","escrowId":"uuid","status":"held","amount":14000,"currency":"KES"
}
```

**Errors**: `400 invalid id / validation`, `404 item not found`, `429`, `500`.

**curl**:

```bash
curl -X POST http://localhost:3000/api/marketplace/1/offer \
  -H "Content-Type: application/json" \
  -d '{"offerPrice":14000,"note":"Love the brass buckles — escrow please","paymentRail":"mpesa"}' | jq
```

---

## `GET /api/businesses`

**File**: `src/app/api/businesses/route.ts:19`

List hybrid website+storefront profiles.

**Zod**:

```ts
businessesQuerySchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
```

- `city` → `ilike(%city%)`.
- `category` → `ilike(%category%)`.
- `q` → `or(ilike(name), ilike(category), ilike(city), ilike(headline), ilike(bio))`.
- All `and(...)` when multiple.

**Rate limit**: `businesses:get:{ip} 30/min`.

**Response 200**:

```json
{
  "success": true,
  "data": [{ "id":"biz_ikigai_nairobi","name":"Ikigai Artisan Work Lounge & Roastery","category":"Creative Hub & Specialty Cafe","city":"Nairobi","rating":"4.96","verified":true,"services":[{"name":"Day Pass + Single-Origin Coffee","price":"KES 1,500 / day"}],... }],
  "businesses": [ /* same */ ],
  "limit":20,"offset":0,"count":2
}
```

**curl**:

```bash
curl "http://localhost:3000/api/businesses?city=Nairobi&q=roastery&limit=5" | jq
curl "http://localhost:3000/api/businesses?category=Creative&city=Nairobi" | jq
```

---

## `POST /api/businesses/[id]/book`

**File**: `src/app/api/businesses/[id]/book/route.ts:11`

Book an appointment / service at a business.

**Rate limit**: `businesses:book:{ip} 10/min`.

**Zod** (`src/lib/validators.ts:42`):

```ts
bookingSchema = z.object({
  serviceName: z.string().min(1).max(200),
  date:        z.string().min(1).max(50),
  timeSlot:    z.string().min(1).max(50),
  notes:       z.string().max(500).optional(),
})
```

**Logic**: verifies `business` exists → `bookingRef = BK-{UUID.slice(0,8).toUpperCase()}` + `id = randomUUID()` → `INSERT bookings{ businessId, userId, serviceName, date, timeSlot, notes, status:"confirmed", bookingRef }`.

**Request**:

```json
{ "serviceName": "Day Pass + Single-Origin Coffee", "date": "2026-09-24", "timeSlot": "10:00 AM - 1:00 PM", "notes": "Need quiet pod if available" }
```

**Response 201**:

```json
{
  "success": true,
  "data": { "bookingRef":"BK-3F9A11C2", "booking": { "id":"uuid","businessId":"biz_ikigai_nairobi","status":"confirmed", ... } },
  "bookingRef":"BK-3F9A11C2","booking":{...},"businessName":"Ikigai Artisan Work Lounge & Roastery"
}
```

**curl**:

```bash
curl -X POST http://localhost:3000/api/businesses/biz_ikigai_nairobi/book \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"Private Acoustic Sound Pod (2 hrs)","date":"2026-09-25","timeSlot":"14:00 - 16:00"}' | jq
```

---

## `GET /api/messages`

**File**: `src/app/api/messages/route.ts:26`

Fetch thread messages chronologically.

**Query + Zod**:

```ts
paginationSchema: { limit:1..100 default20, offset 0+ }
threadIdSchema: z.string().optional(1..100)
```

When `threadId` present: `WHERE threadId=...`. When absent: all messages (backward compat for `page.tsx` bare fetch). Sorted `asc(createdAt)`.

**Rate limit**: `messages:get:{ip} 30/min`. Auto-seeds if empty. `threadId` validated with `z.string().min(1).max(100)` when present.

**Response 200**:

```json
{ "success":true,"messages":[{ "id":1,"threadId":"th_folake","senderName":"Folake Adebayo","text":"...","isMe":false,"type":"text","metadata":null}],"limit":20,"offset":0,"count":3 }
```

**curl**:

```bash
curl "http://localhost:3000/api/messages?threadId=th_folake&limit=20" | jq
curl "http://localhost:3000/api/messages?limit=10&offset=0" | jq
```

---

## `POST /api/messages`

**File**: `src/app/api/messages/route.ts:101`

Send a message. Upserts `threads` if missing, updates `lastMessageAt`.

**Rate limit**: `messages:post:{ip} 30/min`.

**Zod**:

```ts
messageCreateSchema = z.object({
  threadId: z.string().min(1).max(100),
  text: z.string().max(5000).optional(),
  type: z.enum(["text","voice","offer","poll"]).default("text"),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
})
```

- `type==="text"` requires `text` non-empty (else `400`).
- Non-text fallback text: `"Voice dispatch"` / `"Offer"` / `"Attachment"`.
- Sender resolved via `getCurrentUserId()` → `users` → `senderName/Avatar/Role` (fallback Brian).
- Thread upsert: `INSERT threads {id, participants:[senderId], type:"direct"} ON CONFLICT DO NOTHING` + fallback `SELECT` then insert; then `UPDATE threads SET lastMessageAt=now()`.

**Request**:

```json
{ "threadId":"th_folake","text":"Review done — check the vault flow?","type":"text" }
{ "threadId":"th_zuri_seller","text":"voice","type":"voice","metadata":{ "duration":"0:15","waveform":[40,65,80,50] } }
```

**Response 200**:

```json
{ "message": { "id":4,"threadId":"th_folake","senderName":"Brian Mwangi","text":"Review done","isMe":true,"type":"text", ... }, "success": true }
```

**curl**:

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"threadId":"th_folake","text":"Habari Folake — corridor audit complete"}' | jq
```

---

## `GET /api/jobs`

**File**: `src/app/api/jobs/route.ts:22`

List jobs with index-aware filters.

**Zod**:

```ts
paginationSchema: { limit 1..100 default20, offset 0+ }
querySchema: { category?.max100, location?.max100, q?.max100 }
```

- `category !== "all"` → `eq(jobs.category, category)` (indexed).
- `location !== "all"` → `ilike(jobs.location, %location%)`.
- `q` → `or(ilike(title,%q%), ilike(company,%q%), ilike(category,%q%))`.

Order: `desc(postedAt)`.

**Rate limit**: `jobs:get:{ip} 30/min`.

**Response 200**:

```json
{ "success":true,"jobs":[{ "id":1,"title":"Lead Design Systems Architect","company":"PayAfrica Technologies","location":"Nairobi (Kilimani) / Remote Pan-Africa","type":"Full-Time","salary":"KES 380,000 - 520,000 / mo","category":"Design & UX","tags":["Design Systems","Figma Tokens"], ... }], "limit":20,"offset":0,"count":3 }
```

**curl**:

```bash
curl "http://localhost:3000/api/jobs?category=Engineering&location=Kigali&limit=10" | jq
curl "http://localhost:3000/api/jobs?q=Rust&limit=5" | jq
```

---

## `GET /api/jobs/[id]/apply`

**File**: `src/app/api/jobs/[id]/apply/route.ts:116`

List applications for a job (desc `createdAt`).

**Params**: `id` parseable integer.  
**Rate limit**: `jobs:apply:get:{ip} 30/min`.  
**Query**: `limit 1..100 default20`, `offset 0+`.

**Response 200**:

```json
{ "success":true,"jobId":2,"applications":[{ "id":1,"jobId":2,"applicantId":"usr_brian_mwangi","status":"pending","coverNote":"...","createdAt":"..." }], "limit":20,"offset":0,"count":1 }
```

**curl**:

```bash
curl http://localhost:3000/api/jobs/2/apply?limit=10 | jq
```

---

## `POST /api/jobs/[id]/apply`

**File**: `src/app/api/jobs/[id]/apply/route.ts:20`

Apply to a job — unique `(jobId, applicantId)` guarded.

**Auth**: ✅ required.  
**Rate limit**: `jobs:apply:{ip} 5/min` (tightest — spam-sensitive).

**Zod**:

```ts
applySchema = z.object({ coverNote: z.string().max(2000).optional().nullable() })
```

**Logic**:

- Validates `jobId` is integer.
- Checks `users` exists for applicant (warns but still allows — seed covers).
- Verifies `jobs` exists → `404`.
- Checks existing application (`jobApplications where jobId+applicantId`) → `409 { success:false, error:"Already applied to this job", application }`.
- `INSERT jobApplications{ jobId, applicantId, coverNote, status:"pending" }` → catch `23505` (already applied race) → fetch existing → `409`.
- Else `201 { success:true, application }`.

**Request**:

```json
{ "coverNote": "Sovereign systems architect — 5y Rust/WASM, offline-first edge, interested in distributed DB role." }
# or empty {}
```

**Response 201**:

```json
{ "success": true, "application": { "id": 2, "jobId":2,"applicantId":"usr_brian_mwangi","status":"pending","coverNote":"...","createdAt":"..." } }
```

**Response 409** (already applied):

```json
{ "success": false, "error":"Already applied to this job","application":{...} }
```

**curl**:

```bash
curl -X POST http://localhost:3000/api/jobs/2/apply \
  -H "Content-Type: application/json" \
  -d '{"coverNote":"WASM + offline engine background, excited for this."}' | jq

# Duplicate → 409
curl -X POST http://localhost:3000/api/jobs/2/apply -H "Content-Type: application/json" -d '{}'
```

---

## `GET /api/radar`

**File**: `src/app/api/radar/route.ts:19`

Load proximity pins.

**Zod**:

```ts
radarTypeEnum = z.enum(["friend","business","event","deal","listing","service"])
paginationSchema: { limit 1..100 default20, offset 0+ }
```

| Param | Type |
|-------|------|
| `type` | `string` — must be one of six; `"all"` skips filter. Validated `toLowerCase()` |
| `city` | `string` — `eq(localRadar.city)` |
| `limit/offset` | pagination |

**Rate limit**: `radar:{ip} 30/min`. Auto-seeds if empty.

**Response 200**:

```json
{
  "success":true,
  "data":[{ "id":1,"type":"friend","name":"Amina Odhiambo","city":"Nairobi","neighborhood":"Kilimani","lat":"-1.2921","lng":"36.7850","distance":"0.4 km away","distanceKm":"0.4","details":"Working from Java House...","status":"Active Now","createdAt":"..." }],
  "radar":[ /* same */ ],"limit":20,"offset":0,"count":5
}
```

**curl**:

```bash
curl "http://localhost:3000/api/radar?type=friend&city=Nairobi&limit=5" | jq
curl "http://localhost:3000/api/radar?city=Nairobi" | jq
```

---

## `GET /api/user`

**File**: `src/app/api/user/route.ts`

Read sovereign profile.

**Response 200**:

```json
{ "user": { "id":"usr_brian_mwangi","name":"Brian Mwangi","handle":"brianmwangi","avatar":"...","role":"citizen","location":"Nairobi, Kenya • Kilimani Hub","trustScore":98,"verified":true, ... } }
```

Supports `GET` returning `{ user }` where `user` mirrors `users` row with `preferences`.

---

## `PATCH /api/user`

**File**: `src/app/api/user/route.ts`

Update own profile fields. Uses sovereign `userId`.

**Zod** (`src/lib/validators.ts:17`):

```ts
userPatchSchema = z.object({
  bio:      z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  name:     z.string().max(100).optional(),
})
```

`role` is **not** accepted. It used to be, which let any signed-in user PATCH
`{"role":"admin"}` and pass `requireAdmin()`. It is now stripped from the schema, so
such a body fails validation with `400` and never reaches the `UPDATE` — the stored
role is untouched.

Only provided fields are updated (`SET` via drizzle). Empty body `400`.

**Request**:

```json
{ "bio": "Building sovereign edge systems across the Rift Valley." }
```

**Response 200**:

```json
{ "user": { "id":"usr_brian_mwangi","bio":"Building...","role":"citizen","updatedAt":"..." }, "success":true }
```

**Response 400** for a privilege-escalation attempt:

```json
{ "success": false, "error": "Validation failed", "details": { "role": ["Invalid input"] } }
```

**curl**:

```bash
curl -X PATCH http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{"bio":"New bio — sovereign update"}' | jq
```

---

## `/api/auth/[...nextauth]`

**File**: `src/app/api/auth/[...nextauth]/route.ts`

Auth.js handlers (NextAuth 5 beta). Handled via `handlers` export in `src/lib/auth.ts`. Credentials provider only.

- `POST /api/auth/callback/credentials` — sign-in
- `GET /api/auth/session` — current session
- `POST /api/auth/signout` — sign-out

See `ARCHITECTURE.md` §6 for flow and env.

---

## Rate Limit Summary

| Key prefix | Limit | Window | Routes |
|------------|-------|--------|--------|
| `seed` | 3 | 60s | `POST /api/seed` / `GET /api/seed` |
| `login:handle` | 10 | 15 min | `POST /api/auth/callback/credentials` — counted on **failed** sign-ins only |
| `login:ip` | 30 | 15 min | `POST /api/auth/callback/credentials` — counted on **failed** sign-ins only |
| `ai` | 20 | 60s | `POST /api/ai` |
| `search` | 30 | 60s | `GET /api/search` |
| `posts:create` | 10 | 60s | `POST /api/posts` |
| `like` | 10 | 60s | `POST /api/posts/[id]/like` |
| `comments` | 20 | 60s | `POST /api/posts/[id]/comments` |
| `communities:get` | 30 | 60s | `GET /api/communities` |
| `communities:join` | 20 | 60s | `POST /api/communities/[slug]` |
| `marketplace:get` | 30 | 60s | `GET /api/marketplace` |
| `marketplace:create` | 10 | 60s | `POST /api/marketplace` |
| `marketplace:offer` | 10 | 60s | `POST /api/marketplace/[id]/offer` |
| `businesses:get` | 30 | 60s | `GET /api/businesses` |
| `businesses:book` | 10 | 60s | `POST /api/businesses/[id]/book` |
| `messages:get` | 30 | 60s | `GET /api/messages` |
| `messages:post` | 30 | 60s | `POST /api/messages` |
| `jobs:get` | 30 | 60s | `GET /api/jobs` |
| `jobs:apply` | 5 | 60s | `POST /api/jobs/[id]/apply` |
| `jobs:apply:get` | 30 | 60s | `GET /api/jobs/[id]/apply` |
| `radar` | 30 | 60s | `GET /api/radar` |

All use `getClientIp(req)` → `x-vercel-forwarded-for[0] | x-forwarded-for[LAST hop] | x-real-ip | 127.0.0.1`.
The **last** XFF hop is used because it is appended by the proxy in front of the app;
reading the first hop let a client rotate the header per request and bypass every limit.

---

## Zod Schema Reference

**File**: `src/lib/validators.ts`

```ts
personaEnum          = z.enum(["citizen","creator","business","student","buyer"])
categoryEnum         = z.enum(["trending","innovation","culture","business","all"])
cityEnum             = z.enum(["Nairobi","Lagos","Kigali","Accra","Cape_Town","Addis_Ababa","Pan-African","all"])

// Feed
postCreateSchema     = { content 1..2000, category 1..50 default trending, city 1..50 default Nairobi,
                         mediaUrl url? | "", mediaType text|image|video default text, tags string[10], pinned bool }

// Profile
userPatchSchema      = { bio max500?, location max100?, name max100? }   // NO role — see /api/user

// AI
aiSchema             = { action 10-enum, text max5000 default "", context any?, targetLanguage max20? }

// Marketplace
marketplaceCreateSchema = { title 3..120, description 10..2000, price int positive ≤10M,
                            category 1..50, image url?, city 1..50 default Nairobi,
                            neighborhood 1..100 default Kilimani, currency max10 default KES }

// Business
bookingSchema        = { serviceName 1..200, date 1..50, timeSlot 1..50, notes max500? }

// Escrow
offerSchema          = { offerPrice int positive?, note max500?, paymentRail mpesa|momo|card|bank default mpesa }

// Pagination helper
paginationSchema     = { limit int 1..100 default20, cursor? 0+, offset? 0+ }

// Also in-route:
messageCreateSchema  = { threadId 1..100, text max5000?, type text|voice|offer|poll default text, metadata record? }
applySchema          = { coverNote max2000 nullable? }
commentCreateSchema  = { content 1..1000 trim }
actionSchema(join/leave), slugSchema (/^[a-z0-9-]+$/), radarTypeEnum, searchTypeEnum, etc.
```

**Validation pattern** (every handler):

```ts
const parsed = schema.safeParse(bodyOrQuery)
if (!parsed.success) return NextResponse.json(
  { success:false, error:"Validation failed", details: parsed.error.flatten() },
  { status: 400 }
)
```

---

## Testing the API (quick suite)

```bash
BASE=http://localhost:3000
# Health + seed
curl -s $BASE/api/health | jq .ok              # true
curl -s $BASE/api/posts?limit=2 | jq .posts[0].id
# AI stub
curl -s -X POST $BASE/api/ai -H "Content-Type: application/json" \
  -d '{"action":"emojis","text":"Habari"}' | jq .result
# Search
curl -s "$BASE/api/search?q=kinara&type=all" | jq .count
# Like toggle (like→unlike→like)
curl -s -X POST $BASE/api/posts/1/like | jq .liked
# Post comment
curl -s -X POST $BASE/api/posts/1/comments -H "Content-Type: application/json" \
  -d '{"content":"Curious about escrow rails"}' | jq .comment.id
# Community join + verify
curl -s -X POST $BASE/api/communities/silicon-savannah \
  -H "Content-Type: application/json" -d '{"action":"join"}' | jq
# Marketplace offer
curl -s -X POST $BASE/api/marketplace/1/offer \
  -H "Content-Type: application/json" -d '{"paymentRail":"mpesa"}' | jq .escrowRef
# Job apply
curl -s -X POST $BASE/api/jobs/1/apply \
  -H "Content-Type: application/json" -d '{"coverNote":"Test apply"}' | jq
# Radar
curl -s "$BASE/api/radar?city=Nairobi&limit=2" | jq .radar[0].type
```

See `ARCHITECTURE.md` for auth/AI/data flow diagrams, `SECURITY.md` for rate-limit & escrow integrity.

