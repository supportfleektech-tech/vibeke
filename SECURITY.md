# SECURITY — KINARA Sovereign Platform

> Threat model, hardening measures, operational guidance. Target posture: lightweight sovereign demo that degrades gracefully and is ready to harden for production without design changes.

---

## Table of Contents

- [1. Threat Summary](#1-threat-summary)
- [2. Authentication — Auth.js Credentials + JWT](#2-authentication--authjs-credentials--jwt)
- [3. Rate Limiting — In-Memory vs Upstash](#3-rate-limiting--in-memory-vs-upstash)
- [4. `POST /api/seed` Protection](#4-post-apiseed-protection)
- [5. Validation & Input Sanitization (Zod)](#5-validation--input-sanitization-zod)
- [6. HTTP Security Headers](#6-http-security-headers)
- [7. Leaked Secret / Token Rotation](#7-leaked-secret--token-rotation)
- [8. Escrow Integrity](#8-escrow-integrity)
- [9. Dependency & Supply Chain](#9-dependency--supply-chain)
- [10. Disclosure & Operations](#10-disclosure--operations)
- [11. Hardening Roadmap](#11-hardening-roadmap)

---

## 1. Threat Summary

| Threat | Current Mitigation | Residual Risk & Next |
|--------|-------------------|---------------------|
| Credential theft / brute force | Credentials via Auth.js JWT, rate-limit per IP on `ai/like/comments/seed/apply`, httpOnly session cookie | No password at all in demo (see §2). Prod must add bcrypt + lockout. |
| DoS (scraping / burst) | Per-route per-IP in-memory LRU rate limits (5–30/min) + `Retry-After` | Single-instance only — see §3 for distributed swap. |
| Injection (SQL / XSS) | Drizzle ORM param-safe queries; React escapes by default; Zod trim/max/URL validation; ` dangerouslySetInnerHTML` not used | Keep CSP tight; add `dompurify` if richer HTML rendering ever lands. |
| IDOR / authz | `getCurrentUserId()` check → `401` on protected routes; `communityMembers` / `jobApplications` unique constraints gate join/apply; escrow transaction verifies seller exists | Add explicit ownership checks for `PATCH /api/user` and `POST /api/businesses/[id]/book` verification. |
| Leakage of seed / secrets | Env-only (`DATABASE_URL`, `NEXTAUTH_SECRET`, keys); `.env*` gitignored; `SEED_SECRET` gate; `NEXT_PUBLIC_*` limited to Mapbox token | Rotate immediately if `ghp_*` exposed — see §7. |
| TLS / framing | `X-Frame-Options:DENY`, `X-Content-Type-Options:nosniff`, `Referrer-Policy`, `Permissions-Policy`; SSL when `NODE_ENV===production` via `pg.Pool ssl` | Add HSTS + full CSP (`frame-ancestors none`) — see §6. |
| Escrow tampering | Transaction on `escrowTransactions.insert + messages.insert`; `escrowRef unique`; `status` enum with vault metadata | Integrate real M-Pesa Daraja signing + webhook verification — see §8. |

---

## 2. Authentication — Auth.js Credentials + JWT

**File**: `src/lib/auth.ts` (+ `src/lib/get-user.ts`, `src/app/api/auth/[...nextauth]/route.ts`)

Current implementation is **sovereign demo**: single verified identity `usr_brian_mwangi` with no password store.

```ts
// src/lib/auth.ts:24 — authorize()
async authorize(credentials) {
  const parsed = credentialsSchema.safeParse(credentials)
  if (!parsed.success) return null
  const handle = (credentials as any)?.handle || "brianmwangi"
  return { id:"usr_brian_mwangi", name:"Brian Mwangi", email:"brian@kinara.ke",
           handle, image:"...", trustScore:98 } as any
}
```

**Config** (`src/lib/auth.ts:14`):

```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-kinara-32-chars-minimum-for-testing",
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [ Credentials({ ... }) ],
  callbacks: {
    async jwt({token,user}) { if(user){ token.id=user.id; token.handle=user.handle; token.trustScore=user.trustScore } return token },
    async session({session,token}) { if(token){ session.userId=token.id; session.handle=token.handle } return session },
  },
  pages: { signIn: "/api/auth/signin" },
})
```

**Pool SSL**: `src/db/index.ts:18` enables `ssl:{rejectUnauthorized:false}` only when `NODE_ENV===production` (needed for Neon/Supabase). Local dev skips TLS.

### Production swap

Replace `authorize` body with:

```ts
import bcrypt from "bcryptjs"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

const u = (await db.select().from(users).where(eq(users.handle, handle)).limit(1))[0]
if (!u || !u.passwordHash) return null
const ok = await bcrypt.compare(credentials.password, u.passwordHash)
if (!ok) return null
return { id:u.id, name:u.name, email: u.email, handle:u.handle, trustScore:u.trustScore, image:u.avatar }
```

Store `passwordHash` (`bcrypt 12`), never plaintext. Add columns `passwordHash text`, `emailVerified boolean`.

### Session

- `session.strategy:"jwt"` — stateless, no DB session table.
- Cookie: `next-auth.session-token` **httpOnly**, set via `handlers` integration; rotation tied to `NEXTAUTH_SECRET`.
- `getCurrentUserId()` (`src/lib/get-user.ts:3`) calls `auth()` and falls back to `"usr_brian_mwangi"` inside `try/catch` so public reads never 401. Transactional routes check for `!userId` → `401` explicitly (`like`, `comments`, `apply`, `join/leave`). Keep this split.

### Env

```
NEXTAUTH_SECRET=  ← 32+ random bytes — openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000  (or https Vercel URL)
```

If `NEXTAUTH_SECRET` leaks, rotate (see §7).

---

## 3. Rate Limiting — In-Memory vs Upstash

**File**: `src/lib/ratelimit.ts`

```ts
const store = new Map<Key, Entry>()   // key = route:ip, value {count, resetAt}
export function rateLimit(key:string, limit:number, windowMs:number): RateLimitResult
// cleanup every 5min via setInterval(...).unref()
export function getClientIp(req:Request): string {
  // x-forwarded-for[0] → x-real-ip → 127.0.0.1
}
```

Every handler uses it:

```ts
const ip = getClientIp(request)
const rl = rateLimit(`like:${ip}`, 10, 60_000)
if (!rl.success) return NextResponse.json(
  { error:"Rate limit ..." },
  { status:429, headers: { "Retry-After": String(Math.ceil((rl.reset-Date.now())/1000)) } }
)
```

Limits are detailed in `API.md#rate-limit-summary` (tightest is `jobs:apply 5/min`).

**Properties**:

- Zero dependency, O(1), isolated per route via namespaced key (`posts:create:${ip}`, `ai:${ip}`, etc).
- `unref()` so it doesn't keep the Node process alive during tests.
- Runs per-instance only — **not distributed**. On Vercel (multiple lambdas) or Docker replicas, one IP could bypass by hitting different instances.

**Upgrade to Upstash (multi-instance)** — environment `UPSTASH_REDIS_REST_URL/TOKEN` already validated in `src/lib/env.ts`:

```ts
// Example swap in src/lib/ratelimit.ts (future)
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! })
export const redisLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "60s") })
// Replace rateLimit() calls with await redisLimiter.limit(key)
```

Set `UPSTASH_REDIS_REST_URL/TOKEN` in Vercel env or Compose `app.environment`; serverless Redis works without running a Redis binary.

**Header hygiene**: behind a reverse proxy, the app trusts `X-Forwarded-For`. Ensure the proxy (Caddy/nginx/Vercel) strips client-injected `X-Forwarded-For` so an attacker can't spoof IP. Vercel already does; custom nginx must `proxy_set_header X-Forwarded-For $remote_addr;`.

---

## 4. `POST /api/seed` Protection

**File**: `src/app/api/seed/route.ts:10`

Seed is **write + idempotent** → needs guarding beyond rate limit.

```ts
function checkSeedSecret(request:Request): NextResponse|null {
  const seedSecret = process.env.SEED_SECRET
  if (seedSecret) {
    const provided = request.headers.get("x-seed-secret")
    if (!provided || provided !== seedSecret) return NextResponse.json(
      { success:false, error:"Unauthorized: invalid or missing x-seed-secret" }, { status:401 }
    )
  }
  return null
}
```

- When `SEED_SECRET` is set, **only** `POST /api/seed` enforces `x-seed-secret`; `GET /api/seed` is deprecated (logs `console.warn`).
- Rate limit: `seed:${ip} 3/min`.
- Idempotent gate: `SELECT * FROM users LIMIT 1` → only inserts when empty.

**Ops guidance**:

- In production, always set a random `SEED_SECRET` (e.g. `openssl rand -hex 32`) and keep it out of client bundles.
- Seed once after `drizzle-kit migrate` → `curl -X POST https://.../api/seed -H "x-seed-secret: $SEED_SECRET"`.
- Do not expose `SEED_SECRET` as `NEXT_PUBLIC_*`.

---

## 5. Validation & Input Sanitization (Zod)

**File**: `src/lib/validators.ts` + per-route inline schemas.

Every input is validated before it touches Drizzle:

- **String guards**: `.trim()` on content/bio/name, `.max(N)` on every free text, `.url()` on `mediaUrl/image`, `regex /^[a-z0-9-]+$/` on slug, `.min(1)` on required.
- **Coercion**: `z.coerce.number().int()` for `price/offerPrice/limit/offset` so `"20"` from `searchParams` becomes `20` safely.
- **Enum locks**: `personaEnum`, `action` enum (10 AI actions), `paymentRail`, radar type, search type — rejects typos → `400`.
- **SQL safety**: no string-interpolated SQL; Drizzle paramizes via `eq/and/ilike/lte/sql\`\``. `sql\`GREATEST(likes-1,0)\`` uses drizzle's tagged template, still parameterized.

**Pattern to follow for new endpoints**:

```ts
const schema = z.object({ title: z.string().min(3).max(120).trim(), price: z.coerce.number().int().positive().max(10_000_000) })
const parsed = schema.safeParse(body)
if (!parsed.success) return NextResponse.json(
  { error:"Validation failed", details: parsed.error.flatten() }, { status:400 }
)
```

**Escaping**:

- React escapes `{content}` by default — `PostCard` etc render with `text-sm` spans, not `dangerouslySetInnerHTML`.
- If you ever need richer content (Markdown), add `dompurify` on server (`src/lib/sanitize.ts`) and pass `purified` to the client.

---

## 6. HTTP Security Headers

**File**: `next.config.ts:16`

```ts
headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key:"X-Frame-Options", value:"DENY" },
      { key:"X-Content-Type-Options", value:"nosniff" },
      { key:"Referrer-Policy", value:"strict-origin-when-cross-origin" },
      { key:"Permissions-Policy", value:"camera=(), microphone=(), geolocation=(self)" },
    ],
  }]
}
```

| Header | Value | Defends |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Clickjacking — page cannot be framed |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Trims cross-origin referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Third-party cannot access cam/mic; geolocation scoped to app (for Leaflet user pin) |
| (next) `X-Powered-By` | removed | `poweredByHeader:false` |
| `compress` | `true` | gzip/brotli at edge |

**Recommended additions** for production hardening (add to `next.config.ts:headers()`):

```ts
// Strict Transport Security (only with HTTPS)
{ key:"Strict-Transport-Security", value:"max-age=63072000; includeSubDomains; preload" },
// Force framing denial for modern browsers also
{ key:"Content-Security-Policy", value:
  "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +   // Next needs unsafe-eval/inline for now; tighten via nonce when possible
  "style-src 'self' 'unsafe-inline' https://unpkg.com; " +  // Leaflet CSS
  "img-src 'self' https: data:; font-src 'self' https: data:; " +
  "connect-src 'self' https://api.openai.com https://openrouter.ai https://*.pexels.com; " +
  "frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
},
```

Test headers with: `curl -i http://localhost:3000 | grep -i "^x-"`.

---

## 7. Leaked Secret / Token Rotation

This applies to any credential that appears in logs, screenshots, or shell history — especially `GITHUB_TOKEN` (`ghp_*`), `DATABASE_URL`, `NEXTAUTH_SECRET`, or API keys.

### If you committed or posted a `ghp_*` token

> **GitHub fine-grained PATs (`ghp_…`) are irrecoverable once displayed by `gh feature-auth` / CLI output — even if `git history` doesn't show them.**

1. **Revoke & rotate immediately**: GitHub → Settings → Developer settings → Personal access tokens → revoke the token or regenerate via `gh auth refresh -h github.com -s repo`.
2. **Do not edit or fake old output** — rotate to a new token. If `git commit` contains it, add a new commit that removes it and then **history rewrite** (`git filter-repo --invert-paths` or `git rebase` + `push --force-with-lease`).
3. In app **never** log `process.env.*` — add to `.gitignore` (already present) and `.env.example` only shows placeholders.
4. Rotate `NEXTAUTH_SECRET` at same time: users will be signed out (JWTs invalid).

### General rotation steps

| Secret | Where set | How to rotate |
|--------|-----------|---------------|
| `NEXTAUTH_SECRET` | `.env.local`, Vercel env | `openssl rand -base64 32` → update env → redeploy. Existing JWTs drop. |
| `DATABASE_URL` | provider dashboard + Vercel env | Regenerate password in Neon/Supabase → update env → redeploy (connections drain). |
| `OPENROUTER_API_KEY` / `OPENAI_API_KEY` | OpenRouter / OpenAI dashboards | Revoke + create new → update Vercel env. |
| `SEED_SECRET` | env | Regenerate → update env; re-seed with new secret. |
| `UPSTASH_*` | Upstash console | Rotate token there → update env. |
| `ghp_*` | GitHub settings | See above. |
| `SENTRY_DSN` | Sentry org | Regenerate DSN key in Sentry → update env. |

**CI**: GitHub Actions will mask secrets marked as *Repository secret*; never `echo` raw secrets.

---

## 8. Escrow Integrity

**Tables/route**: `escrow_transactions` (`src/db/schema.ts:253`) + `src/app/api/marketplace/[id]/offer/route.ts:64`

`escrow_transactions` is the commerce trust rail:

| Column | Notes |
|--------|-------|
| `escrowRef` | `ESC-{randomUUID()}` unique — the user-facing ref surfaced in `messages.metadata.escrowRef`. |
| `status` | `held → delivered → released \| disputed \| cancelled`. No `UPDATE` endpoint yet — all transitions are future. |
| `metadata` | `{ itemTitle, price, currency, status:"Escrow Held in Vault", seller, deliveryETA, note }` — denorm so dispute review doesn't need join. |
| `amount, currency` | copies `item.price/currency` at offer time (not mutable). |
| `paymentRail` | validated enum `mpesa|momo|card|bank`. |

**Transactional guarantee**:

```ts
await db.transaction(async (tx) => {
  const [escrow] = await tx.insert(escrowTransactions).values({ ... }).returning()
  await tx.insert(messages).values({
    threadId:`th_seller_${item.id}`, senderId:buyerId, senderName, ...,
    text:`Escrow Offer Locked: ${currency} ${amount} for "${title}" ...`,
    type:"offer", metadata:{ ...escrowRef,escrowId }
  })
})
// fallback sequential path if db.transaction helper absent (src/app/api/marketplace/[id]/offer/route.ts:112)
```

**Hardening roadmap for real money**:

- Verify `amount` ≤ `item.price` or within seller's allowed discount window before insert.
- Sign Daraja / NIBSS payload with provider secret; record `paymentIntentId`; handle webhook `POST /api/escrow/webhook` with signature verification (e.g. `daraja` callback).
- Escrow `released` requires buyer confirmation (`POST /api/escrow/[ref]/release` with `buyerId` check) or timeout/auto-release.
- Dispute opens ticket + blocks `released`; emits ops log (`pino`).
- Add Postgres constraint `CHECK (status IN ('held','delivered','released','disputed','cancelled'))` and `FOREIGN KEY` with `ON DELETE CASCADE` already present.

---

## 9. Dependency & Supply Chain

- **Lockfile**: `pnpm-lock.yaml` pinned; CI runs `pnpm install --frozen-lockfile`.
- **Audits**: run `pnpm audit` (or `pnpm dlx audit`) regularly; address advisories before deploy.
- **Overrides**: none; add `pnpm.overrides` in `package.json` only for locked CVEs.
- **`pnpm-workspace.yaml` allowBuilds**: `esbuild`, `sharp`, `unrs-resolver` — vetted via `allowBuilds`.
- **`next` 16.2 + `react` 19.2 + `drizzle-orm` 0.45** are pinned exact, not `^`. Update intentionally.

---

## 10. Disclosure & Operations

- **Reporting**: open an issue or contact the repo owner with title `[SECURITY]`. For private reports, use GitHub *Private vulnerability reporting* (Security tab).
- **Logs**: `pino` logs on `instrumentation.ts` at `NEXT_RUNTIME==="nodejs"`; never log PII or raw `Authorization` headers. Scrub `password`, `DATABASE_URL`, `NEXTAUTH_SECRET`.
- **.gitignore**: `node_modules`, `.next/`, `.env*`, `.vercel`, `*.pem`, logs — never commit secrets or built artifacts.
- **Disaster recovery**: `DATABASE_URL` + `SEED_SECRET` + `NEXTAUTH_SECRET` + `OPENROUTER_API_KEY` in Vercel env dashboard or Hatch/1Password. Keep recovery doc in private vault, not in repo.

---

## 11. Hardening Roadmap

| Item | Status | When |
|------|--------|------|
| bcrypt + `passwordHash` on `users` | TODO | Before opening sign-up |
| Upstash/Redis sliding-window rate limiting | Ready (env present) | When second replica / Vercel skew > 1 instance |
| HSTS + full CSP headers | Draft in §6 | Add to `next.config.ts` |
| Sentry integration | Env present | Wire `SENTRY_DSN` + `instrumentation.ts` Sentry init |
| `pg_stat_statements` + slow-query logs | TODO | After prod traffic |
| Row-level security (RLS) if switching to Supabase direct queries | TODO | If exposing DB via REST |
| Escrow webhook handling + Daraja/NIBSS verification | TODO | When M-Pesa live |
| Media upload (`next/image` loader + signed URLs) | TODO | When artisans need self-serve uploads |
| Offline-first Service Worker | Designed, not implemented | When low-bandwidth mode → real offline cache |

*Security is a layer cake — this doc is the recipe. Pair with `API.md` (per-route rate limits), `DEPLOYMENT.md` (Docker/Vercel), and `.github/workflows/ci.yml` (lint/typecheck/test/build).*

