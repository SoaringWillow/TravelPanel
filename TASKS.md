# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-05-31)

The moat is **Substance over Spots**. A1 made the app *extract* substance, but it's
currently invisible (only a count badge) and the trip planner throws it away. The two
highest-value tasks are surfacing substance (A11) and threading it into plans (A12) —
do these before clustering/search polish.

`A11 → A12 → A3 → A7 → A8 → A6 → A9 → A10`

(A3 is NOT blocked — it no-ops without a key. Build it now; it just stays dormant
until `NEXT_PUBLIC_POSTHOG_KEY` is provided.)

---

## PHASE A — Bug-Free MVP (Current Sprint)

### A1 — Substance Extraction (2-layer clip schema) 🔴 HIGHEST PRIORITY
**Status**: `[x]` Done  
**Why**: This is the #1 strategic moat. Currently `api/import/route.ts` only extracts spots (locations + coordinates). It must ALSO extract substance: tips, warnings, opinions, "go in the morning"-style wisdom from the post content.  
**File to change**: `app/api/import/route.ts`  
**What to do**:
- Extend the Zod schema to add a `substance` array alongside `locations`
- Each substance item: `{ type: 'tip'|'warning'|'opinion'|'wisdom'|'context'|'recommendation', content: string, applies_to?: string, source_quote?: string }`
- Update the Claude prompt to explicitly ask for both layers
- Update the DB schema in `lib/db.ts` to store `substance: SubstanceItem[]` on `SavedItem`
- Update `lib/types.ts` with the `SubstanceItem` type
- Update `components/InboxCard.tsx` to show substance count badge (e.g. "3 tips")

### A2 — Enrichment Retry Queue 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: Enrichment is currently fire-and-forget. Items silently fail to enrich (no error, no retry). Users see empty cards. This is a retention killer.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`, possibly a new `lib/retryQueue.ts`  
**What to do**:
- On enrichment failure, set `enrichmentStatus: 'failed'` and increment `retryCount`
- Create a retry mechanism: on app load, find items with `status: 'failed'` and `retryCount < 3`, re-attempt enrichment with exponential backoff (2s, 4s, 8s)
- Show a subtle "Retrying..." indicator on failed cards
- After 3 failures, show a "Failed to extract info" state with a manual retry button

### A3 — Error Tracking (PostHog)
**Status**: `[x]` Done  
**Needs**: `NEXT_PUBLIC_POSTHOG_KEY` env var (free tier) — but NOT a blocker; wrappers no-op without it  
**Files to change**: `app/layout.tsx`, new `lib/analytics.ts`  
**What to do**:
- Install `posthog-js`
- Create `lib/analytics.ts` with `track(event, props)` and `identify(userId)` wrappers that no-op if key is missing
- Add PostHog provider to `app/layout.tsx`
- Track key events: `clip_saved`, `plan_generated`, `board_created`, `search_performed`
- If `NEXT_PUBLIC_POSTHOG_KEY` is missing, trigger resource request notification (see A5)

### A4 — AI Cost Guard
**Status**: `[x]` Done  
**Why**: Heavy users can spike API spend with no ceiling. No visibility into per-user cost.  
**Files to change**: `app/api/plan/route.ts`, `app/api/import/route.ts`  
**What to do**:
- Add a simple per-session rate limit: max 10 enrichments per hour (track in localStorage), max 5 plan generations per day (track in IndexedDB)
- When limit is hit, show a friendly message: "You've hit the daily plan limit. Upgrade to Pro for unlimited plans — coming soon."
- Log token usage per request to console in dev mode (foundation for cost tracking)

### A5 — In-App Resource Request Notifications
**Status**: `[x]` Done  
**Files**: new `components/ResourceBanner.tsx`, new `app/api/notify/route.ts`  
**What to do**:
- Create a banner component that checks for missing env vars and shows what's needed
- Create `app/api/notify/route.ts` that sends an email via Resend to jiangnan027@gmail.com when a resource is needed
- Env vars to check: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`
- If `RESEND_API_KEY` is missing, fall back to a mailto: link
- **NOTE**: Ask user for `RESEND_API_KEY` to enable email notifications (free tier: 100 emails/day)

### A6 — Pin Clustering at Low Zoom
**Status**: `[x]` Done  
**Files to change**: `components/MapView.tsx`  
**What to do**:
- Enable MapLibre's built-in cluster layer on the locations source
- Show count badge on clustered pins
- On click of cluster, zoom in to reveal individual pins
- Individual pin color should reflect tag category (food=orange, nature=green, culture=purple, etc.)

### A7 — Full-Text Search on Clips
**Status**: `[x]` Done  
**Files**: new `components/SearchBar.tsx`, `app/page.tsx` or `app/inbox/page.tsx`  
**What to do**:
- Add a search bar to the main board/inbox view
- Client-side search across clip title + description + tags + substance content (if present)
- Debounced (300ms), highlights matching text
- Empty state: "No clips match '[query]'. Try a different search."
- Foundation for embedding search in Phase B

### A8 — Onboarding Seed Boards
**Status**: `[x]` Done  
**Files**: new `lib/seedData.ts`, `app/page.tsx`  
**What to do**:
- Create 3 seed boards with real-looking clip data (Tokyo, Kyoto, Bali or similar)
- Each seed board has 4–6 clips with locations, tags, and substance items
- Show these on first launch (detect via a `hasSeenOnboarding` flag in localStorage)
- User can dismiss ("I'll add my own clips") or keep them
- Seed data should showcase the substance layer: each clip has at least 2 substance items

### A9 — Plan Export (PDF + Calendar)
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, new `lib/exportPlan.ts`  
**What to do**:
- Add Export button to the plan view
- PDF: use `jspdf` to generate a clean print-layout PDF with day-by-day itinerary
- Calendar: generate `.ics` file (RFC 5545) with one event per activity, including location coordinates for Apple Maps deep link
- Both exports include source citations from substance items

### A10 — Multi-Version Plan Support
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`  
**What to do**:
- Allow saving a named plan variant ("Relaxed pace", "Budget version")
- Store multiple plans per board in IndexedDB (`trips` store)
- Show plan version selector at top of plan view
- "Regenerate" creates a new version (doesn't overwrite current)

### A11 — Surface Substance in Clip Detail (the "Wisdom view") 🔴 HIGHEST PRIORITY
**Status**: `[x]` Done  
**Why**: A1 extracts substance but `LocationDetailCard` never shows it — the moat is invisible. This is the payoff for the count badge users already see.  
**Files to change**: `components/LocationDetailCard.tsx`, possibly a new `components/SubstanceList.tsx`  
**What to do**:
- Add a "Wisdom" section to the detail card rendering `item.substance`
- Group by type with an icon/color per type: tip 💡, warning ⚠️, opinion 💬, wisdom 🧠, context 🌍, recommendation ⭐
- Show `content`; if `source_quote` present, show it as a subtle italic citation under the content
- Extract a reusable `SubstanceList` so the plan view (A12) can reuse it
- Empty state: don't render the section if `substance` is empty

### A12 — Thread Substance into Trip Plans (sourced itineraries) 🔴 HIGHEST PRIORITY
**Why**: The strategic promise is "the trip planner generates an itinerary that *cites the source clips inline*." Currently `/api/plan` builds `contentSummary` from only `title/activities/tags` — substance is dropped, so plans can't cite wisdom. This wires the moat end-to-end.  
**Status**: `[x]` Done  
**Files to change**: `app/api/plan/route.ts`, `lib/types.ts` (Activity/DayPlan), `components/DayStripCard.tsx` or plan view  
**What to do**:
- Include each item's `substance` (with source title) in the `contentSummary` passed to the planner
- Update the planner prompt: when an activity is informed by a clip's tip/warning, surface that wisdom in the activity's `tips` and note which saved clip it came from
- Add an optional `sourcedTips?: { content: string; sourceTitle: string }[]` to the `Activity` type so citations render distinctly from generic tips
- In the day plan UI, render sourced tips with a "from your clip: <title>" attribution
- Keep it graceful: items without substance still plan fine

---

## PHASE B — Cloud Sync + Auth (Next Sprint)

### B1 — Supabase Setup
**Status**: `[~]` Scaffolded, dormant until keys  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (request from user)  
**Done** (no-op-until-keyed, same pattern as PostHog A3 — activates the moment keys are pasted):
- `lib/supabase.ts` — lazy client + auth (magic link, Google OAuth, session, auth-change sub); `cloudEnabled` flag
- `supabase/schema.sql` — Postgres mirror of IndexedDB (items/boards/trips as JSONB) + per-user RLS + indexes
- `lib/cloudSync.ts` — `pushToCloud`/`pullFromCloud`/`syncNow`, last-write-wins, demo content excluded
- `.env.local.example` — documents the two Supabase vars
- `@supabase/supabase-js` added to deps + lockfile
**Remaining to fully activate** (next session, once keys exist): create Supabase project, run `schema.sql`,
add a sign-in UI surface, wire `syncNow()` on auth + app focus, enable Google provider in the dashboard.

### B2 — Browser Extension
**Status**: `[x]` Done  
**What to do**: Chrome/Safari extension that clips the current page URL into TravelPanel

### B3 — Xiaohongshu Fix (Claude Vision)
**Status**: `[x]` Done  
**What to do**: Accept image payload from iOS Share Sheet, use Claude Vision to extract metadata + substance

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Not started  
**Needs**: Supabase pgvector (from B1)  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page

---

## PHASE D — iOS Polish & Core UX (Current Sprint)

> Goal: Ship a beautiful, native-feeling app. Every screen should feel intentional on iPhone.
> Execution order: D2 → D3 → D4 → D5 → D6 → D7 → D8 → D1 (needs keys) → D9 → D10

### D1 — Supabase Full Activation 🔴 BLOCKED (needs keys)
**Status**: `[ ]` Not started  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from user  
**Files**: `app/settings/page.tsx`, `app/layout.tsx`, new `components/AuthModal.tsx`  
**What to do**:
- Add a "Sign in" button to the Settings page that opens an AuthModal
- AuthModal: email magic-link form + "Continue with Google" button (uses `lib/supabase.ts` auth)
- Wire `syncNow()` from `lib/cloudSync.ts` on: auth state change, app focus, after any clip save
- Show sync status badge in Settings (last synced timestamp, "Syncing…" animation)
- Once logged in, Settings page shows the user's email and a "Sign out" button

### D2 — Swipe Gestures on Clip Cards 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: Swipe-to-delete and swipe-to-move are the standard iOS UX pattern. Without them, the app feels like a web page, not an app.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Swipe left on a card: reveal a red Delete action and a blue Move action (using `framer-motion` drag or a simple touch handler)
- Swipe right: reveal a green "Done/Archive" action (marks substance as read, or fast-moves to board)
- The swipe reveals a colored background with icon + label (same pattern as iOS Mail)
- At 60% swipe, auto-trigger the action with haptic confirmation
- Use `useMotionValue` + `useTransform` from framer-motion for smooth gesture tracking

### D3 — Haptic Feedback Throughout 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: Every iOS app uses haptics for confirmation. Without them, interactions feel unresponsive.  
**Files**: new `lib/haptics.ts`, `components/InboxCard.tsx`, `app/share/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `impact(style)`, `notification(type)`, `selection()` wrappers that call `window.navigator.vibrate()` on web and Capacitor Haptics on native
- `impact('light')` — chip selection, filter toggle, card tap
- `impact('medium')` — clip saved, board created, action confirmed
- `notification('success')` — enrichment done, plan generated, export complete
- `notification('error')` — enrichment failed, rate limit hit
- `selection()` — swipe gesture threshold crossed, context menu opened

### D4 — Shimmer Skeleton Loaders
**Status**: `[x]` Done  
**Why**: Spinners feel dated; skeletons show shape and reduce perceived load time.  
**Files**: new `components/SkeletonCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/settings/page.tsx`  
**What to do**:
- Create `SkeletonCard` component: animated shimmer (CSS `@keyframes` gradient sweep) in the shape of an InboxCard (thumbnail placeholder + 2 text lines)
- Replace the loading spinner in the inbox with 4 SkeletonCards stacked
- Add skeleton for boards grid: 4 placeholder board cards in a 2×2 grid
- Settings stats row: skeleton numbers while loading
- Shimmer animation: `background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)` with `backgroundSize: 200% 100%` animated

### D5 — Pull-to-Refresh on All Lists
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add a pull-to-refresh gesture on the inbox and boards list (use a simple touch event handler or a small library)
- On pull: trigger `enrichItem` retry for all `failed`/`pending` items (reuses existing retry logic)
- Show a spinner that follows the pull distance (rubber-band spring feel)
- On boards: re-fetch board list + trigger a sync if Supabase is connected

### D6 — Detail Card Polish (Hero Image + Swipe-to-Close)
**Status**: `[x]` Done  
**Files**: `components/LocationDetailCard.tsx`  
**What to do**:
- If the clip has a `thumbnail`, show it as a full-width hero image at the top of the detail card (max 180px height, `object-cover`, slight rounded-top corners)
- Add swipe-down-to-close gesture: track `dragY`, when dragged >80px dismiss the card (with spring animation out the bottom)
- Add a pill drag handle at the very top (gray bar, 36×4px, centered) — standard iOS bottom sheet indicator
- Add a native-style share button (Upload icon) in the top-right of the detail card header that triggers `navigator.share()` with the clip URL and title

### D7 — Context Menus (Long-Press) on Cards
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `app/boards/page.tsx`  
**What to do**:
- Long-press on a clip card (>400ms): show a `popover` or `div`-based context menu with: Open, Move to Board, Copy URL, Delete
- Long-press on a board card: show: Open, Rename, Delete
- The context menu should animate in with a scale+fade effect, dismiss on tap-outside
- Board rename: inline text input in the context menu (or a small modal)
- On mobile, this replaces the need for visible edit buttons which clutter the UI

### D8 — Board Cover + Item Count Badges
**Status**: `[x]` Done  
**Files**: `app/boards/page.tsx`, `lib/db.ts`  
**What to do**:
- On the boards grid, show the board cover thumbnail (first clip's thumbnail) as a card background, darkened with a gradient overlay
- If no thumbnail is available, show the emoji at a large size on an indigo gradient background
- Item count badge in the top-right of the board card (e.g., "12 clips")
- When the user reorders boards (long-press drag), update the boards array in IndexedDB
- Add `updateBoard(boardId, partial)` helper to `lib/db.ts`

### D9 — On-Trip GPS Mode (Active Navigation View) 🔴 KEY FEATURE
**Status**: `[x]` Done  
**Why**: This completes the core use case: user clips destinations → plans a trip → navigates in real-time.  
**Files**: new `app/trip/[tripId]/navigate/page.tsx`, `components/RouteMapView.tsx`  
**What to do**:
- New full-screen map view accessible from the plan view: "Start Trip" button
- Shows the user's real-time GPS position (use `navigator.geolocation.watchPosition`)
- Highlights the next destination in the plan with a pulsing pin
- Shows distance and ETA to the next spot (straight-line distance as fallback, no routing API needed)
- "Next stop" button advances the active waypoint
- Background location updates via Capacitor `@capacitor/geolocation`
- Auto-opens Maps app with directions when user taps on next-stop pin

### D10 — Post-Trip Timeline
**Status**: `[x]` Done  
**Files**: new `app/trip/[tripId]/timeline/page.tsx`, `lib/db.ts`  
**What to do**:
- After a trip, prompt "Log what you actually visited"
- Simple checkmark UI: each planned activity has a ✓ (visited), ✗ (skipped), or ✎ (add note) button
- Stores an `actualTimeline` on the Trip object in IndexedDB
- Generates a simple "Your Tokyo Trip" summary view: X of Y planned spots visited, substance items that turned out to be true/false based on notes
- Export as a simple share image (HTML canvas → PNG)

---

## PHASE E — Cloud, Social & Discovery

> Goal: Multi-device sync, sharing with friends, and discovering new destinations.
> Needs B1 Supabase keys to begin.

### E1 — B4 Embedding/Vibe Search (Semantic)
**Status**: `[ ]` Blocked on Supabase pgvector  
**Needs**: B1 Supabase keys + pgvector extension enabled  
**Files**: `app/api/embed/route.ts` (new), `app/inbox/page.tsx`, `components/SearchBar.tsx`  
**What to do**:
- After each clip is enriched, POST to `/api/embed` to generate an embedding (use `voyage-3-lite` via Voyage AI or OpenAI `text-embedding-3-small`)
- Store the vector in Supabase's `items` table (pgvector column)
- Update `SearchBar` to support two modes: keyword (existing) and vibe (semantic)
- Vibe search: POST query to `/api/embed`, get vector, run `<->` similarity query against Supabase
- Show "Vibe search" pill above results; include a note "Finds similar vibes, not just exact matches"
- Toggle between modes with a segmented control

### E2 — Shared Boards
**Status**: `[ ]` Blocked on Supabase auth  
**Files**: `app/boards/[boardId]/share/page.tsx` (new), `app/api/share/route.ts` (new)  
**What to do**:
- "Share board" option in board context menu
- Creates a public read-only URL: `/boards/{boardId}/share?token={jwt}`
- The shared view shows the board's clips, map, and substance (read-only, no auth required)
- Share token is stored in Supabase with expiry (7 days or permanent)
- Recipient can "Add to my TravelPanel" (clones the board into their account)

### E3 — Proactive Resurfacing (Smart Notifications)
**Status**: `[ ]` Blocked on Supabase + push notifications  
**What to do**:
- When the user is near a saved location (GPS geofence), send a push notification: "📍 You're near Tsukiji Market — you saved this 3 months ago"
- Use Capacitor local notifications for iOS
- Geofence radius: 500m
- Max 1 notification per day per clip
- Opt-in from Settings with a toggle

### E4 — Import from Maps & Bookmarks
**Status**: `[x]` Done  
**What to do**:
- "Import from Google Maps saved places" — user pastes the Google Takeout JSON export, we parse locations and create clips
- "Import from Apple Maps" — parse shared `.maps` links or clipboard URLs
- "Import from browser bookmarks" — accept HTML bookmark exports, filter for travel-related URLs, batch-enrich them
- Batch import page with progress bar and per-item enrichment status

---

## PHASE F — App Store & Distribution

### F1 — App Store Assets
**Status**: `[x]` Done  
**What to do**:
- App icon: 1024×1024 PNG, indigo background, white location pin
- Launch screen: centered logo on white background with "TravelPanel" wordmark
- App Store screenshots: 6.5" and 5.5" iPhone sizes, 5 screens (Home/Map, Clip from Share, Inbox, Board, Trip Plan)
- App Store description, keywords, category (Travel)
- Privacy policy URL (required for App Store submission)

### F2 — Onboarding Flow (First-Time Experience)
**Status**: `[x]` Done  
**Files**: new `app/onboarding/page.tsx`, new `components/OnboardingFlow.tsx`  
**What to do**:
- 3-screen swipeable onboarding: (1) "Save travel inspiration from anywhere" (show Share Sheet), (2) "AI extracts the wisdom" (show substance items), (3) "Plan your trip in one tap" (show itinerary)
- Shows on first launch only (detect via `hasSeenOnboarding` in localStorage — already gated, this adds the visual flow)
- "Get started" button at the end → sets `hasSeenOnboarding=true`, dismisses to home

### F3 — Pro Tier UI
**Status**: `[x]` Done  
**What to do**:
- Add "Pro" badge and upgrade prompt to: rate limit messages, plan export, shared boards
- Settings page: "Upgrade to Pro" section with feature comparison (Free vs Pro)
- Free tier limits: 50 clips, 3 boards, 2 plan generations/day
- Pro: unlimited everything + priority processing + vibe search
- No payment integration needed yet — just the UI gates + a waitlist email capture

---

## PHASE C — On-Trip Mode (Superseded by D9/D10)

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Superseded by D9 (more detailed spec)

### C2 — Post-Trip Timeline
**Status**: `[ ]` Superseded by D10 (more detailed spec)

### C3 — Shared Boards v1
**Status**: `[ ]` Superseded by E2 (more detailed spec)

### C4 — Proactive Resurfacing
**Status**: `[ ]` Superseded by E3 (more detailed spec)

---

## PHASE G — Polish, Performance & Submission Readiness

> Goal: An app that feels polished on iPhone, passes App Store review, and retains users.
> Execution order: G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8

### G1 — Privacy Policy Page (App Store Required)
**Status**: `[x]` Done  
**Files**: `app/privacy/page.tsx`
**What to do**: Static page at /privacy required for App Store submission. Settings About section links to it.

### G2 — Duplicate URL Detection
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- Before saving a new clip, check if any existing SavedItem has the same URL (normalize: strip UTM params, trailing slashes)
- If duplicate found: show a toast/banner "You already saved this!" with a link to the existing clip
- Still allow re-save if user confirms (some users want to re-clip with new context)
- Add `getItemByUrl(url)` to `lib/db.ts` (use `by-url` index if one exists, else scan all items)

### G3 — Dark Mode Support
**Status**: `[x]` Done (core UI surfaces)  
**Files**: `app/globals.css`, all components  
**What to do**:
- Add `dark:` variants to all major UI surfaces: backgrounds, text, borders, cards
- Map stays light (MapLibre doesn't have a dark tile style in OpenFreeMap by default — use liberty-dark if available, otherwise skip map dark mode)
- Test in Simulator with dark mode enabled
- Use `prefers-color-scheme: dark` CSS media query + Tailwind's `darkMode: 'media'` config

### G4 — Geofence Resurfacing (local notifications, no Supabase needed)
**Status**: `[x]` Done  
**Files**: new `hooks/useGeofence.ts`, `app/page.tsx`, `capacitor.config.ts`  
**What to do**:
- Install `@capacitor/geolocation` and `@capacitor/local-notifications`
- On app foreground (once per session), check GPS position against all saved clip locations
- If user is within 500m of a saved location, fire a local notification: "📍 You're near Senso-ji — you saved this 3 weeks ago"
- Rate-limit: max 1 notification per clip per day (track in localStorage)
- Opt-in setting in Settings with a toggle
- Only fire if user has ≥1 saved clip with valid coordinates

### G5 — Performance: Inbox Virtualization
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- The inbox list renders all items at once. At 200+ clips, this causes jank
- Replace the `space-y-3` list with a virtualized scroller
- Option A: Use `react-virtual` (tanstack/virtual) — install and wire it up
- Option B: Use intersection-observer based lazy rendering (no package needed)
- Test performance at 100+ items in Simulator

### G6 — Accessibility Pass
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `components/BoardCard.tsx`, `components/NavBar.tsx`, all interactive UI  
**What to do**:
- Add `aria-label` to all icon-only buttons (delete, move, external link, map buttons)
- Ensure all tap targets are ≥44pt (minimum iOS touch target)
- Add `role="button"` or use `<button>` consistently (not `<div onClick>`)
- Add `alt` text to all images including thumbnails
- Test with VoiceOver in Simulator: navigate through the inbox, verify each element is readable

### G7 — iPad Split-View Layout
**Status**: `[x]` Done  
**Files**: `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- On iPad (detect via `window.innerWidth > 768`), show a two-column layout:
  - Home: map on left (60%), inbox or selected item on right (40%)
  - Boards: 3-column grid instead of 2-column
- NavBar moves from bottom to left sidebar on iPad
- Test in Xcode Simulator iPad Pro 12.9"

### G8 — TestFlight Beta Setup Guide
**Status**: `[x]` Done  
**Files**: new `ios/App/TESTFLIGHT_SETUP.md`  
**What to do**:
- Document exact steps to create App Store Connect app entry
- Set up signing certificates and provisioning profiles
- Archive and upload to TestFlight
- Add internal testers (email addresses)
- Create external test group with review notes

---

## PHASE H — Submission Polish & Delight (Final Sprint)

> Goal: Ship a product that earns 5-star App Store reviews. Every screen feels native,
> every edge case is handled, and the user never feels lost.
> Execution order: H1 → H2 → H3 → H4 → H5 → H6 → H7 → H8

### H1 — Map Dark Mode Tiles
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`, `app/globals.css`  
**What to do**:
- When `prefers-color-scheme: dark`, apply a CSS dark filter to the map container:
  `filter: invert(1) hue-rotate(180deg) brightness(0.75) contrast(0.9) saturate(0.9)`
- This inverts the light tile style into a dark style without needing a separate dark tile URL
- Pin markers and UI overlays should NOT be inverted — apply a counter-invert filter to them
- Test: switch to dark mode in simulator, map should be dark-themed

### H2 — Offline Detection Banner
**Status**: `[x]` Done  
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx` or individual pages  
**What to do**:
- Create `OfflineBanner` component: listens to `window.addEventListener('online'/'offline')`
- Banner: amber background, "You're offline — new clips won't be analyzed until you reconnect"
- Animated slide-in from top (framer-motion), auto-hides when back online
- Show on: inbox page, share page, home page
- Also sets `document.documentElement.setAttribute('data-offline', 'true')` for CSS hooks

### H3 — Board Detail Page Polish
**Status**: `[x]` Done  
**Files**: `app/boards/[id]/page.tsx`  
**What to do**:
- Add `md:pl-16` for iPad sidebar layout
- Add dark mode classes to all surfaces (`dark:bg-gray-950`, `dark:bg-gray-900`, etc.)
- Board cover hero: if the board has clips with thumbnails, show a collage or the first thumbnail as a full-width hero behind the header (with a dark gradient overlay)
- Add a "Sort by" toggle: Date saved vs. Name (client-side sort)
- Show item count with substance count inline ("12 places · 34 tips")

### H4 — Trip Plan Share Card
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- When user taps the share icon in the plan view, generate a 600×800px HTML canvas share card:
  - Indigo gradient background
  - Trip title (board name + emoji)
  - "X days · Y places · Z tips from your clips"
  - Day-by-day activity list (day number + top activity per day)
  - "Planned with TravelPanel" footer
- Convert canvas to PNG → `navigator.share({ files: [file] })` or download fallback
- Shows a loading state while generating

### H5 — Enhanced Onboarding: Notification Permission
**Status**: `[x]` Done  
**Files**: `components/OnboardingFlow.tsx`  
**What to do**:
- Add a 4th onboarding screen (after "Plan your trip") explaining nearby alerts:
  "📍 We'll let you know when you're near a saved spot"
- Include a "Enable Nearby Alerts" button that triggers `@capacitor/local-notifications` permission request
- "Skip" button dismisses without requesting
- Only show this screen if `@capacitor/local-notifications` is available (i.e., running natively)

### H6 — Substance Callout Chips in Trip Plan
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx` (or wherever activities render)  
**What to do**:
- In the trip plan day-by-day view, each activity that has `sourcedTips` should show them as
  amber/gold callout chips below the activity description
- Format: "💡 <tip content> — from <sourceTitle>" styled as an amber rounded card
- Collapsed by default (show first tip), expand to see all on tap
- This surfaces the substance-over-spots moat directly in the plan output

### H7 — Plan View Print Styles
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, new `app/plan/[boardId]/print.css`  
**What to do**:
- Add a "Print" button to the plan view (uses `window.print()`)
- Add print-specific CSS: hide NavBar, buttons, FAB; expand day cards; use black text on white
- Day-by-day layout prints cleanly on A4/letter
- Page breaks between days

### H8 — Home Map: Satellite/Terrain Toggle
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`  
**What to do**:
- Add a small floating button (top-right of map, below the top bar) that cycles through map styles:
  Street → Satellite → Terrain (if available in OpenFreeMap)
- Available OpenFreeMap styles: `liberty` (street), `fiord` (dark/muted), `positron` (light minimal)
- Store the selected style in localStorage
- Button shows a map icon, tooltip on hover

---

## PHASE I — UX Depth & Retention

> Goal: Features that deepen daily engagement — notes, smart defaults, empty states, and
> rich clipboard/URL handling that make every interaction feel thoughtful.
> Execution order: I1 → I2 → I3 → I4 → I5 → I6

### I1 — Home Map Empty State
**Status**: `[x]` Done  
**Files**: `app/page.tsx`, `components/MapView.tsx`  
**What to do**:
- When `items.length === 0` and not loading, overlay a gentle CTA on the map:
  "📍 Save your first inspiration" card with a short subtitle and a "+ Clip something" button
- Animate in with opacity fade (framer-motion)
- Dismiss when the first item is saved
- Show a subtle background map (centered on world view, low opacity markers)

### I2 — Personal Notes on Clips
**Status**: `[x]` Done  
**Files**: `lib/types.ts`, `lib/db.ts`, `components/LocationDetailCard.tsx`  
**What to do**:
- Add `userNote?: string` field to `SavedItem` in `lib/types.ts`
- In `LocationDetailCard`, add a "My note" section with a pencil icon:
  - If no note: show "Add a note…" in light gray
  - Tap to open an inline textarea; on blur or Enter, auto-save via `saveItem()`
  - Note persists in IndexedDB with the clip
- Show a small "note" indicator (📝) on InboxCard if userNote is set

### I3 — Clipboard URL Auto-Paste on Share Page
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`  
**What to do**:
- On mount, call `navigator.clipboard.readText()` and if the clipboard contains a URL
  that differs from the current `?url=` param, show a small banner:
  "📋 Clipboard has a URL — use it instead?" with Yes/No buttons
- "Yes" replaces the current URL in the flow and re-runs enrichment
- Handles the common case of copying a link then opening TravelPanel directly

### I4 — Smart Plan Preferences Memory
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- When a user generates a plan, save their last-used preferences (chips + custom notes + days)
  to `localStorage` under `planPreferences`
- On the plan page, if `planPreferences` exists, pre-fill the form with last-used values
- Add a "Reset preferences" link to clear them
- Show a "Using your last preferences" banner if they were loaded

### I5 — Map Performance: Stable References
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Wrap `MapView` in `React.memo()` so it only re-renders when `items` or `flyTo` actually change
- Use `useMemo` in `app/page.tsx` to keep the `items` array reference stable:
  filter once and memoize instead of re-computing every render
- Use `useCallback` on `onPinClick` handler
- Measure: toggle dark mode → map should not flicker or re-mount

### I6 — Your Travel Stats Page
**Status**: `[x]` Done  
**Files**: new `app/stats/page.tsx`, `components/NavBar.tsx`  
**What to do**:
- A new page at `/stats` showing:
  - Total clips saved, boards created, plans generated
  - Clips by platform (pie/bar chart using simple CSS + Tailwind)
  - Most-saved countries/cities (from clip location data)
  - Clips saved per month (sparkline using SVG path)
  - "You've saved X places across Y countries"
- Add as a 5th nav item (replace Settings? or add) — or accessible from Settings

---

## PHASE K — Core Feature Completeness

> Goal: Fill the gaps that prevent TravelPanel from being a fully self-contained travel app.
> A user should be able to add places, manage their library, and have their plans feel alive.
> Execution order: K1 → K2 → K3 → K4 → K5 → K6 → K7 → K8

### K1 — Add Place Manually (Geocoded Search)
**Status**: `[x]` Done  
**Files**: new `components/AddPlaceSheet.tsx`, `app/page.tsx`, `components/NavBar.tsx`  
**What to do**:
- Add a "+" long-press or secondary button that opens an "Add Place" sheet
- Search field hits Nominatim geocoder (free, no key: `https://nominatim.openstreetmap.org/search?q=...&format=json&limit=5&addressdetails=1`)
- Results list: place name + address + type (city/restaurant/museum)
- Tap a result → creates a `SavedItem` with platform `'other'`, enrichmentStatus `'done'`,
  location pre-filled from Nominatim, title = display_name trimmed, tags from `type`
- "Add manually" fallback: free-text name + tap-on-map to place a pin (optional stretch)
- Shows in the map and inbox immediately after adding

### K2 — Inbox Smart Sort
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `lib/searchItems.ts`  
**What to do**:
- Add a "Sort" button next to the search bar in the inbox header
- Sort options: Date saved (newest), Date saved (oldest), Most tips, Most locations
- Selected sort persists to `localStorage` under `inboxSort`
- Apply sort AFTER search and platform filter
- Show active sort label: "Sorted by: Most tips" under the filter chips when non-default

### K3 — Multi-select Batch Actions in Inbox
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Long-press on a card (>500ms) enters multi-select mode
- Selected cards show a checkmark overlay (indigo circle, scale animation)
- Bottom action bar appears: "Delete X" (red), "Move to Board" (indigo), "Cancel"
- "Select All" button in the top bar when in multi-select mode
- Exit multi-select on ESC or tap outside (empty area)
- Use existing `removeItem` and `addItemToBoard` from db

### K4 — Plan Day Mini Route Map
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`, new `components/DayRouteMap.tsx`  
**What to do**:
- In the trip plan day view, show a compact MapLibre map (200px tall) above the activity list
- Pins for each activity's location; connected by a straight-line polyline in the day's order
- Tapping the mini map expands to full-screen (or navigates to the navigate view)
- Re-uses MapLibre already in the codebase — no new dependencies
- If an activity has no location data, skip it in the route (don't break the map)

### K5 — Board Visited / Trip Completed Toggle
**Status**: `[ ]` Not started  
**Files**: `app/boards/[id]/page.tsx`, `lib/types.ts`, `lib/db.ts`  
**What to do**:
- Add a "Mark as completed" button to the board detail page (and board context menu)
- Adds `completedAt: number` field to `Board`
- Completed boards show a green "✓ Visited" badge on the board card
- Filter toggle on the Boards page: "All" / "Planning" / "Visited"
- Completed boards move to the bottom of the list automatically

### K6 — Offline Clip Queue
**Status**: `[ ]` Not started  
**Files**: `app/share/page.tsx`, new `lib/clipQueue.ts`, `hooks/useClipQueue.ts`  
**What to do**:
- When enrichment API call fails with a network error (not a 4xx), save the clip URL to an
  IndexedDB "queue" store with status `'queued'`
- On app reconnect (`window.addEventListener('online', ...)`), drain the queue: re-attempt
  enrichment for each queued item in order
- Show a subtle "1 clip queued — will process when online" banner in the inbox
- Distinguishable from `failed` status — queued items have a ⏳ indicator not a ⚠ indicator
- This makes the Share Sheet flow truly resilient: sharing on airplane mode works

### K7 — Plan Streaming UX: Visible Agent Steps
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`  
**What to do**:
- During plan generation, show a live "thinking" view with animated step cards:
  "🔍 Reading your clips…" → "🗺 Grouping by neighborhood…" → "📅 Building your itinerary…"
- Each step card animates in with framer-motion (from y:20, opacity:0)
- Inspired by 圆周旅记's agent UX — makes users feel the AI is actively thinking
- Steps are already partially there in `AgentStep` type — surface them visually
- Replace the current static "Generating..." spinner with this flow

### K8 — Map: Tap to Save a Place
**Status**: `[ ]` Not started  
**Files**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Long-press on the map (300ms) triggers a reverse geocode via Nominatim
  (`https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json`)
- Shows a small popover: "📍 <Place Name>" with a "+ Save" button
- Tapping "+ Save" creates a SavedItem with the geocoded place, platform `'other'`
- Shows a pulse animation at the tapped point while geocoding
- Dismiss on tap elsewhere

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*

---

## PHASE J — Polish & Delight (Final Layer)

> Every detail matters. Phase J is about micro-interactions, smart defaults, and the
> subtle touches that make users say "this was made by people who care".
> Execution order: J1 → J2 → J3 → J4 → J5 → J6

### J1 — Trip History Page
**Status**: `[x]` Done  
**Files**: new `app/trips/page.tsx`, `components/NavBar.tsx` (optional)  
**What to do**:
- New page at `/trips` showing all saved Trip objects (from the `trips` IndexedDB store)
- Each trip card shows: board emoji + name, trip date, # days, # activities
- Tap a trip card to open the plan view with that trip loaded
- Delete trip button (with swipe-to-delete gesture)
- Link from the plan view: "View all trips" link under the PlanVersionBar
- Empty state: "No trips planned yet — go to a board and generate your first plan"

### J2 — Plan View: Day Navigation Arrows
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add prev/next arrow buttons below the day strip to advance the active day
- Show day X of Y count in between (e.g. "Day 2 of 4")
- Swipe left/right on the day plan section to navigate days
- Subtle transition: framer-motion x-slide between days

### J3 — Enhanced Fuzzy Search
**Status**: `[x]` Done  
**Files**: `lib/searchItems.ts`, `components/SearchBar.tsx`  
**What to do**:
- Replace exact substring match with a fuzzy-ish match:
  - Split query into tokens, require all tokens to match in the combined text
  - Prioritize title matches > description > tags > substance content
- Add a "by location" toggle: filter to items that have a location matching the query
- Show number of results: "3 matches" in search bar when active
- Highlight matching tokens in the result list (bold the matched part)

### J4 — Substance Highlights in Inbox Card
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Instead of just showing "💡 3 tips" count, show the first tip text preview
  as a small amber pill below the tag row: "💡 'Go before 8am to beat crowds'"
- Truncate to ~50 chars with ellipsis
- Only show if substance has at least 1 item with type 'tip' or 'recommendation'
- This surfaces the moat directly in the list view

### J5 — Board Reorder via Drag
**Status**: `[x]` Done  
**Files**: `app/boards/page.tsx`, `lib/db.ts`  
**What to do**:
- Allow drag-and-drop reordering of boards in the grid
- Use framer-motion `Reorder` component
- Persist new order to IndexedDB (add `order` field to Board or use array position)
- Visual indicator: lift effect (scale up + shadow) when dragging

### J6 — Ambient Home Screen Widgets (Data Context)
**Status**: `[x]` Done  
**Files**: `app/page.tsx`  
**What to do**:
- In the floating top bar on the home map, show more context:
  - Total clip count with a subtle "↑2 this week" indicator
  - "🗺 3 boards" quick link to boards page
  - If currently near a saved spot (from geofence data), show a subtle "📍 Near: <name>" pill
- On iPad (right panel when no item selected), show a mini stats summary instead of the empty state
