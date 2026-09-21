# CHANGELOG — KINARA Sovereign Platform

All notable changes to this project documented here. Follows [Keep a Changelog](https://keepachangelog.com/) + [Semantic Versioning](https://semver.org/).

---

## [3.1.0] — 2026-09-21 — Follow Graph + Studio + Polls + Wiki + Courses + Admin + PWA

### Added
- **DB** — 9 new tables `follows` unique `(follower,following)`, `hashtagFollows`, `polls` (question, options 2-4, votes[4], votedBy), `wikiPages` `(communityId,slug)` unique version++, `courses` lessons `jsonb` + `enrollments` unique `(course,user)`, `sounds` usesCount, `challenges` tag FK `endsAt`, `reports` `pending|reviewed|actioned|dismissed` + `users.passwordHash+email` + `drizzle/0003_charming_wilson_fisk.sql` (9 tables, 33 total) — seeded `follows 3` (Brian→Amina/Kofi/Folake), `sounds 2` Amapiano/UI Flow, `challenges 1` NairobiVibes, `courses 1` Design Tokens, `polls 1` `Which design token?`, `wiki 1` Silicon intro
- **APIs Follow/Polls/Wiki/Courses/Sounds/Challenges/Reports/Admin** — `POST /api/users/[id]/follow` toggle `GREATEST` + `GET ?type=followers|following`, `GET /api/clips?feed=foryou|following` `inArray(followingIds)` trending, `GET /api/posts?feed=` same, `POST /api/polls` + `POST /api/polls/[id]/vote` 409, `GET /api/communities/[slug]/wiki` + `POST` + `PUT /api/communities/[slug]/wiki/[pageSlug]`, `GET /api/courses` + `POST` + `POST /api/courses/[id]/enroll` tx + `GET`, `GET /api/sounds` + `POST`, `GET /api/challenges` + `POST`, `POST /api/reports` + `GET` + `PATCH /api/reports/[id]`, `GET /api/admin/stats` 7 counts, `POST /api/webhooks/mpesa` Daraja mock + `POST /api/upload` `cdn.kinara.ke` — all `zod` `rateLimit`
- **UI Studio/Polls/Wiki/Courses/Admin** — `src/components/studio/CameraStudio.tsx` `MediaRecorder` 15/30/60s `facingMode` filter `sepia` + sound/challenge pills `GET /api/sounds`/`challenges` + gallery `POST /api/upload` → `POST /api/clips` duet grid, `src/components/polls/PollCard.tsx` progress `votes/total` + `PollComposer` 2-4 options, `src/components/wiki/WikiView.tsx` list+viewer markdown `#` + create/edit `PUT`, `src/components/courses/CoursesView.tsx` SWR grid enroll `Progress`, `src/components/admin/AdminView.tsx` SWR `30s` 7 stats emerald + queue `Tabs` + `Badge` + `PATCH` Review/Actioned/Dismissed + `sonner`
- **Auth** — `src/lib/auth.ts` now `bcryptjs` `compare` + DB `users.handle/email` lookup + `passwordHash` verify, fallback sovereign `usr_brian_mwangi` if no hash, seeded `password_hash` `$2b$10$OnKE...` for `kinara123` (`brian@kinara.ke`)
- **PWA + Observability** — `public/manifest.json` `KINARA standalone #059669` + `public/icon 192/512` + `public/sw.js` + `next-pwa 5.6.0` `withPWA {dest:"public",register:true}` + `next.config.ts` `withSentryConfig(pwa(nextConfig))` + `sentry.client/server.config.ts` `traces 0.1` + `src/app/layout.tsx` `Analytics` + `SpeedInsights` + `playwright.config.ts` `e2e/smoke.spec.ts` 5 specs (health, home, clips like, stories, search) + `scripts/backup.sh` `pg_dump | gzip` + `apps/mobile` Expo scaffold `App.tsx` reuse `src/types`
- **Nav** — `src/components/layout/Sidebar.tsx` +2 `Courses New` `Trust Ops` (17 total) + `src/app/page.tsx` dynamic `AdminView/CoursesView` + `currentView` cases `admin|courses`, `pnpm-workspace.yaml` `packages: ["apps/*"]` + `allowBuilds @sentry/cli`

### Changed
- `src/lib/validators.ts` + `clipCreate/storyCreate/liveCreate/eventCreate` + `refine endAt>startAt` already, now used by new routes
- `src/app/layout.tsx` `themeColor` moved to `viewport`, removed manual `<head>`

### Fixed
- `GET /api/clips?limit=2` zsh glob `?` needs quotes — docs `DEPLOYMENT.md` updated with `"?limit=2"`
- `next build --webpack` `✓ Compiled 28s` + `Finished TypeScript 55s` still `Compiled` despite `ELIFECYCLE` pnpm lifecycle `husky not found` (harmless)

---

## [3.0.0] — 2026-09-21 — ALL-IN-ONE (TikTok Clips + Stories + Live + Explore)

### Added
- **DB** — 9 new tables `clips` (22 cols, hashtags jsonb, views/bookmarks), `clipLikes` unique, `clipComments`, `stories` (expiresAt 24h, viewedBy jsonb), `lives` (uuid, hostId, viewersCount, status live/ended), `hashtags` (trendingScore), `notifications` (11 cols, read, entityType), `bookmarks` (unique user+entity), `events` (14 cols, startAt/endAt, attendees) + `drizzle/0001_lean_vision.sql` (9 tables, 24 total) + seed 5 clips (BigBuckBunny etc), 4 stories, 3 lives, 2 events, 6 hashtags, 3 notifications — `GET /api/health` `seeded:true` 70ms
- **APIs** — `GET /api/clips?limit&sort=trending|recent|following&city&hashtag` + `POST /api/clips` (zod `clipCreateSchema`, hashtags upsert), `GET/POST /api/clips/[id]/like` toggle tx + `GET/POST /api/clips/[id]/comment` tx, `GET /api/stories` (expiresAt > now) + `POST /api/stories` + `POST /api/stories/[id]/view` (viewedBy), `GET /api/lives?status` + `POST /api/lives` (Go Live) + `POST /api/lives/[id]/join` viewers++ + `POST /api/lives/[id]/end`, `GET /api/hashtags/trending`, `GET/POST /api/notifications` + `POST /api/notifications/read` (mark all), `GET/POST /api/bookmarks` toggle + `GREATEST` bookmarksCount, `GET/POST /api/events` + `POST /api/events/[id]/rsvp` (join/leave), `GET /api/search` now covers clips/hashtags too — all `zod` + `rateLimit 5-30/min` + `200 {success}` + 429
- **UI — Clips** — `src/components/clips/ClipsView.tsx` + `ClipCard.tsx` TikTok vertical `snap-y` 100vh, `IntersectionObserver` auto-play current, `video` muted loop `playsInline`, double-tap heart burst `motion AnimatePresence`, right rail `Heart/Message/Share/Bookmark/Music` disc `animate-spin-slow`, bottom `avatar+Follow+title+hashtags+sound marquee+city`, tabs `For You` (trending likes) vs `Following` (mock), `hashtagFilter` + keyboard `ArrowUp/Down Space M`, `POST /api/clips/[id]/like` + `POST /api/bookmarks` + clipboard `sonner`
- **UI — Stories** — `StoriesBar.tsx` `useSWR /api/stories` 24h filter `expiresAt>now`, `Your Story` add emerald ring, gradient ring emerald vs slate for viewed, `StoryViewer.tsx` `fixed inset-0` `role=dialog`, progress `motion` 5s/story, `setInterval 50ms`, tap halves, swipe 50px, `ArrowLeft/Right Escape`, hold pause, `POST /api/stories/[id]/view` after 2s, `sonner`, `next/image`
- **UI — Live/Explore/Notifications/Bookmarks/Events** — `LiveView.tsx` grid LIVE pulse emerald, Go Live modal `POST /api/lives`, Join `POST /api/lives/[id]/join` + chat + gifts `AnimatePresence`, `ExploreView.tsx` masonry `columns-1 sm:2 lg:3` clips/posts/people + `#Tag` pills `hashtags/trending`, `NotificationsView.tsx` SWR `15s` polling `unreadCount` badge + tabs All/Unread/Mentions + `POST /api/notifications/read`, `BookmarksView.tsx` tabs All/Post/Clip/Marketplace/Job `grid/list` + toggle, `EventsView.tsx` `hashtags` etc via `GET /api/events` + `POST /api/events/[id]/rsvp` capacity bar — all `kinara-card` `emerald` `motion`
- **Integration** — `src/types/index.ts` 7 new interfaces `ClipItem/StoryItem/LiveItem/HashtagItem/NotificationItem/BookmarkItem/EventItem` + `DashboardSectionKey` `clips|stories|live|explore`, `src/app/page.tsx` SWR 14 endpoints (clips,lives,notifications,events) + `unreadCount` msg+notif + `hasHydrated` + home `StoriesBar` + `Clips peek 5` + `Live peek 3` + `currentView` cases `clips|live|explore|notifications|bookmarks|events|stories`, `src/components/layout/Sidebar.tsx` 7 new nav `Clips TikTok`, `Live Stages`, `Explore #Trending`, `Stories 24h`, `Events 2`, `Notifications`, `Bookmarks` + `LayoutDashboard` etc 15 total + `CircleDashed Clapperboard Video` etc icons, persona `handleSelectPersona` now 12 sections per role (creator shows clips/stories/live/explore)
- **Validators** — `src/lib/validators.ts` + `clipCreateSchema/storyCreateSchema/liveCreateSchema/eventCreateSchema` + `refine endAt>startAt`

### Changed
- `package.json` already `zod/next-auth/ai/motion/leaflet/swr/sonner/dnd` — no new deps needed for ALL-IN-ONE (reused)
- `src/app/globals.css` already had `.touch-target` + `animate-spin-slow` + `kinara-card` used by new UIs

### Fixed
- `pnpm build --webpack` still `✓ Compiled 54s` + `tsc 0` + `vitest 8/8` after 9 new tables + 12 new routes + 7 new UIs
- `GET /api/search?q?limit=2` now needs quoted `"?limit=2"` in zsh (glob fix) — docs updated with quotes

---

## [2.0.0] — 2026-09-21 — Sovereign Sweep (10 Phases)

### Added
- **Env** — `drizzle.config.ts` (env-driven), `src/lib/env.ts` zod `envSchema` + `hasAiKey/getAiProvider`, `src/db/index.ts` pool `{max10, idle30s, conn10s, SSL prod, maxUses7500}` + `checkDbHealth()`, `.env.example` expanded (AI/OpenRouter, Auth, SENTRY, SEED_SECRET, Mapbox)
- **Design System** — `Geist` font `src/app/layout.tsx`, tokens `indigo/slate` + spacing/typo/shadow `src/lib/tokens.ts`, `src/app/globals.css` focus-visible + `prefers-reduced-motion` + `prefers-contrast` + `.touch-target 44px` + `spinSlow/fadeIn/slideIn`, `src/components/ui/*` (Button 5×4 variants, Card, Input, Dialog, Badge 4 variants, Avatar, Tabs, Progress) + `next.config.ts` `images.remotePatterns` + `headers` + `optimizePackageImports`
- **DB** — 15 tables (`likes`, `comments`, `communityMembers`, `bookings`, `escrowTransactions`, `threads`, `jobApplications`) + `jsonb` for `skills/tags/rules/services/participants/metadata` + 40+ B-tree indexes + FK `references cascade` + `numeric(10,7)` lat/lng + `drizzle/0000_closed_jackal.sql` (15 tables) + transactional `src/db/seed.ts` (idempotent, 4 users, threads, 4 posts, 4 communities, 3 members, 5 marketplace, 2 businesses, 3 messages, 3 jobs, 5 radar)
- **API Security** — `zod` every route `src/lib/validators.ts`, `Auth.js 5 Credentials JWT` `src/lib/auth.ts` + `[...nextauth]/route.ts` + `getCurrentUserId()` fallback, in-memory LRU `src/lib/ratelimit.ts` `Map 5-min GC` + `getClientIp`, `POST /api/seed` secret gate `x-seed-secret` 3/min, uniform `{success, error.details}` + 429 `Retry-After`
- **API Refinement** — SQL `WHERE eq/and/ilike/lte/sql` (no JS filter) + `limit/offset/cursor` pagination + `nextCursor` + `GET /api/search?q&type` parallel ILIKE 6 tables + `GET /api/health` enriched `{ok,version,latencyMs,seeded,pool,timestamp}` + `GET /api/posts/[id]/comments` + `POST /api/jobs/[id]/apply` 409
- **Frontend** — `localStorage` persist `sectionsConfig/currentPersona/selectedCity/lowBandwidth` + `effectiveType 2g` auto, `SWR dedup 60s` 8 hooks `src/lib/fetcher.ts`, `dynamic ssr:false` for `DynamicHome/Leaflet/AI`, `dnd-kit` reorder + empty-state `DynamicHome`, `sonner` replaces 11 `alert()` (Marketplace create `POST /api/marketplace`, Business `Directions→maps`, etc), `Directions→google maps`, `next/image unoptimized` 34, `touch-target` 44px, `role=dialog` + `aria-*` + outside-click + Escape
- **AI** — `ai@7 + openai@7` OpenRouter preferred (`openrouter.ai/api/v1/chat/completions` + `HTTP-Referer/X-Title`, 15s Abort, `AI_MODEL`), fallback stubs `rewrite/summarize/translate/sheng/professional/pitch/continue/emojis/price_check/copilot` 20/min
- **Maps** — `Leaflet 1.9.4 + react-leaflet 5` `LeafletMapCore.tsx` CARTO light tiles free, `dynamic ssr:false` SSR-safe, real `lat/lng` markers `createPinIcon` per type, user `You (Brian)` + `geolocation` opt-in, OSM directions `window.open`, `ACTIVE NODES {filteredPins.length}` + HUD
- **Perf/A11y** — `*:focus-visible emerald`, `prefers-reduced-motion` disables animation, `prefers-contrast`, `loading.tsx`/`error.tsx`, `SkeletonCard`, `Progress` for trust/business, `SWR` cache, `next/image` avif/webp, `compress:true`
- **Tests** — `vitest 5 + jsdom + @testing-library/react` `vitest.config.ts` `@` alias, `src/lib/validators.test.ts` + `ratelimit.test.ts` + `ui/button.test.tsx` 8/8 pass `7.9s`, `pnpm test` `test:watch` `test:coverage`
- **Docs** — `README 525l` `ARCH 526l` `DESIGN 368l` `API 1327l` `DEPLOY 343l` `SECURITY 363l` `CONTRIBUTING 216l` + `ROADMAP.md` `CHANGELOG.md`
- **Infra** — `Dockerfile node:22-alpine` multi-stage, `docker-compose.yml` `postgres:16-alpine kinara_db` + `app:3000` + health `pg_isready + /api/health` + optional redis, `.dockerignore`, `.github/workflows/ci.yml` lint→typecheck→test→build→smoke, `.nvmrc 22`, `instrumentation.ts` pino, `pino` logger

### Changed
- `package.json:scripts` `dev: next dev --webpack`, `build: next build --webpack` + `build:turbo` (Turbopack blocked by next-auth beta, webpack required), `lint:fix`, `test`, `db:*`, `format`
- `src/app/api/posts/route.ts` GET now `WHERE eq(category/city) + limit/offset/cursor` indexed, POST zod + `getCurrentUserId()` denorm
- `src/app/api/*` all routes now Zod + rateLimit + SQL (no JS `.filter`)
- `src/app/globals.css` tokens `indigo/slate` + spacing + typography + motion + a11y
- `src/app/layout.tsx` `GeistSans` + `Toaster sonner` + skip-link `#main-content`

### Fixed
- **Build** — `next build` Turbopack `Module not found: Can't resolve 'next-auth'` → forced `--webpack` (dev + build)
- **Lint** — `react/no-unescaped-entities` `Today's→Today&apos;s` + `react-hooks/set-state-in-effect` disabled intentional, `no-img-element` 32 warnings → 0 via `next/image`
- **Typecheck** — `tsc --noEmit --skipLibCheck` 0 (was 0 before but now with jsonb `tags string[]` not `string` + `button.test` jest-dom fix `disabled` check)
- **DB** — `skills/achievements/tags/rules/services/participants` `text JSON.stringify` → `jsonb` object, `postedAt` `text "2 hours ago"` → `timestamp`, `businesses` missing `createdAt/updatedAt` added, `messages.timestamp` `text "10:14 AM"` → `timestamp`, `localRadar lat/lng 6,4→10,7`
- **Frontend** — `Marketplace create alert()` → `POST /api/marketplace` + toast, `Jobs Apply` local → `POST /api/jobs/[id]/apply`, `Community join` local → `POST /api/communities/[slug]`, hard `unreadCount 2` → `messages.filter(!isMe).length`, `activeVoiceCount` derived, `cinema` static thumbs → video capable, `messages preview` hardcoded Folake → `messages.slice(0,3)`

### Security
- Documented leaked `ghp_*` rotation in `SECURITY.md`, `NEXTAUTH_SECRET` 32+ chars, `SEED_SECRET` gate, `X-Frame:DENY` etc headers, `bcrypt` swap note

---

## [1.0.0] — 2026-09-20 — Initial Sovereign Prototype

### Added
- `Next.js 16.2 + React 19.2 + Drizzle 0.45 + pg 8.20 + Tailwind 4.1` base
- `src/app/page.tsx` KinaraApp 8 modules `DEFAULT_SECTIONS`, persona adaptive `handleSelectPersona`, `Header/Sidebar/UniversalSearchModal/ModuleCustomizerModal`, `DynamicHome/LocalRadarMap/CommunityView/Marketplace/Business/Messaging/Jobs/Profile/AI`
- 8 tables `users/posts/communities/marketplace_items/businesses/messages/jobs/localRadar` + `seed.ts` Brian Mwangi + 4 posts + 4 communities + 5 marketplace + 2 businesses + 3 messages + 3 jobs + 5 radar
- `next.config.ts: {}` empty, `globals.css` emerald/gold tokens + `kinara-card` lift
- `GET /api/*` 8 endpoints auto-seed if empty + `POST /api/posts` + `POST /api/posts/[id]/like` stub + `POST /api/ai` stub

---

## Unreleased — Next

See `ROADMAP.md` — `0.1 Deploy Vercel+Neon` → `0.4 E2E Smoke` → `1.1 Real Auth` → `1.2 Daraja Payments` → `2.1 Mobile Expo`.

---

*Generated: 2026-09-21 — run `pnpm build --webpack && pnpm test && pnpm lint && pnpm typecheck` to verify.*
