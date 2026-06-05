# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Current Status Summary (2026-06-05)

All Phase A–E tasks completed. The app is functionally complete with:
- Two-layer extraction (spots + substance wisdom)
- Enrichment retry queue with online-restore detection
- Browser extension + iOS Share Extension + Claude Vision
- Cloud backup import/export
- GPS On-Trip mode with nearby clips
- Proactive trip suggestions
- Skeleton loading states + swipe-to-delete + map filter bar
- Dark mode (system-aware)
- iOS haptic feedback
- Vibe search with intent expansion + substance snippets
- Location pin editing in EditClipSheet
- Trip day editing (remove/move/note activities)

**Blocked** (need Supabase keys):
- B4: pgvector embedding search
- C3: Shared boards

---

## ⭐ Goal: iOS App Store-Ready Beautiful Product

The remaining work focuses on three areas:
1. **F — App Store Polish** — the final 20% that separates "works" from "shipped"
2. **G — Performance & Quality** — ensuring the app feels fast and reliable
3. **H — Monetisation Foundation** — Pro tier scaffolding (no payment yet, just gating)

---

## PHASE F — App Store Polish

### F1 — Onboarding Flow (First Launch Experience)
**Status**: `[x]` Done
**Why**: New users open the app and see an empty map. The current OnboardingSeed dumps data silently. A proper onboarding flow dramatically improves activation.
**Files**: new `app/onboarding/page.tsx`, `app/layout.tsx` (redirect logic)
**What to do**:
- Check `hasCompletedOnboarding` in localStorage on first app load
- If missing, show a 3-step swipeable onboarding screen:
  - Step 1: "Your travel brain" — show the moat (substance over spots) with an animation
  - Step 2: "Clip from anywhere" — show the Share Sheet flow with a GIF/animation placeholder
  - Step 3: "Plan with AI" — show what the planner produces
- "Get started" button on step 3 sets the flag and redirects to the map
- Skip button on step 1
- Use framer-motion AnimatePresence for swipe transitions between steps

### F2 — Pull-to-Refresh on Inbox
**Status**: `[x]` Done
**Why**: iOS users expect pull-to-refresh. Currently there's no way to manually reload the inbox without closing/reopening the app.
**Files**: `app/inbox/page.tsx`
**What to do**:
- Add pull-to-refresh gesture using framer-motion drag on a wrapper div
- On pull threshold reached (80px), trigger `useSavedItems` refresh
- Show a spinner indicator while refreshing
- Works on web too (not just native) via pointer events

### F3 — Empty State Illustrations
**Status**: `[x]` Done
**Why**: The empty states (empty inbox, empty board, no boards) use emoji + text. Proper illustrated empty states feel much more polished.
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/boards/[id]/page.tsx`
**What to do**:
- Create inline SVG illustrations (no external images) for each empty state:
  - Inbox empty: a cute mailbox with a leaf 🌿 coming out
  - Boards empty: a compass on a blank map
  - Board empty (no clips yet): a pin being dropped
- Each SVG: ~200×160px, uses indigo/gray palette, works in dark mode
- Add subtle CSS animation (gentle float/pulse on the illustration)

### F4 — Share Sheet "Quick Board" Picker
**Status**: `[x]` Done
**Why**: The share flow lets users pick a board, but the picker is a simple list. Adding recently-used boards at the top (and a "New Board" button inline) reduces friction significantly.
**Files**: `app/share/page.tsx`
**What to do**:
- In the board picker section, show last-used boards first (sort by `updatedAt`)
- Add a "+ New Board" inline button that opens a quick name+emoji modal
- After creating, automatically select the new board
- Show a "Most recent" divider and an "Other boards" divider

### F5 — Clip Count on Map Pins
**Status**: `[ ]` Not started
**Why**: When a location appears in multiple clips (e.g., "Asakusa" saved 3 times from different posts), the map shows overlapping pins. Adding a count badge clarifies how many clips reference each spot.
**Files**: `components/MapView.tsx`
**What to do**:
- Group items by proximity (within ~100m of each other)
- Show a count badge on grouped pins: "×3" style
- On click of a grouped pin, show a mini list of matching items in the bottom sheet
- Single-item pins keep their existing behaviour

### F6 — App Icon & Splash Screen
**Status**: `[x]` Done
**Why**: The app uses the default Capacitor icon. App Store submission requires a proper icon set.
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `ios/App/App/Assets.xcassets/Splash.imageset/`
**What to do**:
- Generate app icons using Python (same technique as browser extension icons):
  - Create a 1024×1024 PNG with the TravelPanel branding:
    - Indigo gradient background (from `#4f46e5` to `#7c3aed`)
    - White globe + pin icon in the centre
    - Rounded square corners (iOS icon style)
  - Use the `struct` + `zlib` technique to write valid PNG bytes
  - Resize to all required iOS icon sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024px
  - Write the `Contents.json` manifest
- Splash screen: same gradient, centred icon, no text

### F7 — Capacitor Config Cleanup
**Status**: `[x]` Done
**Why**: The capacitor.config.ts still points to a placeholder server URL. Production builds need the real Vercel URL.
**Files**: `ios/App/capacitor.config.ts`, `ios/App/App/Info.plist`
**What to do**:
- Update `capacitor.config.ts`:
  - `appId`: `com.travelpanel.app`
  - `appName`: `TravelPanel`
  - `webDir`: `out` (Next.js static export) or keep `server.url` for dynamic
  - `plugins.SplashScreen`: `{ launchShowDuration: 0 }` (hide immediately since app is fast)
- Update `Info.plist`:
  - `CFBundleDisplayName`: `TravelPanel`
  - `CFBundleVersion` and `CFBundleShortVersionString`: `1.0.0`
  - Add location usage description strings (for GPS mode)
  - Privacy usage descriptions: NSLocationWhenInUseUsageDescription

### F8 — Accessibility Pass
**Status**: `[x]` Done
**Why**: App Store review and VoiceOver users need proper ARIA labels. Most buttons lack them.
**Files**: All component files
**What to do**:
- Add `aria-label` to all icon-only buttons (X close, trash delete, pencil edit, map pin, etc.)
- Add `role="button"` where appropriate (motion.div onClick handlers)
- Ensure all form inputs have associated labels
- Add `alt` text to all images (thumbnails, board covers)
- Test tab order on keyboard: header → content → bottom nav

---

## PHASE G — Performance & Quality

### G1 — Image Optimisation
**Status**: `[x]` Done
**Why**: Thumbnails from social platforms load slowly and cause layout shift. Optimizing them improves perceived performance.
**Files**: `components/InboxCard.tsx`, `components/BoardCard.tsx`
**What to do**:
- Add `loading="lazy"` to all thumbnail img tags
- Add explicit `width` and `height` attributes to prevent layout shift
- Add a blur-up effect: show a low-res placeholder (gray gradient) while loading, fade to real image
- Add `crossOrigin="anonymous"` where needed for CORS
- Cache-bust stale thumbnails with a timestamp query param if needed

### G2 — MapView Performance (Many Pins)
**Status**: `[ ]` Not started
**Why**: With 100+ clips, adding hundreds of MapLibre Marker elements causes DOM bloat. The GeoJSON source + symbol layer approach is faster.
**Files**: `components/MapView.tsx`
**What to do**:
- Convert from `<Marker>` components to a GeoJSON source + symbol layer
- Use MapLibre's `addImage` to register a custom SVG pin icon
- Keep the click handler via `map.on('click', 'pins-layer', ...)`
- Keep the cluster layer (already implemented from A6)
- Measure: with 200 items, the map should render in < 300ms

### G3 — IndexedDB Migration Guard
**Status**: `[ ]` Not started
**Why**: The DB schema is currently at v2. If the schema changes again (e.g. adding a field), users upgrading from v1 lose all their data or the DB fails silently.
**Files**: `lib/db.ts`
**What to do**:
- Add an `onupgradeneeded` handler for each version bump that safely migrates data
- Version 1→2: add the `trips` object store (already done but may not be guarded)
- Version 2→3: add a `userNotes` index on items (preparation for future)
- Write a `migrateDb` function that runs on version mismatch and logs success/failure
- Test: verify the DB opens cleanly on a fresh install and on an upgrade

### G4 — Error Boundary
**Status**: `[x]` Done
**Why**: If a component crashes (e.g. malformed item data), the entire app goes white. An error boundary recovers gracefully.
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`
**What to do**:
- Create a class component `ErrorBoundary` with `componentDidCatch`
- Wrap the `<div className="min-h-screen">` in layout with it
- Show a friendly recovery screen: "Something went wrong — tap to reload"
- Log the error to PostHog (`track('app_error', { message, stack })`)

### G5 — Bundle Size Audit
**Status**: `[ ]` Not started
**Why**: The app bundle may be large due to MapLibre (1.2MB gzipped) and jsPDF. Checking the actual size and adding code-splitting where needed.
**Files**: `next.config.js`, various pages
**What to do**:
- Run `ANALYZE=true npm run build` (using `@next/bundle-analyzer`)
- Identify the top 3 largest modules
- Apply dynamic imports where modules are large and not needed on initial load
- Target: main bundle < 200KB gzipped, MapLibre loaded lazily (already done via dynamic import)

---

## PHASE H — Monetisation Foundation

### H1 — Pro Tier Gate (UI only, no payment)
**Status**: `[ ]` Not started
**Why**: Before integrating Stripe, build the UI scaffolding for the Pro tier so the feature gating is already in place when payments go live.
**Files**: new `lib/proStatus.ts`, `components/ProBadge.tsx`, relevant pages
**What to do**:
- Create `lib/proStatus.ts`:
  - `isProUser()`: returns false for now (localStorage flag for testing)
  - `setProUser(v: boolean)`: sets the flag
- Create `ProBadge` component: "✨ Pro" chip in indigo
- Gate the following behind Pro:
  - Plan generation > 5/day (already rate-limited; Pro = unlimited, just show "Upgrade to Pro")
  - More than 3 saved trips per board
  - Future: Supabase sync, shared boards
- In the settings page, add a "Pro Plan" section showing current tier + "Coming soon" upgrade button

### H2 — App Store Privacy Labels
**Status**: `[x]` Done
**Why**: App Store submission requires privacy labels for every data type the app collects.
**Files**: new `docs/privacy-labels.md` (reference doc only, no code)
**What to do**:
- Document every data type the app collects:
  - Location data (GPS — used on-device only, not transmitted)
  - URLs (submitted to Anthropic API for extraction)
  - No account data, no purchase data
- Document what's shared with third parties:
  - Anthropic API (URLs + text for AI extraction — no PII)
  - PostHog (anonymous events — opt-outable)
- Write the privacy policy text (1 page, plain language)
- Create `app/privacy/page.tsx` with the policy (linked from Settings)

---

## Blocked (need external keys)

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Blocked on Supabase pgvector
**Needs**: Supabase project with pgvector enabled

### C3 — Shared Boards v1
**Status**: `[ ]` Blocked on Supabase auth
**Needs**: Supabase magic link / Google OAuth configured

---

## Completed Tasks

*(All Phase A–E tasks marked [x] in the previous version of this file)*
