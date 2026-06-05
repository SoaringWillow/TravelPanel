# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Current Status Summary (2026-06-05)

All Phase A–H tasks completed. The app is production-ready with:
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
- 3-step onboarding flow (F1)
- Pull-to-refresh on inbox (F2)
- Illustrated SVG empty states (F3)
- Share sheet quick board picker (F4)
- Clip count badges on map pins (F5)
- iOS app icons + splash config (F6+F7)
- Accessibility pass (F8)
- Image optimisation (G1)
- MapView GeoJSON performance (G2)
- IndexedDB v3 migration guard (G3)
- Error boundary (G4)
- Bundle size audit + analyzer setup (G5)
- App Store privacy labels + privacy policy page (H2)
- Pro tier gate UI scaffolding (H1)

**Blocked** (need Supabase keys):
- B4: pgvector embedding search
- C3: Shared boards

---

## ⭐ Next Phase: I — App Store Submission & Post-Launch

All Phase A–H tasks are done. The remaining work is:
1. **I — App Store Submission** — final submission checklist
2. **J — Post-Launch** — analytics, feedback loop, growth

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
**Status**: `[x]` Done
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
**Status**: `[x]` Done
**Why**: With 100+ clips, adding hundreds of MapLibre Marker elements causes DOM bloat. The GeoJSON source + symbol layer approach is faster.
**Files**: `components/MapView.tsx`
**What to do**:
- Convert from `<Marker>` components to a GeoJSON source + symbol layer
- Use MapLibre's `addImage` to register a custom SVG pin icon
- Keep the click handler via `map.on('click', 'pins-layer', ...)`
- Keep the cluster layer (already implemented from A6)
- Measure: with 200 items, the map should render in < 300ms

### G3 — IndexedDB Migration Guard
**Status**: `[x]` Done
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
**Status**: `[x]` Done
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
**Status**: `[x]` Done
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

## PHASE I — App Store Submission

### I1 — TestFlight Beta Build
**Status**: `[ ]` Not started
**Why**: Before App Store review, TestFlight validates the end-to-end native app experience including the Share Extension.
**Files**: `ios/` Xcode project, Xcode Cloud / manual archive
**What to do**:
- Ensure `CFBundleVersion` increments with each archive (use `1.0.0` / build `1`)
- Add required entitlements: App Group (`group.com.travelpanel.app`) for Share Extension data passing
- Test Share Extension on a real device via TestFlight (simulator can't test share sheets fully)
- Verify VoiceOver labels on main nav buttons (tab bar, clip cards, map pins)
- Submit to TestFlight for internal testing (1 device minimum)

### I2 — App Store Screenshots
**Status**: `[ ]` Not started
**Why**: App Store requires 6.7" (iPhone 15 Pro Max) screenshots. These are the first thing users see.
**Files**: No code change — screenshots taken via Simulator or device
**What to do**:
- Take 5 screenshots covering the key flows:
  1. Map view with pins (the main screen)
  2. Inbox with a filled clip card showing substance tags
  3. Share sheet → board picker flow
  4. Board detail with clips and Plan button
  5. Generated trip plan view (day strip + map)
- Size: 1290×2796px (iPhone 15 Pro Max, 6.7")
- Add simple text overlays (e.g. "Save from anywhere", "AI plans it for you")
- Export as PNG

### I3 — App Store Listing Copy
**Status**: `[ ]` Not started
**Why**: The App Store listing needs a compelling title, subtitle, and description that hits the right keywords.
**Files**: No code — copy document only
**What to do**:
- App name: `TravelPanel`
- Subtitle (30 chars): `AI travel planner & clipper`
- Description (4000 chars): Highlight the moat (substance not just pins), Share Sheet speed, AI trip planning
- Keywords (100 chars): `travel,trip planner,AI,itinerary,save places,instagram,travel plan`
- Category: `Travel`
- Age rating: 4+

### I4 — Deep Link & URL Scheme Validation
**Status**: `[ ]` Not started
**Why**: The iOS Share Extension writes to an App Group; the main app reads it on foreground. This needs testing on a real device.
**Files**: `ios/App/ShareExtension/ShareViewController.swift`, `ios/App/App/AppDelegate.swift`
**What to do**:
- Verify `group.com.travelpanel.app` App Group is configured in both targets in Xcode
- Test: share a YouTube URL via the system share sheet → app opens → share page shows URL pre-filled
- Test: app backgrounded → share → app foregrounded → URL appears (AppGroup fallback path)
- Add `@AppGroupStorage` key consistency check between ShareExtension and main app

---

## PHASE J — Post-Launch

### J1 — Crash Reporting Integration
**Status**: `[ ]` Not started
**Why**: PostHog captures custom events but not native iOS crashes. Sentry gives stack traces for production crashes.
**Files**: `ios/App/App/AppDelegate.swift`, `package.json`
**What to do**:
- Add `@sentry/capacitor` package
- Initialize Sentry in AppDelegate with a DSN (add to `.env.local`)
- Wrap the root layout in Next.js with `Sentry.init()`
- Test: throw a deliberate error on web → verify Sentry receives it
- Cost: free tier (5K events/month) is sufficient at launch

### J2 — Referral / Share-a-Plan Feature
**Status**: `[ ]` Not started
**Why**: Every generated plan is shareable content. A "Share this plan" button with a beautiful preview card is organic marketing.
**Files**: `app/plan/[boardId]/page.tsx`
**What to do**:
- Add a "Share Plan" button below the completed plan
- Generate a share card: plan title + day count + destination highlights
- Use the Web Share API (`navigator.share()`) on mobile, fallback to clipboard copy
- On iOS native: use `@capacitor/share` plugin
- Include a deep link to the plan (future: via Supabase public URL)

### J3 — Weekly Digest Notification (iOS)
**Status**: `[ ]` Not started
**Why**: Re-engagement drives the Weekly Clips metric. A Sunday notification "You've saved 5 places this week — ready to plan?" brings users back.
**Files**: `ios/App/App/AppDelegate.swift`, new `lib/notifications.ts`
**What to do**:
- Request notification permission on first map view (after onboarding)
- Schedule a local notification: every Sunday at 10am, "You have {N} unplanned clips"
- Use `@capacitor/local-notifications`
- Count clips saved in the past 7 days from IndexedDB

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
