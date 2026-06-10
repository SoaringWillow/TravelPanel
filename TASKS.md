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

## PHASE D — iOS Polish & Production Ready (Current Sprint)

Goal: make TravelPanel feel like a native, beautiful, production-quality iOS app.
Work top-to-bottom within this phase.

### D1 — User Location on Map
**Status**: `[x]` Done  
**What to do**: Add MapLibre GeolocateControl so users can see and jump to their location on the map.  
**File**: `components/MapView.tsx` — add `<GeolocateControl position="bottom-right" trackUserLocation showUserHeading />` alongside existing `NavigationControl`.

### D2 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add `framer-motion` drag="x" to the card container (already installed)
- Swipe left past -80px threshold to reveal red "Delete" action behind the card
- Swipe back or tap elsewhere to cancel
- Swipe past -200px or tap Delete to confirm delete with a slide-out animation
- Keep existing tap-to-open-detail behaviour

### D3 — Board Rename & Delete
**Status**: `[x]` Done  
**Files**: `components/BoardCard.tsx`, `lib/db.ts`, `app/boards/page.tsx`  
**What to do**:
- Long-press (or ⋯ menu) on BoardCard opens an action sheet: "Rename", "Delete"
- Rename: inline input replaces title text, save on blur / Enter
- Delete: confirmation alert ("This will not delete the clips inside") → removes board, unassigns items
- Add `renameBoard(id, name)` to `lib/db.ts`

### D4 — Beautiful Empty States
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Inbox empty: large emoji illustration + "Clip your first travel inspiration" CTA + "Tap + to get started" sub-text
- Map empty: "No pins yet — clip a travel post to see locations here" floating card
- Boards empty: "Create your first collection" with + button prompt
- Animate in with a gentle fade+scale

### D5 — Board Filter on Map
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Add a horizontally scrollable board filter chip row just above the bottom nav on the main map view
- "All" chip (selected by default) + one chip per board that has items with locations
- Selecting a board chip filters the map to show only that board's pins
- Selected chip uses the board's emoji + name

### D6 — Share Extension Native Image Capture (Swift)
**Status**: `[ ]` Not started  
**Requires**: Xcode (macOS only)  
**Files**: `ios/App/ShareExtension/ShareViewController.swift`  
**What to do**:
- In `itemProvider.loadItem(forTypeIdentifier:)`, check for `kUTTypeImage` attachment
- If present, write the image as JPEG to App Group shared container (`group.com.travelpanel.app/pendingShareImage.jpg`)
- In `CapacitorBridge.tsx`, after processing the URL scheme deep link, check App Group for a pending image
- Read it via a Capacitor plugin (e.g., `@capacitor/filesystem` reading the shared container path)
- Pass the base64 image to `enrichItem` — web side already handles it (B3)

### D7 — In-App Haptic Feedback
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Use the Web Vibration API (`navigator.vibrate`) as a thin wrapper
- Light haptic (10ms) on: clip save success, board select, item delete confirm
- Medium haptic (30ms) on: plan generation start
- Only fires on iOS/Android (desktop ignores vibrate)
- Add `lib/haptics.ts` with `lightHaptic()` and `mediumHaptic()` exports

### D8 — Pull-to-Refresh on Inbox & Boards
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Detect a downward drag from the top of the scroll container
- Show a spinner that spins while refreshing
- On release past threshold: re-run `getAllItems()` / `getAllBoards()` and update state
- On iOS in Capacitor, this should feel native (use `framer-motion` drag detection)

### D9 — Trip Plan Share / Deep Link
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/exportPlan.ts`  
**What to do**:
- Add a "Share plan" button to the plan view
- Generate a self-contained HTML page (single file) with the full itinerary
- Optionally: generate a shareable URL with plan data encoded (base64 compressed JSON in hash)
- Use Web Share API (`navigator.share`) if available, fallback to copy-to-clipboard

### D10 — Thumbnail Extraction via Claude Vision (Xiaohongshu)
**Status**: `[x]` Done  
**Files**: `app/api/import/route.ts`, `lib/types.ts`  
**What to do**:
- When vision extraction is used (imageBase64 provided), also extract a thumbnail crop
- Add `thumbnailCrop?: { x: number; y: number; width: number; height: number }` to `ImportResult`
- In the API: prompt Claude to identify the best thumbnail region (a landmark or food shot)
- On the client: use Canvas to crop the original image to that region and store as data URL
- Fallback: use first 1/3 of the image as thumbnail if no crop is specified

---

## PHASE E — Production Polish & Native iOS Feel (Current Sprint)

Goal: eliminate every "web app" tell. Every screen should feel indistinguishable from a native iOS app.
Work top-to-bottom.

### E1 — NavBar iOS Home Indicator Safe Area
**Status**: `[x]` Done
**Files**: `components/NavBar.tsx`, `app/globals.css`
**What to do**:
- NavBar currently clips at the very bottom edge — on iPhone with home indicator (all modern iPhones) it overlaps the system gesture bar
- Add `padding-bottom: env(safe-area-inset-bottom)` to the nav container
- Also ensure `pb-24` / `pb-[env(safe-area-inset-bottom)]` offsets used in content areas are updated to account for actual nav height + safe area
- Header `pt-12` should use `padding-top: max(48px, env(safe-area-inset-top))` to handle Dynamic Island / notch

### E2 — Skeleton Loading States
**Status**: `[x]` Done
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`
**What to do**:
- Replace the centered spinner in Inbox and Boards with shimmer-skeleton placeholders that match the actual card grid layout
- Inbox skeleton: 6 skeleton cards in a 2-column grid (matching InboxCard dimensions)
- Boards skeleton: 4 skeleton board cards in a 2-column grid
- Use a CSS `@keyframes shimmer` animation (gradient sweep from left to right)
- Add reusable `SkeletonCard` component in `components/SkeletonCard.tsx`

### E3 — Error Boundary + Crash Recovery UI
**Status**: `[x]` Done
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`
**What to do**:
- Add a React class ErrorBoundary wrapping the main content in `app/layout.tsx`
- On crash: show a friendly "Something went wrong" card with emoji, message, and "Reload app" button
- Log the error to the analytics `track('app_error', { message, stack })` wrapper
- Don't wrap in ErrorBoundary: CapacitorBridge, AnalyticsProvider (they should fail silently)

### E4 — Smooth Page Transitions
**Status**: `[x]` Done
**Files**: `app/layout.tsx`, new `components/PageTransition.tsx`
**What to do**:
- Wrap `{children}` in a `PageTransition` component that uses framer-motion `AnimatePresence`
- Transition: `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}` → `exit={{ opacity: 0 }}`
- Duration: 180ms ease-out — snappy, not floaty
- Use `usePathname()` as the `key` for AnimatePresence so each navigation triggers the animation

### E5 — Clip Count & New Badge on Board Cards
**Status**: `[x]` Done
**Files**: `components/BoardCard.tsx`, `app/boards/page.tsx`
**What to do**:
- Show a "N clips" pill badge on each board card (already partially there with `itemCount` prop)
- If any clip in the board has `enrichmentStatus === 'pending'` or `=== 'failed'`, show a small amber dot indicator
- Board card image: show a 2×2 grid of thumbnail previews from the board's clips (first 4 clips with thumbnails)
- Fallback: show the board emoji centered on a gradient background if no thumbnails

### E6 — Map Pin Tap → Rich Popup Card
**Status**: `[ ]` Not started
**Files**: `components/MapView.tsx`, `components/LocationDetailCard.tsx`
**What to do**:
- When user taps a pin, currently opens LocationDetailCard via parent state
- Improve: show a mini preview card anchored near the pin (not just the bottom sheet) — or improve the bottom sheet open animation (spring up, not instant)
- Add a close affordance (swipe down or × button) to the detail card
- Show the clip's thumbnail prominently at the top (hero image)

### E7 — Improved InboxCard: Gradient Placeholder & Status Polish
**Status**: `[x]` Done
**Files**: `components/InboxCard.tsx`
**What to do**:
- When `item.thumbnail` is undefined/null: show a gradient placeholder based on platform color (wechat=green, xiaohongshu=red, douyin=black, bilibili=pink, unknown=indigo) instead of a gray box
- Processing state: show animated shimmer over the whole card, not just a spinner
- Failed state: show a warm amber error card with retry button more prominently
- Add subtle drop shadow on card hover/press for tactile feedback

### E8 — Trip Planner UI: Day Strip Cards Polish
**Status**: `[x]` Done
**Files**: `components/DayStripCard.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Day header: larger emoji + day number, more visual weight
- Activity cards: show a colored left border by activity type (food=orange, culture=purple, nature=green, transport=blue)
- Sourced tips: render with a subtle indigo quote-style left border and "📎 from: <title>" attribution
- Add a "Collapse day" affordance so users can fold/unfold days
- Total trip stats bar at the top: "X days · Y activities · Z locations"

### E9 — Offline / No-Network State
**Status**: `[x]` Done
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx`
**What to do**:
- Detect `navigator.onLine` and listen to `online`/`offline` events
- When offline: show a slim amber banner at the top "You're offline — clips save locally"
- When back online: show brief green "Back online" toast for 2s then hide
- Enrichment and plan generation should show "Requires internet connection" instead of failing silently

### E10 — Pinch-to-Zoom & Full-Screen Image Viewer
**Status**: `[x]` Done
**Files**: new `components/ImageViewer.tsx`, `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`
**What to do**:
- Tapping a clip thumbnail (in detail card or inbox card) opens a full-screen image viewer
- Support pinch-to-zoom (CSS `touch-action: manipulation` + transform scale)
- Double-tap to zoom/reset
- Swipe down to dismiss (framer-motion drag="y")
- Show image URL source and clip title at the bottom

---

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Not started

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
