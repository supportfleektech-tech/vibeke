# DESIGN — KINARA Sovereign Design System

> Premium African design language — depth with restraint, glass sparingly, motion with meaning. Dark-mode first-class.

Source vision: `follow-up-vibeke.md`. Token truth lives in `src/lib/tokens.ts` + `src/app/globals.css`. Component truth in `src/components/ui/*`.

---

## 1. Brand Narrative

**Don't be the next Instagram. Be the first premium African platform.**

- **Apple** — polish, tactility, restraint
- **Linear** — speed, keyboard-first fluidity
- **Notion** — organization, modular dashboard
- **Spotify** — personalization via persona
- **Discord** — community as mini-platform (voice, rooms, wiki, files)
- **Google Maps** — local radar as everyday utility
- **Figma** — clean interface, token rigor

Result: an OS for the African century — sovereign, fast, dignified.

---

## 2. Design Principles (from `follow-up-vibeke.md`)

1. **Depth with restraint** — soft shadows, not flat; glass only where it aids clarity.
2. **Purposeful motion** — every animation communicates state (cards lift, messages slide, likes pulse), 60 FPS, reduced-motion respected.
3. **Trust as UX** — escrow, verification badges, trust scores, distance/delivery clarity.
4. **Mobile-first, offline-aware** — the continent is mobile-native; the system degrades gracefully to 2G.
5. **Dark-mode first-class** — not an inversion afterthought; designed for AMOLED + low-light usage.

---

## 3. Color Tokens

### 3.1 Core Palette  ( `src/lib/tokens.ts:3`  +  `src/app/globals.css:5` )

| Token | CSS Var | Hex | Meaning / Usage |
|-------|---------|-----|-----------------|
| **Emerald (primary)** | `--kinara-emerald` | `#059669` | Growth, trust, prosperity — primary actions, rings, badges |
| Emerald bright | `--kinara-emerald-bright` | `#10b981` | Hover, focus ring, live voice pulse, scrollbar thumb hover |
| Emerald deep | `--kinara-emerald-deep` | `#022c22` | Deep container, dark-accented card backdrops |
| **Gold (accent)** | `--kinara-gold` | `#f59e0b` | Achievement, escrow, highlights, CTA variant |
| Gold warm | `--kinara-gold-warm` | `#d97706` | Gold hover second |
| Gold light | `--kinara-gold-light` | `#fde68a` | Label + badge text |
| **Indigo (secondary)** | `--kinara-indigo` | `#1e1b4b` | Night-mode contrast, indigo badge, AI rail |
| Indigo light | `--kinara-indigo-light` | `#4338ca` | Night accent |
| **Slate (neutral)** | `--kinara-slate` | `#475569` | Neutral body copy |
| Slate light | `--kinara-slate-light` | `#94a3b8` | Muted text, attribution |
| Slate dark | `--kinara-slate-dark` | `#1e293b` | Elevated borders |
| **Backgrounds** | `--kinara-bg` / `--kinara-surface` / `--kinara-surface-elevated` + `--kinara-surface-border` | `#070c0e` / `#0c1616` / `#112020` + `rgba(16,185,129,0.15)` | Page → card → elevated panel |
| Body fallback | — | `#060b0b` text `#f1f5f9` | `globals.css:39` |

**Never use** Facebook blue or Instagram gradient. Emerald + Gold is the signature.

### 3.2 Badge gradients  (`globals.css:101, 225`)

```css
.badge-gold    { background: linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.12)); border:1px solid rgba(245,158,11,0.35); color:#fbbf24; }
.badge-emerald { background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.10)); border:1px solid rgba(16,185,129,0.35); color:#34d399; }
.badge-indigo  { background: linear-gradient(135deg, rgba(30,27,75,0.50), rgba(67,56,202,0.15)); border:1px solid rgba(67,56,202,0.40); color:#a5b4fc; }
.badge-slate   { background: linear-gradient(135deg, rgba(71,85,105,0.30), rgba(30,41,59,0.20)); border:1px solid rgba(100,116,139,0.30); color:#cbd5e1; }
```

### 3.3 Surface & Glass

```css
/* globals.css:65 */
.glass-panel         { background: rgba(12,22,22,0.78); backdrop-filter: blur(16px); border:1px solid rgba(16,185,129,0.14); }
.glass-panel-gold    { background: rgba(22,20,12,0.75); backdrop-filter: blur(16px); border:1px solid rgba(245,158,11,0.22); }
.glass-dropdown      { background: rgba(8,15,15,0.94); backdrop-filter: blur(20px);  border:1px solid rgba(16,185,129,0.20); box-shadow:0 20px 40px -15px rgba(0,0,0,0.7); }
.kinara-card         { background:#0e1b1b; border:1px solid rgba(255,255,255,0.07); transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s, box-shadow 0.2s; }
.kinara-card:hover   { transform: translateY(-2px); border-color: rgba(16,185,129,0.35); box-shadow:0 12px 28px -8px rgba(0,0,0,0.6), 0 0 20px -5px rgba(16,185,129,0.15); }
```

Glass is **restrained** — only search dropdown, sticky panels, radar overlays.

---

## 4. Typography

### 4.1 Font Stack  (`src/lib/tokens.ts:40` + `globals.css:42`)

```ts
fontSans = "Geist, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
```

`Geist` is via `geist` package + `next/font`. Fallbacks preserve metrics. Body `letter-spacing: -0.011em`.

### 4.2 Scale

| Token | CSS var | Size | Weight | Usage |
|-------|---------|------|--------|-------|
| `--text-xs` | `12px` | Mono label | `text-xs font-mono uppercase tracking-widest` | Meta, badges, timestamps |
| `--text-sm` | `14px` | Body | `text-sm leading-relaxed` | Product descriptions, bios, message text |
| `--text-base` | `16px` | UI | — | Inputs, tabs, buttons |
| `--text-lg` | `18px` | h3 | `text-lg font-semibold` | Card titles, business service names |
| `--text-xl` | `20px` | h2 | `text-xl font-bold tracking-tight` | Section headings |
| `--text-2xl` | `24px` | — | — | Profile cover stat |
| `--text-3xl/4xl` | `30px/36px` | h1 | `text-3xl md:text-4xl font-black tracking-tight` | Page titles, hero |

Utility classes in `src/lib/tokens.ts:40`:

```ts
h1: "text-3xl md:text-4xl font-black tracking-tight",
h2: "text-xl font-bold tracking-tight",
h3: "text-lg font-semibold",
body: "text-sm leading-relaxed",
label: "text-xs font-mono uppercase tracking-widest",
```

### 4.3 Hierarchy rules

- **Page titles** — 3xl→4xl, font-black, tight tracking.
- **Section headings** — xl, bold, tight; accompanied by emerald icon rail or gold badge.
- **Body** — sm, relaxed leading, 70–75ch max line length.
- **Labels** — xs mono uppercase widest (taps into Linear/Notion rigor).

---

## 5. Spacing, Radius & Shadow

### 5.1 Spacing  (`tokens.ts:26` + `globals.css:21`)

| Token | Value | Notes |
|-------|-------|-------|
| `1` → `--space-1` | `4px` | Tight: icon gaps |
| `2` → `--space-2` | `8px` | Button padding micro |
| `3` → `--space-3` | `12px` | Card inner micro |
| `4` → `--space-4` | `16px` | Default card padding |
| `5` → `--space-5` | `20px` | Modal padding |
| `6` → `--space-6` | `24px` | Section padding |
| `8` → `--space-8` | `32px` | Page gutters |

All components share this 4px base.

### 5.2 Radius  (`tokens.ts:19`)

| Token | Value | Use |
|-------|-------|-----|
| `sm` | `12px` | Small badges, input |
| `md` | `16px` | Default cards, post media |
| `lg` | `20px` | Large cards, marketplace image, dialogs |
| `xl` | `24px` | Hero banners, cover images |
| `full` | `9999px` | Avatars, pills |

**Spec says 16–20px rounded corners** — `md/lg` are correct.

### 5.3 Shadow  (`tokens.ts:35`)

```ts
card:     "0 12px 28px -8px rgba(0,0,0,0.6), 0 0 20px -5px rgba(16,185,129,0.15)",
dropdown: "0 20px 40px -15px rgba(0,0,0,0.7)",
```

Soft, layered — premium depth without heaviness.

---

## 6. Motion — 60 FPS + Reduced-Motion

### 6.1 Principles

- Motion **communicates state**, not decoration.
- Target **60 FPS** on typical devices; use `motion` (spring/physics) + Tailwind transitions.
- Every interactive element has both **hover** and **active** feedback (`active:scale-[0.98]`).

### 6.2 Token motion

| Element | Animation | Easing/Duration |
|---------|-----------|-----------------|
| `.kinara-card` | `transform translateY(-2px) + border-color + box-shadow` | `200ms cubic-bezier(0.16,1,0.3,1)` |
| `Button` | `active:scale-[0.98]`, `transition-all duration-200` | ease |
| `.animate-wave-1..4` | `audioWave` (height 6→26→6px) | `0.8–1.3s staggered ease-in-out infinite` — voice bars |
| `.voice-pulse` | `voicePulse` ring `box-shadow 0 0 0 0 → 10px → 0` | `2s infinite` |
| `.animate-spin-slow` | `spinSlow 0→360deg` | `8s linear infinite` — radar |
| `.animate-in / .animate-slide-in` | `fadeIn / slideIn (translateY 8→0)` | `150–200ms ease-out` — dialogs/toasts |

See `globals.css:113`.

### 6.3 Reduced-motion & High-contrast

```css
/* globals.css:168 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; scroll-behavior:auto !important; }
  .kinara-card:hover { transform:none !important; }
}
/* globals.css:183 */
@media (prefers-contrast: more) {
  .kinara-card { border-color: rgba(255,255,255,0.3) !important; }
  .glass-panel { background: rgba(0,0,0,0.95) !important; }
}
```

### 6.4 Motion library usage

`motion` (ex-`framer-motion`) imported via `motion` 13 — used in `PostCard`, `DynamicHome`, `UniversalSearchModal`, etc. Wrapped with `optimizePackageImports: ["lucide-react","motion"]` in `next.config.ts:14` for bundle.

---

## 7. Components (Design System — Day One)

Build order per `follow-up-vibeke.md:456`: Brand → Design System → UX → High-fidelity → Frontend → Backend.

Existing `src/components/ui/*`:

### 7.1 Button  (`src/components/ui/button.tsx:1`)

```
Variants (cva-style mapping):
  primary   bg-emerald-600 hover:bg-emerald-500 text-black border emerald/30  ← default
  secondary bg-black/40 hover:bg-black/60 text-slate-200 border white/[0.08]
  ghost     bg-transparent hover:bg-white/[0.06] text-slate-300
  gold      bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border amber/30
  danger    bg-red-600 hover:bg-red-500 text-white

Sizes:
  sm   min-h-11 px-3  text-xs gap-1.5
  md   min-h-11 px-4 py-2 text-sm gap-2  ← default
  lg   min-h-11 px-6 text-sm gap-2
  icon min-h-11 min-w-11 h-11 w-11 p-0

States: loading (spinner), disabled (opacity-50 + cursor-not-allowed), focus-visible:ring-2 emerald-400,
        active:scale-[0.98], touch-target (44px min), aria-busy/aria-disabled.
Corner: rounded-xl, font-medium, transition-all 200ms.
```

### 7.2 Card (`src/components/ui/card.tsx`)

```tsx
Card         → div.kinara-card rounded-[16|20] p-6 — elevation via shadow token
CardHeader   → flex flex-col space-y-1.5 p-6 pb-3
CardTitle    → text-lg font-semibold
CardDescription → text-sm text-slate-400
CardContent  → p-6 pt-0
CardFooter   → flex items-center p-6 pt-0
```

### 7.3 Input (`src/components/ui/input.tsx`)

`rounded-xl`, `border-white/[0.08]`, `bg-black/40`, `focus:border-emerald-500`, `placeholder:text-slate-500`, `text-sm`.

### 7.4 Dialog / Sheets / Drawers (`src/components/ui/dialog.tsx`)

Uses `motion` + `animate-in`/`animate-slide-in`, `glass-dropdown` backdrop, `24px` rounded, keyboard `Escape` + focus trapping + `aria-modal`.

### 7.5 Avatar / Badge / Tabs / Progress

- **Avatar**: `rounded-full`, `object-cover`, `badge-emerald` verification ring if `verified`.
- **Badge**: variants `gold|emerald|indigo|slate` (see §3.2).
- **Tabs**: `Header` city tabs, `ProfileView` tabs — underline active with emerald trail.
- **Progress**: height `2px`, emerald fill, `animate-wave` variant for voice.

### 7.6 App-level components (software-architecture-level)

| Component | Role | Key prop contract |
|-----------|------|-------------------|
| `DynamicHome` | Modular dashboard orchestrator | `user, posts, communities, products, jobs, radar, messages, sectionsConfig` |
| `ModuleCustomizerModal` | dnd-kit sortable toggles | `sections, onUpdateSections, onResetDefault` |
| `PostComposer` + `PostCard` | Feed mutate/display | `onPostCreated`, optimistic like |
| `LocalRadarMap` → `LeafletMapCore` | OSM map + sovereign pin CSS | `pins, selectedCity` (dynamic ssr:false) |
| `CommunityView` | Mini-platform tabs (feed/chat/voice/files…) | `communities, posts, user` |
| `MarketplaceView` + `EscrowModal` + `AIPriceCheckModal` | Trust commerce | `products, user`, escrow flow |
| `BusinessView` + `BookingModal` | Storefront + appointments | `businesses, selectedCity` |
| `MessagingView` | Thread UI (pinned/unread/archive, voice, polls) | `initialMessages, user` |
| `KinaraAICopilot` | Sovereign AI (rewrite…price_check) | `user, selectedCity` |
| `UniversalSearchModal` | Cmd+K global | `isOpen, onClose, collections` |
| `Header` / `Sidebar` | Shell | `currentPersona, selectedCity, lowBandwidth, unreadCount, activeVoiceCount` |

All use `cn()` from `src/lib/cn.ts` for conditional classes.

---

## 8. Glass & Restrained Depth

- **Rule**: use glass **only** where it improves clarity (search dropdown, sticky filters, radar overlay). Everything else uses `kinara-card` solid with soft shadow.
- **Tokens**: `glass-panel` 16px blur + subtle emerald border; dropdown `20px` blur + deeper shadow.
- **Map**: `leaflet-container bg #060c0c`, zoom controls `bg rgba(9,18,18,0.92) + emerald border`, attribution mono `10px`.
- **Anti-noise**: large imagery (pexels, avif/webp via `next/image`), generous padding (`p-6` default), 70ch line length, generous section gaps (`space-y-6`).

---

## 9. Dark-Mode First-Class

- **Base**: `bg #070c0e/#060b0b`, `text #f1f5f9` — designed for dark from line 1.
- **Elevation**: `surface #0c1616` → `surfaceElevated #112020` (not white inverted).
- **Indigo rail**: deep indigo `#1e1b4b` provides night contrast where gold would glare.
- **Images**: `next/image` respects dark bg; `low-bandwidth-mode` slightly bumps contrast/brightness instead of inverting.
- **Future light mode**: invert tokens via `prefers-color-scheme: light` or `.light` class on `:root` — currently not shipped; would remap `--kinara-bg` → `#f8fafc` scale.

---

## 10. Layout — Adaptive & Responsive

| Breakpoint | Layout | Behavior |
|------------|--------|----------|
| `< 640px` | Single column, hidden Sidebar (drawer via `isMobileSidebarOpen`), `Header` mobile toggle, `p-3` | Touch targets `44px` enforced (`touch-target`) |
| `768px–1024px` | Sidebar fixed 220px, main `max-w-5xl mx-auto`, `p-6` |  |
| `> 1280px` | `max-w-7xl mx-auto`, radar map + feed two-col where relevant | `DynamicHome` 2-col grid for trending+radar etc |

**Sidebar**: fixed nav with persona-aware counts (`unreadCount`, `activeVoiceCount`).  
**Header**: sticky top (`glass-panel`), persona select (citizen/creator/business/student/buyer) + city + lowBandwidth toggle.  
**Adaptive persona** shifts `sectionsConfig` order/visibility (see `ARCHITECTURE.md:8` + `page.tsx:handleSelectPersona`).

---

## 11. Accessibility (WCAG 2.1 AA target)

Per `follow-up-vibeke.md:387` + implementation in `globals.css`:

- **Automated guard**: `eslint-config-next/core-web-vitals` (via `eslint.config.mjs`).
- **Keyboard**: `*:focus-visible` emerald `2px` ring offset 2px; `:focus:not(:focus-visible) { outline:none }`. All `Dialog`, `UniversalSearchModal` esc-closeable; `Sidebar` links tabbable; `Button` `active:scale-[0.98]` is keyboard-safe.
- **Screen readers**: `aria-live="polite"` toast region + `announceToast()` in `page.tsx:160`; `aria-busy`/`aria-disabled` on `Button` loading; semantic `main#main-content`, headings hierarchy.
- **Reduced motion**: `prefers-reduced-motion` disables transitions/animations (see §6.3).
- **High contrast**: `prefers-contrast: more` bumps borders + glass opacity (see §6.3).
- **Resizable text**: rem-based Tailwind, `text-xs..4xl` tokens scale with zoom (no `px` fixed body).
- **Touch**: `min-h-11` / `.touch-target 44×44px` everywhere; dense actions use `sm` but never below 44px hit target (padding compensates).
- **Offline**: `low-bandwidth-mode` (see §12).

**Checklist before ship**:

- [ ] Axe/Core Web Vitals pass via `pnpm lint`
- [ ] Tab through header → sidebar → composer → feed without mouse
- [ ] Screen reader announces toasts, persona switch, search results
- [ ] Zoom to 200% without horizontal scroll (`overflow-x:hidden` on body)
- [ ] Reduced-motion toggle disables card lifts + waves

---

## 12. Performance — Kenya Networks (see `ARCHITECTURE.md` & `globals.css:144`)

- **Low-bandwidth mode**: class `low-bandwidth-mode` on root when `localStorage kinara:lowBandwidth === true` or `navigator.connection.effectiveType in ("2g","slow-2g")` or `saveData===true` (`src/app/page.tsx:191`). Effects:
  ```css
  .low-bandwidth-mode img { filter: contrast(1.1) brightness(0.9); }
  .low-bandwidth-mode .kinara-card { transition:none !important; box-shadow:none !important; }
  .low-bandwidth-mode * { backdrop-filter:none !important; }
  ```
  Disables expensive blurs/shadows/transitions.
- **Lazy media**: `next/image` + `next/dynamic(ssr:false)` for Leaflet/AI/Messaging; `SWR dedupingInterval 60s` to avoid thrash.
- **Compress**: `next.config.ts compress:true`, `optimizePackageImports:["lucide-react","motion"]`, `formats:["image/avif","image/webp"]`.
- **Cache intelligently**: `Cache-Control` via Next route cache + `fetcher` error fallback (`fetchJsonSafe`); DB `SWR` stable intervals instead of polling.
- **Smooth scroll**: `60 FPS` target; leaflet `z-index` fixed, card hover via `transform` only (no layout thrash), `will-change` avoided unless needed.

---

## 13. Iconography & Imagery

- **Icons**: `lucide-react` (optimized via `next.config.ts:14`). Use `size 16–20` default, `stroke-width 1.75`, emerald for active, slate-400 for idle.
- **Imagery**: Large, expressive pexels photos (avif/webp), `rounded-[16|20]`, `object-cover`, `aspect-video` for media cards; leaflet pins custom CSS (`kinara-radar-pin`, `kinara-user-pin`).
- **Avatars**: `40–48px` circle, `ring-1 emerald-500/30` if verified; fallback DiceBear `initials.svg` where missing.
- **Illustrations**: Use modern African geometric motifs (Imigongo, sisal) where decorative, never as stock tropes.

---

## 14. Design Lint Rules (enforce in PR)

- [ ] No hardcoded colors outside `tokens.ts`/`globals.css` vars — use `text-emerald-500`, `bg-[var(--kinara-surface)]`, etc.
- [ ] No `px` radius outside `{12,16,20,24}px` set.
- [ ] Every `img` has `alt` and `width/height` (or `fill` + `sizes`).
- [ ] Every `button` has `aria-label` if icon-only.
- [ ] Every new motion uses `motion` (not raw `framer-motion`) and respects `prefers-reduced-motion`.

---

*KINARA Sovereign Design System — built for trust, crafted for speed. See `ARCHITECTURE.md` for flows and `API.md` for contracts.*

