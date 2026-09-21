# CONTRIBUTING — KINARA Sovereign Platform

Thank you for building with Kinara. This guide covers branching, commits, PRs, and review standards.

---

## 1. Getting Started

```bash
git clone <your-fork> premium-african-social-platform
cd premium-african-social-platform
nvm use            # reads .nvmrc → Node 22
corepack enable && corepack prepare pnpm@latest --activate
pnpm install
cp .env.example .env.local   # fill DATABASE_URL, NEXTAUTH_SECRET, etc.
docker compose up -d db      # start postgres
pnpm db:push                 # or pnpm db:migrate
pnpm dev                     # http://localhost:3000
```

Read in order before first PR: `README.md` → `ARCHITECTURE.md` → `DESIGN.md` → `API.md` → `SECURITY.md`.

---

## 2. Branching Strategy

We use trunk-based + feature branches off `main`.

| Branch pattern | Purpose |
|----------------|---------|
| `main` | Protected, deployable, CI green. Direct push disabled — PR only. |
| `feat/<slug>` | New feature (e.g. `feat/escrow-release-flow`, `feat/light-mode`) |
| `fix/<slug>` | Bug fix (e.g. `fix/radar-lat-precision`, `fix/search-people`) |
| `docs/<slug>` | Docs only (e.g. `docs/api-search-examples`) |
| `chore/<slug>` | Infra/tooling (e.g. `chore/dep-bump-next-16-3`) |
| `refactor/<slug>` | Pure refactor with no behavior change |
| `security/<slug>` | Sensitive security fix — coordinate privately, do not open public PR until patched |

**Lifecycle**:

```bash
git checkout main && git pull
git checkout -b feat/awesome-thing
# ... commits ...
git push -u origin feat/awesome-thing
# open PR via GitHub UI → CI must be green → review → squash merge to main
git checkout main && git pull && git branch -d feat/awesome-thing
```

- Keep branch behind `main` at most a few days — rebase regularly: `git fetch origin && git rebase origin/main`.
- Delete branch after merge. One PR per concern (keep diff < 400 lines where possible).

---

## 3. Conventional Commits

All commit messages **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types**:

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons (no logic) |
| `refactor` | Rewrite with same behavior |
| `perf` | Performance improvement |
| `test` | Adding/fixing tests |
| `build` | Build system or deps (Dockerfile, ci, pnpm) |
| `ci` | CI/workflow config |
| `chore` | Other tooling |
| `revert` | Revert prior commit |

**Scopes** (pick one, optional): `api`, `db`, `ui`, `auth`, `ai`, `marketplace`, `business`, `radar`, `search`, `docs`, `deploy`, `security`.

**Examples**:

```
feat(marketplace): add escrow release confirmation flow

Implements POST /api/escrow/[ref]/release with buyerId ownership check
and M-Pesa callback signature verification stub.

Refs: #42
```

```
fix(api): enforce 409 on concurrent community join race

Adds catch for pg code 23505 in transaction and returns idempotent 200
when race already joined.

Fixes #88
```

```
docs(security): harden token rotation guidance

Adds ghp_* revocation steps and NEXTAUTH_SECRET rotation checklist.
```

Rules:

- Lowercase, imperative, no trailing period: `feat: add ...` not `Feat: Added ...`.
- Header ≤ 72 chars; body wraps at 80.
- `BREAKING CHANGE:` footer when API/schema contract breaks.
- Reference issues with `Fixes #n` or `Refs: #n` at footer.

**Enforcement**: CI logs commit titles; PR title must be conventional as well (used for squash merge title and changelog).

---

## 4. Pull Requests

### 4.1 Template (paste into PR body)

```md
## Description
<!-- What & why — link follow-up-vibeke.md principle if relevant -->

## Type
- [ ] feat  - [ ] fix  - [ ] docs  - [ ] refactor  - [ ] test  - [ ] chore

## Changes
- <!-- bullet list of key changes + file paths with line numbers (`src/db/schema.ts:230`) -->

## How to test
<!-- steps: pnpm db:push, curl ... | jq, UI manual steps -->

## Screenshots / Recordings (if UI)
<!-- before/after -->

## Checklist
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (or added tests)
- [ ] Docs updated (`README.md`/`ARCHITECTURE.md`/`API.md` as needed)
- [ ] No secrets introduced (grep for `sk-`, `ghp_`, `DATABASE_URL` literal)
- [ ] Accessibility checked (focus order, reduced-motion if animated)

Closes #<issue>
```

### 4.2 Review expectations

- At least **1 approver** who is not the author.
- All CI checks green (`lint`, `typecheck`, `test`, `build`) — see `.github/workflows/ci.yml`.
- **Squash merge** preferred (keeps `main` history linear with one conventional commit per PR). Tick *Delete branch after merge*.
- Author must respond to every review thread; resolve via code, not just comment. Use *Re-request review* once addressed.

### 4.3 Small PRs win

- Max ~400 LOC diff. Split "add escrow + refactor feed" into two PRs.
- Mark `Draft` if still in WIP; convert to *Ready* after self-review + local verified.

---

## 5. Development Standards

### 5.1 Quality gate before requesting review

```bash
pnpm lint          # eslint flat + next/core-web-vitals
pnpm typecheck     # tsc --noEmit strict
pnpm test          # vitest run — add tests for any new src/lib, src/app/api, src/components logic
pnpm build         # next build — also validates next.config.ts & instrumentation
# Optional full check (mirrors CI health phase):
pnpm build && pnpm start &
curl -f http://127.0.0.1:3000/api/health | jq && kill %1
```

Add tests under `src/**/*.{test,spec}.{ts,tsx}` (jsdom, global). Existing examples: `src/lib/validators.test.ts`, `src/lib/ratelimit.test.ts`, `src/components/ui/button.test.tsx`.

### 5.2 Style

- **TypeScript** strict; `type` imports; `path @/* → ./src/*` (`tsconfig.json:20`).
- **Tailwind 4** utilities + `cn()` from `src/lib/cn.ts`; tokens via `src/lib/tokens.ts` / `globals.css` vars — never hardcode raw hex in components (use token vars).
- **Motion**: use `motion` (not `framer-motion`) + Spring; respect `prefers-reduced-motion` (`globals.css:168`).
- **Barrel control**: don't add implicit `index.ts` barrels without team agreement; import from specific file.

### 5.3 DB & API

- Every `src/db/schema.ts` change needs `pnpm db:generate` + committed `drizzle/*.sql` + noted in PR's *How to test* (`pnpm db:migrate` then seed + health).
- Every `src/app/api/*` route needs Zod validation, rate limiting, and drizzle atomic tx where counts/membership/escrow mutate. See `API.md` & `ARCHITECTURE.md:5`.

### 5.4 Secrets

- Never commit `.env*`. Add new env vars to `.env.example` with placeholder and to `src/lib/env.ts:4` Zod schema.
- If you accidentally committed a secret (e.g. `ghp_*`), follow `SECURITY.md §7` — revoke, rotate, scrub history, and tell a maintainer *privately*.

---

## 6. Release & Deploy

- Version lives in `src/app/api/health/route.ts` (`version: "3.4.0"`). Bump on meaningful user-facing change; keep in sync with `package.json` if you add there.
- Pushing to `main` triggers Vercel auto-deploy. CI's `build` + `health` must already be green.
- DB migrations on production: run `DATABASE_URL=... pnpm db:migrate` (see `DEPLOYMENT.md §4.3`) before or alongside deploy — announce in PR if migration is risky.

---

## 7. Questions & Contact

- Open a GitHub *Issue* for proposals / bugs (label `proposal`, `bug`, `docs`, `security`).
- For private security issues, use repo **Security → Report a vulnerability** (private).

*Built with craft for the African century — welcome aboard.*

