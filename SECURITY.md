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
| Credential theft / brute force | Credentials via Auth.js JWT; every login does `bcrypt.compare` against `users.password_hash`; a row with a `NULL` hash cannot log in; credentials + all write routes rate-limit per IP; no demo/admin identity bypasses verification; failed sign-ins are counted per handle (10/15min) and per IP (30/15min), and bcrypt never runs once a bucket is full — see §3 | Lockout is keyed on IP as well as handle, so an attacker who can supply an IP can deliberately lock a victim's handle (account-lockout DoS). Ship a captcha or email-verification unlock before facing the public internet. |
| DoS (scraping / burst) | Per-route per-IP in-memory LRU rate limits (5–30/min) + `Retry-After` | Single-instance only — see §3 for distributed swap. |
| Injection (SQL / XSS) | Drizzle ORM param-safe queries; React escapes by default; Zod trim/max/URL validation; ` dangerouslySetInnerHTML` not used | Keep CSP tight; add `dompurify` if richer HTML rendering ever lands. |
| IDOR / authz | `getCurrentUserId()` returns `null` when signed out → `401` (no hardcoded fallback identity). `GET/PATCH /api/user`, `messages`, `reports`, `admin/*` all gate on it; `messages` additionally scopes the query to threads the caller participates in and answers `404` (not `403`) for foreign thread ids; `communityMembers` / `jobApplications` unique constraints gate join/apply; escrow transaction verifies seller exists | Keep adding explicit ownership checks as new routes land — `requireAdmin()` in `src/lib/require-admin.ts` is the pattern for role-gated reads. |
| Leakage of seed / secrets | Env-only (`DATABASE_URL`, `NEXTAUTH_SECRET`, keys); `.env*` gitignored; `SEED_SECRET` gate with timing-safe compare (missing → 401, unset → 503, no `GET` bypass); known placeholder secrets are denylisted so they can never sign sessions; `NEXT_PUBLIC_*` limited to Mapbox token | Rotate immediately if `ghp_*` exposed — see §7. |
| TLS / framing | `X-Frame-Options:DENY`, `X-Content-Type-Options:nosniff`, `Referrer-Policy`, `Permissions-Policy`; `resolveSsl()` in `src/db/index.ts` — explicit `sslmode=` in `DATABASE_URL` wins, loopback/`db`/`localhost` stay plain, any other host is forced to TLS | Add HSTS + full CSP (`frame-ancestors none`) — see §6. |
| Escrow tampering | Transaction on `escrowTransactions.insert + messages.insert`; `escrowRef unique`; `status` enum with vault metadata | Integrate real M-Pesa Daraja signing + webhook verification — see §8. |

---

## 2. Authentication — Auth.js Credentials + JWT

**File**: `src/lib/auth.ts` (+ `src/lib/get-user.ts`, `src/app/api/auth/[...nextauth]/route.ts`)

Implementation is a real credentials check — there is **no demo identity and no
password-less path**. `authorize()` looks the handle up in Postgres and compares
against a stored bcrypt hash:

```ts
// src/lib/auth.ts — authorize()
const parsed = credentialsSchema.safeParse(credentials)   // handle 1..64, password 1..256
if (!parsed.success) return null

const rows = await db
  .select({ id, name, email, handle, avatar, trustScore, role, passwordHash })
  .from(users).where(eq(users.handle, parsed.data.handle)).limit(1)
const user = rows[0]
// A row with no hash (e.g. seeded without SEED_PASSWORD) can never sign in.
if (!user?.passwordHash) return null
if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null
```

**Config** (`src/lib/auth.ts`):

```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: resolveAuthSecret(),          // see "Secret policy" below
  session: { strategy: "jwt" },
  trustHost: true,                      // required — see note below
  providers: [ Credentials({ credentials: { handle, password }, authorize }) ],
  callbacks: {
    async jwt({token,user}) { if(user){ token.id=user.id; token.handle=user.handle; token.trustScore=user.trustScore } return token },
    async session({session,token}) { if(token){ session.userId=token.id; session.handle=token.handle } return session },
  },
  pages: { signIn: "/signin" },
})
```

### Secret policy

`resolveAuthSecret()` fails closed:

- `NEXTAUTH_SECRET` must be ≥32 chars **and** not one of the publicly-known
  placeholders in `KNOWN_INSECURE_SECRETS` (`change-me-in-production-generate-32chars-min`,
  `dev-secret-kinara-32-chars-minimum-for-testing`). These values are printed in
  `.env.example`, `docker-compose.yml` and older docs, so anyone who has read the repo
  could otherwise forge a session for any user.
- In production with a weak/absent secret the module **throws at boot** rather than
  silently signing with something guessable. `next build` is exempted via
  `NEXT_PHASE=phase-production-build` so the check becomes a runtime failure, not an
  unbuildable image.
- Dev/test get a random per-process key (`randomBytes(32)`), so dev sessions simply
  reset on restart instead of using a public constant.

### `trustHost: true`

`@auth/core`'s `assertConfig()` throws `UntrustedHost` for **every** request when
`trustHost` is false — there is no host comparison anywhere in the code. It is a hard
prerequisite for the library, not a hardening toggle, so setting it to `false` in
production disables authentication outright. Correctness instead depends on the
platform setting the `Host` header safely (Vercel, and any reverse proxy that
overwrites it, do). If you terminate TLS directly on Node without a proxy, do not
expose the port publicly.

### Identity lookup

- `getCurrentUserId()` (`src/lib/get-user.ts`) returns `Promise<string | null>`. It
  **never** falls back to a hardcoded user, so `!userId → 401` is a real gate for
  every protected route (`user`, `messages`, `posts`, `stories`, `marketplace`,
  `reports`, `admin/*`, …).
- `GET /api/user` without `?id=` requires a session; with `?id=` it returns the
  `publicUserColumns` projection. `passwordHash` and `email` are excluded from every
  public projection (`src/lib/user-columns.ts`).
- `requireAdmin()` (`src/lib/require-admin.ts`) is the role gate for `admin/*` and
  `reports/*`: `401` when signed out, `403` when the caller is not admin/moderator.
  A seeded `kinara_admin` / `kinara_admin` handle exists so the gate is reachable.
- `userPatchSchema` no longer contains `role`, so `PATCH /api/user {"role":"admin"}`
  fails validation (`400`) and never runs an `UPDATE`.

**Pool TLS**: `resolveSsl()` in `src/db/index.ts` — an explicit `sslmode=` in
`DATABASE_URL` always wins; loopback/`db`/`localhost`/`::1` stay plain (docker-compose
and CI); any other host is forced to TLS with `rejectUnauthorized:false`. The previous
`NODE_ENV === "production"` rule broke both docker-compose and CI by demanding SSL
against a plaintext socket.

### Session

- `session.strategy:"jwt"` — stateless, no DB session table.
- Cookie: `authjs.session-token` **httpOnly**, set via `handlers` integration; rotation tied to `NEXTAUTH_SECRET`.
- Sign-in UI lives at `/signin` (App Router page), not `/api/auth/signin`.
- Auth.js enforces CSRF on the credentials callback: a POST without the
  `csrfToken` from `GET /api/auth/csrf` fails with `MissingCSRF` and issues no session.

### Env

```
NEXTAUTH_SECRET=  ← 32+ random bytes — openssl rand -base64 48
NEXTAUTH_URL=http://localhost:3000  (or https Vercel URL)
```

If `NEXTAUTH_SECRET` leaks, rotate (see §7).

---

## 3. Rate Limiting — Upstash REST with in-memory fallback

**File**: `src/lib/ratelimit.ts`

```ts
export async function rateLimit(key, limit, windowMs): Promise<RateLimitResult>
// 1. Upstash REST /pipeline when UPSTASH_REDIS_REST_URL+TOKEN are set
// 2. any failure / not configured -> in-process Map fallback (never fails the request)

export function getClientIp(req: Request): string {
  // x-vercel-forwarded-for[0] -> x-forwarded-for[LAST hop] -> x-real-ip -> 127.0.0.1
}
```

Every handler `await`s it:

```ts
const ip = getClientIp(request)
const rl = await rateLimit(`like:${ip}`, 10, 60_000)
if (!rl.success) return NextResponse.json(
  { error:"Rate limit ..." },
  { status:429, headers: { "Retry-After": String(Math.ceil((rl.reset-Date.now())/1000)) } }
)
```

Limits are detailed in `API.md#rate-limit-summary` (tightest is `jobs:apply 5/min`).

**Distributed mode** — when both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
are set, the limiter issues one HTTP pipeline call per request against Upstash:
`SET key 0 PX <window> NX` (creates the window without refreshing a live one),
`INCR`, `PTTL`. `count > limit` → `success:false`, so the same limits hold across
serverless replicas and Docker scale-out. No Redis binary and no extra dependency.

**Failure mode**: any non-OK response, network error, auth failure, or malformed
payload is caught and the call falls back to the in-process store. A rate limiter
misconfiguration degrades protection, it does not take the site down.

**Header hygiene — read the LAST hop, not the first.** Proxies *append* the peer
address they accepted the connection from, so the last `X-Forwarded-For` entry is the
one written by the proxy directly in front of the app. The previous code read the
**first** entry, which is client-supplied: an attacker could rotate `X-Forwarded-For`
per request and walk through unlimited buckets, defeating every rate limit on the box.
`x-vercel-forwarded-for` (set by the edge, never forwarded from the client) takes
priority when present.

> Caveat: if the app is exposed directly with no proxy, *all* of these headers are
> attacker-controlled. Terminate TLS at a reverse proxy (or deploy on Vercel/Cloudflare)
> before relying on IP rate limiting.

**Properties**:

- O(1) per call, isolated per route via namespaced key (`posts:create:${ip}`, `ai:${ip}`, etc).
- Memory-store cleanup runs on an `unref()`d interval so it doesn't keep Node alive during tests.
- `src/lib/ratelimit.test.ts` covers window rollover, per-key isolation, Upstash
  responses, and the last-hop IP derivation.

---

### Login throttle — `src/lib/login-throttle.ts`

`/api/auth/*` is the raw NextAuth router, so **none of the per-route limits above
apply to sign-in**. `authorize()` in `src/lib/auth.ts` therefore runs every attempt
through `runLoginAttempt(handle, ip, verify)`:

| Bucket | Limit | Window |
|--------|-------|--------|
| `login:handle:<handle>` | 10 failures | 15 min |
| `login:ip:<ip>` | 30 failures | 15 min |

- The verifier (`bcrypt.compare`) is **never called** once either bucket is full, so
  a locked account costs an attacker no less work than an open one.
- Rejections are counted **whether or not the handle exists**. If unknown handles
  were skipped, a handle that never locks would itself be an enumeration oracle.
- Either bucket full → `authorize()` returns `null`. The response is the same
  generic `Invalid handle or password.` as any other failure, so the client cannot
  distinguish a locked account from a wrong password; only the server logs
  `[auth] sign-in refused for "<handle>" from <ip>: failure limit reached`.
- A successful sign-in clears **both** buckets for that handle and IP.
- Uses the same Upstash/in-memory split as the rest of §3, so the lockout holds
  across replicas once Redis is configured; a limiter outage degrades protection
  instead of taking sign-in down.

**Verified**: `src/lib/login-throttle.test.ts` covers both buckets, the
enumeration-oracle property, that the verifier is skipped once locked, and that a
valid password still fails while locked. The runtime suite in `/tmp/opencode/verify.sh`
locks a seeded account end to end and asserts that unrelated accounts from the same
IP still sign in.

---

## 4. `POST /api/seed` Protection

**File**: `src/app/api/seed/route.ts`

Seed is **write + idempotent** → needs guarding beyond rate limit, and it fails closed
rather than open-by-omission.

```ts
function checkSeedSecret(request: Request): NextResponse | null {
  const seedSecret = process.env.SEED_SECRET
  // Unset or empty -> seeding is disabled outright (503), not "allowed because
  // nobody configured a secret".
  if (!seedSecret) return NextResponse.json(
    { success:false, error:"Seeding is disabled: SEED_SECRET is not configured." }, { status:503 }
  )
  const provided = request.headers.get("x-seed-secret") ?? ""
  // Timing-safe: a plain !== leaks prefix information under load.
  const ok = provided.length === seedSecret.length &&
             timingSafeEqual(Buffer.from(provided), Buffer.from(seedSecret))
  if (!ok) return NextResponse.json(
    { success:false, error:"Unauthorized: invalid or missing x-seed-secret" }, { status:401 }
  )
  return null
}
```

- Both `POST` and `GET /api/seed` run the same gate — the old "GET is deprecated but
  still works without a secret" path was an authentication bypass and is gone.
- Rate limit: `seed:${ip} 3/min`.
- Idempotent gate: `SELECT * FROM users LIMIT 1` → only inserts when empty, guarded by
  a module-level in-flight promise so concurrent readers don't stampede.
- Production `ensureSeeded()` (the implicit auto-seed on empty tables) returns early
  unless `AUTO_SEED=true`, so an empty production DB fails loudly instead of being
  silently populated from demo fixtures.

**Ops guidance**:

- Always set a random `SEED_SECRET` (e.g. `openssl rand -hex 32`) and keep it out of client bundles.
- `SEED_PASSWORD` must also be set if you want the seeded accounts to be able to log in;
  it is bcrypt-hashed into `users.password_hash` and never stored or logged in plaintext.
- Seed once after `drizzle-kit migrate` → `curl -X POST https://.../api/seed -H "x-seed-secret: $SEED_SECRET"`.
- Do not expose `SEED_SECRET` or `SEED_PASSWORD` as `NEXT_PUBLIC_*`.

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
| Per-handle / per-IP credential lockout | Done — `src/lib/login-throttle.ts` | Before public launch, add captcha or email unlock (see §3 residual risk) |
| Sentry integration | Env present | Wire `SENTRY_DSN` + `instrumentation.ts` Sentry init |
| `pg_stat_statements` + slow-query logs | TODO | After prod traffic |
| Row-level security (RLS) if switching to Supabase direct queries | TODO | If exposing DB via REST |
| Escrow webhook handling + Daraja/NIBSS verification | TODO | When M-Pesa live |
| Media upload (`next/image` loader + signed URLs) | TODO | When artisans need self-serve uploads |
| Offline-first Service Worker | Designed, not implemented | When low-bandwidth mode → real offline cache |

*Security is a layer cake — this doc is the recipe. Pair with `API.md` (per-route rate limits), `DEPLOYMENT.md` (Docker/Vercel), and `.github/workflows/ci.yml` (lint/typecheck/test/build).*

