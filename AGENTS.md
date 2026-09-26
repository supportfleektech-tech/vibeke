# AGENTS.md

Instructions for AI agents. Human-facing conventions live in **`CONTRIBUTING.md`**
(branching, Conventional Commits, PR template, style) — follow them, don't duplicate
them here. Auth/secrets rationale: `SECURITY.md`. Routes and schemas: `API.md`.
Deploy: `DEPLOYMENT.md`.

Of the top-level docs, trust in this order: **the code** > `CONTRIBUTING.md` (workflow)
> `README.md` (setup) > `API.md` / `ARCHITECTURE.md` (reference). `ROADMAP.md` and
`follow-up-vibeke.md` are brainstorming/planning notes describing intent, not what is
implemented. `vybe-ke-latest-output.md` is an untracked session transcript that is not
part of the repo — do not treat it as a spec.

**Stack**: Next.js 16 App Router + React 19 · Drizzle ORM → Postgres 16 · Auth.js v5
(Credentials + JWT) · Tailwind 4 · Vitest · Playwright. Node 22 (`.nvmrc`), pnpm
(`pnpm-lock.yaml`). The root package *is* the web app; `apps/mobile` (Expo) is a
separate workspace package that nothing here depends on.

## Commands

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # quality gate order
pnpm lint          # eslint flat + next/core-web-vitals
pnpm typecheck     # tsc --noEmit — includes e2e/ (tsconfig has "**/*.ts")
pnpm test          # vitest — ONLY src/** (see Testing)
pnpm test:e2e      # playwright (see Testing for prerequisites)
```

- Run one test: `npx vitest run src/lib/ratelimit.test.ts`
- Run one spec: `npx playwright test e2e/auth.spec.ts`
- Single route/server check: `pnpm build && pnpm start`, then `GET /api/health`

**Do not run `pnpm format` as a gate.** Prettier is a dependency but there is no
`format:check`, and `prettier --check .` currently reports **112** files as
non-conforming. A `--write` run would bury a real diff in whitespace noise.
Formatting is its own separate PR.

Use the npm scripts, not a bare `next dev` / `next build`: they pin `--webpack`, while
`pnpm build:turbo` is the Turbopack opt-in. Invoking `next` directly skips those flags.

## Database — the env trap

**`drizzle-kit` does not read `.env.local`.** It only loads `.env` (which does not
exist here), so `db:migrate` / `db:push` fall through to the hardcoded fallback in
`drizzle.config.ts`:

```
postgresql://postgres:postgres@127.0.0.1:5432/kinara_db
```

On a machine where another project already owns 5432 this migrates **someone else's
database**. Always export the URL first:

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/kinara_db"
pnpm db:migrate
```

Next.js itself *does* read `.env.local` (so `pnpm dev` / `pnpm start` are fine
without an export). `playwright.config.ts` loads `.env.local` manually for the same
reason. Vitest does not load it — the unit tests don't need it.

- Schema change → edit `src/db/schema.ts`, then `pnpm db:generate`, then commit the
  new `drizzle/*.sql` **and** `drizzle/meta/*` (the journal tracks 4 migrations).
- **Resetting a database requires dropping both schemas.** Dropping only `public`
  leaves `drizzle.__drizzle_migrations` behind, after which `db:migrate` silently
  no-ops (0 rows, exit 0):

  ```sql
  DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;
  ```

- Seeding: `POST /api/seed` with header `x-seed-secret` (not a body field). There is
  **no default secret** — `.env.example` ships it empty, so unset `SEED_SECRET`
  answers `503` and a wrong value answers `401`. `GET /api/seed` is deprecated and
  does not bypass this.
- `SEED_PASSWORD` unset or under 8 chars → seeded accounts get no credential and
  **cannot sign in at all** (the seeder warns and continues).

## Testing

- Vitest: `environment: jsdom`, `globals: true`, `include: src/**/*.{test,spec}` —
  so **`pnpm test` never runs `e2e/`**. Tests still `import { describe, it, expect }
  from "vitest"` explicitly; follow that.
- E2E is not in CI. Before `pnpm test:e2e` you need a migrated **and seeded** database,
  `SEED_PASSWORD` set, and something listening on **`http://localhost:3000`**.
  Playwright reuses an existing server; otherwise it starts `pnpm dev --webpack`.
- `baseURL` must stay `localhost`, not `127.0.0.1` — an Auth.js cookie minted for one
  host is not sent to the other, and sign-in silently appears broken.
- `fullyParallel: false` in `playwright.config.ts` is deliberate: `auth.spec.ts` has a
  wrong-password case that increments the login throttle, and a later successful
  sign-in in the same run clears it. Reordering them locks the seeded account after
  enough reruns.

## Auth & API conventions

- **Fail closed, always.** `getCurrentUserId()` returns `null` when signed out — there
  is no demo/fallback identity, and you must not add one (it would make every 401
  branch unreachable). A signed-out visit to `/` lands on `/signin`, but that is a
  **client-side** `router.replace` after `GET /api/user` 401s — the response is 200, so
  assert on the final URL, not on a 3xx.
- Mutating route guard: `const userId = await getCurrentUserId(); if (!userId) return <401>`.
  Admin guard: `requireAdmin()` returns `{ok, response}` and you must `if (!auth.ok)
  return auth.response` — it builds the response so you cannot forget to short-circuit.
  401 = no session, 403 = no privilege — keep them distinct.
- `trustHost: true` in `src/lib/auth.ts` is a **prerequisite**, not a hardening knob:
  `@auth/core` rejects every request without it. Do not remove it to "tighten" auth.
- **Rate-limit every route.** 45 of 47 `route.ts` files call `rateLimit()`; only
  `auth/[...nextauth]` and `health` are exempt (sign-in has its own throttle in
  `src/lib/login-throttle.ts`, driven from `authorize()`).
- `getClientIp()` reads the **last** `X-Forwarded-For` hop. Changing it to the first
  re-opens unlimited bucket rotation — that was a real bug.
- `GET /api/search` is GET-only; a POST returns 405 and never reaches the limiter, so
  it cannot be used to test rate limiting.
- 11 routes call `ensureSeeded()`; it auto-seeds in dev but is **disabled in
  production unless `AUTO_SEED=true`**.

## Build & artifacts

- `next-pwa` writes `public/sw.js` (tracked) plus `public/workbox-*.js*` (gitignored)
  — all regenerated on every `pnpm build`.
- `next-pwa.d.ts` is a hand-written type shim; without it `tsc --noEmit` fails with
  TS7016 and `next build` aborts after a successful compile.
- `@sentry/nextjs` wraps the config; the deprecation warning on `withSentryConfig` at
  build time is known and harmless.

## CI

`.github/workflows/ci.yml` runs lint → typecheck → migrate → test → build, then an
**8-check smoke** against a live server: health, seed authz, anonymous 401s,
credential sign-in, admin/citizen authz, privilege-escalation rejection, rate limit,
credential lockout. Reproduce it locally by extracting the `run:` block of the
"Smoke test" step — but remember it needs `DATABASE_URL` exported (see above).
A green build does **not** mean E2E passed; that suite is local-only.
