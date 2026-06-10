# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-10)

Core extraction moat is complete. The app is ~85% of a beautiful iOS product.
Next sprint focuses on: iOS-native polish → App Store readiness → Cloud sync activation.

`D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → E1 → G1 → G2`

B4 (Embedding Search) remains blocked on Supabase pgvector — skip until B1 is activated with real keys.

---

## PHASE D — iOS Polish & Native Feel (Current Sprint)

### D1 — First-Launch Onboarding Carousel
**Status**: `[x]` Done
**Why**: The app opens to an empty map on first launch. New users have no idea what to do. A quick 3-step intro dramatically reduces abandonment.
**Files**: new `components/OnboardingSlides.tsx`, `app/page.tsx`
**What to do**:
- Create `OnboardingSlides` component: a full-screen overlay with 3 slides using `AnimatePresence` + `motion.div` (slide transitions)
  - Slide 1: "✈️ Clip any travel inspiration" — large emoji, short copy "Share posts from Instagram, YouTube, or 小红书 directly to TravelPanel. We extract every spot and tip automatically."
  - Slide 2: "🧠 Capture the wisdom" — "We don't just pin locations. We extract tips, warnings, and hidden-gem advice from every post — the stuff your friends actually told you."
  - Slide 3: "🗺️ Plan your perfect trip" — "When you're ready, AI builds a day-by-day itinerary from your saved clips, citing which post each activity came from."
- Each slide: full-screen gradient background (slide-specific: indigo → violet, amber → orange, green → teal), centered emoji (80px), h2 title, p description, bottom dot indicators, "Next" / "Get started" button
- Show when `localStorage.getItem('tp_onboarding_done')` is falsy
- On "Get started": set `localStorage.setItem('tp_onboarding_done', '1')` and unmount
- Rendered in `app/page.tsx` on top of everything (`fixed inset-0 z-50`)

### D2 — iOS Safe Area & Native Feel Improvements
**Status**: `[x]` Done
**Why**: On iPhone with Dynamic Island or notch, content can overlap the status bar or home indicator. The app also lacks iOS-native micro-interactions.
**Files**: `app/layout.tsx`, `app/globals.css`, `components/NavBar.tsx`, `app/page.tsx`
**What to do**:
- In `app/globals.css`, add:
  ```css
  :root {
    --sat: env(safe-area-inset-top, 0px);
    --sab: env(safe-area-inset-bottom, 0px);
    --sal: env(safe-area-inset-left, 0px);
    --sar: env(safe-area-inset-right, 0px);
  }
  ```
- Update `app/layout.tsx` `<meta name="viewport">` to include `viewport-fit=cover`
- Update `NavBar.tsx`: add `paddingBottom: calc(0.75rem + var(--sab))` to the nav container so it sits above the home indicator
- Update `app/page.tsx` top bar: add `paddingTop: calc(3rem + var(--sat))` so it clears the Dynamic Island
- Add `-webkit-overflow-scrolling: touch` to all `overflow-y-auto` scroll containers (in globals.css)
- Add `touch-action: manipulation` to all buttons in globals.css (prevents 300ms tap delay on iOS)
- Ensure `select-none` on drag handles and non-text elements

### D3 — App-Level Error Boundary
**Status**: `[x]` Done
**Why**: Any unhandled React render error currently whites out the entire app with no recovery path. On a phone this is a dead end.
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`
**What to do**:
- Create `components/ErrorBoundary.tsx` as a React class component (error boundaries must be class components):
  ```tsx
  class ErrorBoundary extends React.Component<{children: ReactNode}, {error: Error | null}> {
    state = { error: null };
    static getDerivedStateFromError(error: Error) { return { error }; }
    componentDidCatch(error: Error, info: ErrorInfo) { /* track to PostHog */ }
    render() { if (this.state.error) return <ErrorFallback onReset={() => this.setState({error: null})} />; return this.props.children; }
  }
  ```
- `ErrorFallback`: centered white screen, "🚨" emoji, "Something went wrong" title, error.message in a gray `<pre>` (dev only), "Reload app" button that calls `window.location.reload()`, secondary "Clear data & reload" button that calls `indexedDB.deleteDatabase('TravelPanel')` then reloads
- Wrap the entire `<body>` content in `app/layout.tsx` with `<ErrorBoundary>`
- In `componentDidCatch`, call `track('app_crash', { message: error.message, stack: info.componentStack?.slice(0, 500) })`
- Add `'app_crash'` to the `AnalyticsEvent` union in `lib/analytics.ts`

### D4 — Offline Indicator Banner
**Status**: `[x]` Done
**Why**: When the user loses connection, AI enrichment fails silently. An offline banner sets expectations and prevents repeated tapping.
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx`
**What to do**:
- Create `components/OfflineBanner.tsx`:
  - `useEffect` registers `window.addEventListener('online', ...)` and `'offline'` event listeners
  - State: `isOnline` (default `navigator.onLine ?? true`)
  - When offline: animate in a slim banner (`fixed top-0 left-0 right-0 z-[9999]`) — dark charcoal background, white text "📡 No internet connection — clips will save when reconnected", 44px height
  - When back online: briefly show "✓ Back online" in green for 2s, then animate out
  - Use `AnimatePresence` + `motion.div` with `y: -44` initial/exit, `y: 0` animate
- Render `<OfflineBanner />` in `app/layout.tsx` inside the body, before children
- Cleanup: remove event listeners on unmount

### D5 — Pull-to-Refresh on Inbox & Boards
**Status**: `[x]` Done
**Why**: Standard iOS gesture. Users expect it. Without it the app feels unresponsive when clips don't update.
**Files**: new `hooks/usePullToRefresh.ts`, `app/inbox/page.tsx`, `app/boards/page.tsx`
**What to do**:
- Create `hooks/usePullToRefresh.ts`:
  - Accepts `onRefresh: () => Promise<void>`, `containerRef: RefObject<HTMLElement>`
  - Tracks `touchstart`, `touchmove`, `touchend` on the container ref
  - When pull distance > 60px from top-of-scroll (scrollTop === 0), show a spinner and call `onRefresh()`
  - Returns `{ isPulling: boolean; pullDistance: number; isRefreshing: boolean }`
- In `app/inbox/page.tsx`:
  - Attach hook to the `flex-1 overflow-y-auto` div
  - Show a `motion.div` at top of scroll area: circular spinner that scales from 0→1 as pull distance increases (threshold 60px = scale 1.0)
  - On release: run `enrichmentRetry` + `router.refresh()`
- In `app/boards/page.tsx` (the boards list page): same pattern, refresh boards list
- Minimum refresh time: 800ms (use `Promise.all([onRefresh(), sleep(800)])`) so spinner doesn't flash

### D6 — Location Permission Explanation Sheet
**Status**: `[ ]` Not started
**Why**: iOS users see a bare system dialog with no context. Explaining WHY before the dialog shows dramatically improves permission grant rates.
**Files**: new `components/LocationPermissionSheet.tsx`, `app/page.tsx`
**What to do**:
- Create `components/LocationPermissionSheet.tsx`:
  - Full-screen modal overlay (semi-transparent dark bg), bottom sheet (white, rounded-t-3xl)
  - Large location pin icon (indigo, 64px)
  - Title: "See spots near you"
  - Body: "TravelPanel uses your location to surface saved clips within 1km — the hidden gems you bookmarked for exactly this moment. Your location is never stored or shared."
  - "Allow location" button (indigo, full-width) → calls `navigator.geolocation.getCurrentPosition()` then dismisses
  - "Not now" text link → dismisses, sets `localStorage.setItem('tp_location_declined', '1')`
- In `app/page.tsx`, when the Navigate FAB is tapped for the first time AND `Notification.permission` hasn't been asked AND `tp_location_declined` is not set: show this sheet first instead of immediately calling geolocation
- Track `location_permission_shown`, `location_permission_granted`, `location_permission_declined` in PostHog
- Add these 3 events to `AnalyticsEvent` union in `lib/analytics.ts`

### D7 — Haptic Feedback on Key Actions
**Status**: `[ ]` Not started
**Why**: On native iOS, haptics signal successful actions (save, delete, complete). Without them the app feels like a web page, not a native app.
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/InboxCard.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `lib/haptics.ts`:
  ```ts
  // Uses Capacitor Haptics if available, falls back to navigator.vibrate (web)
  async function impact(style: 'light' | 'medium' | 'heavy') { ... }
  async function notification(type: 'success' | 'warning' | 'error') { ... }
  async function selection() { ... }
  export const haptics = { impact, notification, selection };
  ```
  - Check `typeof Capacitor !== 'undefined' && Capacitor.isPluginAvailable('Haptics')` before importing `@capacitor/haptics`
  - Web fallback: `navigator.vibrate?.(style === 'light' ? 10 : style === 'medium' ? 20 : 40)`
- Add `@capacitor/haptics` to package.json (it's in the Capacitor ecosystem, install with `npm install @capacitor/haptics`)
- Trigger `haptics.notification('success')` when a clip is successfully saved (in `app/share/page.tsx` after enrichment completes)
- Trigger `haptics.impact('medium')` when a clip card is long-pressed / delete confirmed (in `InboxCard.tsx`)
- Trigger `haptics.notification('success')` when a trip plan finishes generating (in `app/plan/[boardId]/page.tsx` when streaming completes)
- Trigger `haptics.impact('light')` on navigation tab switches (in `NavBar.tsx`)

### D8 — Skeleton Loading States for Map Pins
**Status**: `[ ]` Not started
**Why**: The map shows blank grey until items load from IndexedDB. A subtle loading treatment tells users the app is working.
**Files**: `components/MapView.tsx`, `app/page.tsx`
**What to do**:
- In `app/page.tsx`, pass a `loading` prop to `MapView` (true while `itemsLoading || boardsLoading`)
- In `MapView.tsx`, when `loading` is true:
  - Show a `LoadingOverlay` in the bottom-left corner (NOT covering the whole map): pill-shaped white card, 3 animated pulse dots, "Loading your clips…" text — 140px wide, positioned `bottom: 80px, left: 12px`
  - Animate it out (opacity → 0) once `loading` becomes false
- Also: add `MapView` prop `itemCount?: number` — when 0 and not loading, show a centered map overlay card: "📍 No places yet" subtitle "Save clips to see them on the map" — semi-transparent white card, 200px wide, centered

---

## PHASE E — Cloud Sync & Auth Activation

### E1 — Supabase Auth UI (Magic Link + Google)
**Status**: `[ ]` Not started
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Why**: B1 scaffolded `lib/supabase.ts` and `lib/cloudSync.ts` but there's no way to sign in. This is the gate for multi-device sync.
**Files**: new `components/AuthModal.tsx`, `app/settings/page.tsx`, `lib/supabase.ts`
**What to do**:
- Create `components/AuthModal.tsx`:
  - Bottom sheet modal (same pattern as board selector)
  - "Sign in to sync across devices" header
  - Email input → "Send magic link" button → `supabase.auth.signInWithOtp({ email })`
  - Google OAuth button → `supabase.auth.signInWithOAuth({ provider: 'google' })`
  - Success state: "Check your email for a sign-in link"
  - Error state: "Sign-in failed — check your email and try again"
- In `app/settings/page.tsx`:
  - Add "Cloud Sync" section at the top (above Export)
  - If `cloudEnabled` (from `lib/supabase.ts`): show sign-in status, email, "Sign out" button, "Sync now" button, last sync timestamp
  - If not `cloudEnabled`: show a dormant "Cloud sync available with Supabase" info card (no button) — cloud sync activates automatically once keys are present
  - If `cloudEnabled` and not signed in: show "Sign in to sync" button → opens `AuthModal`
- On auth state change (`supabase.auth.onAuthStateChange`): call `syncNow()` from `lib/cloudSync.ts`

### E2 — Background Sync on App Focus
**Status**: `[ ]` Not started
**Needs**: E1 complete + Supabase keys
**Files**: `app/layout.tsx`, `lib/cloudSync.ts`
**What to do**:
- In `app/layout.tsx`, add a client component `SyncOnFocus` that:
  - Registers `window.addEventListener('focus', handleFocus)`
  - `handleFocus`: if user is signed in and online, call `syncNow()` (debounced — no more than once per 30s)
  - On initial mount: call `syncNow()` once
- Update `lib/cloudSync.ts` `syncNow()` to also update a `syncedAt` key in localStorage so `app/settings/page.tsx` can display "Last synced: 3 min ago"

---

## PHASE G — App Store Launch

### G1 — Privacy Policy & Terms Pages
**Status**: `[ ]` Not started
**Why**: Required by App Store. Apple will reject without a privacy policy link.
**Files**: new `app/privacy/page.tsx`, new `app/terms/page.tsx`, `app/settings/page.tsx`
**What to do**:
- Create `app/privacy/page.tsx`: static page with a complete, honest privacy policy. Key points:
  - Data stored locally on device (IndexedDB) by default
  - If cloud sync enabled: data synced to Supabase (describe what's stored: clips, boards, trip plans)
  - Location data: used only on-device for nearby-spots feature, never sent to servers
  - Claude AI: URLs + post content are sent to Anthropic API for extraction (no PII retention)
  - PostHog: anonymous usage analytics (can be opted out)
  - No ads, no data selling, no tracking across apps
  - Contact: jiangnan027@gmail.com
  - Styled consistently with the app (white bg, indigo accents, max-w-2xl centered, proper headings)
- Create `app/terms/page.tsx`: similarly styled Terms of Service (permitted use, no warranty, governing law)
- In `app/settings/page.tsx`: add "Legal" section at the bottom with links to `/privacy` and `/terms`

### G2 — App Store Screenshot Frames
**Status**: `[ ]` Not started
**Why**: App Store requires polished screenshots. The current UI is good; it just needs framing + captions.
**Files**: new `app/screenshots/page.tsx`
**What to do**:
- Create `app/screenshots/page.tsx` — a special "screenshot mode" page (not in nav) that renders 5 screenshot compositions in 390×844px frames (iPhone 15 Pro size):
  - Screen 1: Home map with pins + nearby spots tray visible. Caption overlay: "Clip from anywhere. See everything."
  - Screen 2: Inbox with substance visible on a card (expanded). Caption: "Not just pins — the wisdom behind them."
  - Screen 3: Plan view (itinerary with day strips + sourced tips). Caption: "AI plans trips from YOUR saved clips."
  - Screen 4: Board detail view (grid + timeline toggle). Caption: "Organize inspiration into trip boards."
  - Screen 5: Share view (shared board with items expanded). Caption: "Share boards with friends."
- Each frame: iPhone bezel (simple SVG rounded rect with notch), app UI inside, gradient background behind bezel, caption text below
- Page is print-ready (use `@media print` CSS to hide the navigation). Link from `/settings` with `?mode=screenshots` param so it's accessible but not prominent.

---

## PHASE B — Remaining

### B4 — Embedding / Vibe Search
**Status**: `[ ]` Not started (BLOCKED — needs Supabase pgvector from B1/E1)
**What to do**: Embed clip title + substance text using `text-embedding-3-small` (OpenAI) or a local model. Store vectors in Supabase pgvector. Add semantic search UI that queries "find me minimalist cafes in Tokyo" by cosine similarity.

---

## All Previously Completed Tasks (Phases A–C)

### Phase A — Bug-Free MVP
- [x] A1 — Substance Extraction (2-layer clip schema)
- [x] A2 — Enrichment Retry Queue
- [x] A3 — Error Tracking (PostHog)
- [x] A4 — AI Cost Guard
- [x] A5 — In-App Resource Request Notifications
- [x] A6 — Pin Clustering at Low Zoom
- [x] A7 — Full-Text Search on Clips
- [x] A8 — Onboarding Seed Boards
- [x] A9 — Plan Export (PDF + Calendar)
- [x] A10 — Multi-Version Plan Support
- [x] A11 — Surface Substance in Clip Detail (Wisdom view)
- [x] A12 — Thread Substance into Trip Plans

### Phase B — Cloud Sync + Auth
- [~] B1 — Supabase Setup (scaffolded, dormant until keys)
- [x] B2 — Browser Extension
- [x] B3 — Xiaohongshu Fix (Claude Vision)
- [x] B5 — Cloud Backup Export

### Phase C — On-Trip Mode
- [x] C1 — On-Trip GPS Mode
- [x] C2 — Post-Trip Timeline
- [x] C3 — Shared Boards v1
- [x] C4 — Proactive Resurfacing
