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

## PHASE C — On-Trip Mode

### C1 — On-Trip GPS Mode
**Status**: `[x]` Done  
**Why**: The app should be useful *during* travel, not just during planning. Show saved spots near the user's current position with a "Nearby" tab.  
**Files**: new `app/nearby/page.tsx`, `components/NavBar.tsx`, `lib/geo.ts`  
**What to do**:
- Add a "Nearby" nav tab (🧭 icon) that renders a compact list of saved clips sorted by distance from the device's current GPS position
- Use the browser `navigator.geolocation` API; handle denied/unavailable gracefully with a friendly placeholder
- Show distance badge on each clip card (e.g. "0.3 km away")
- Tap a clip → fly to it on the map + open detail card (use existing `?flyTo=&itemId=` URL params)
- Add `lib/geo.ts` with `haversineDistance(lat1, lng1, lat2, lng2): number` utility
- Only clips with at least one `location` are shown (filter out location-less clips)
- Empty state: "No saved spots nearby — clip some places you want to visit!"

### C2 — Post-Trip Timeline
**Status**: `[x]` Done  
**Why**: After visiting saved spots, users want to relive the trip as a chronological story. This drives retention and social sharing.  
**Files**: `app/boards/[id]/page.tsx` or new `app/trips/[tripId]/timeline/page.tsx`  
**What to do**:
- On the trip plan view, add a "Timeline" tab alongside the day-by-day itinerary
- The timeline is a vertically scrolling list of activities grouped by day, showing time, location, sourced tips, and the clip thumbnail
- Each timeline item links back to the source clip (deep link to the clip detail card)
- Add a "Mark as visited" toggle on each activity; mark visited items with a checkmark + muted styling
- Persist visit status in the `Trip` object in IndexedDB (add `visitedActivityIds: string[]` to `Trip` type)
- Show a progress bar at the top: "X of Y activities visited"

### C3 — Shared Boards v1
**Status**: `[x]` Done  
**Why**: Social proof and virality. Users want to send a board to a friend ("here are my Tokyo recommendations").  
**Files**: `app/boards/[id]/page.tsx`, new `app/shared/[token]/page.tsx`, `app/api/share/route.ts`  
**What to do**:
- Add a "Share board" button to the board detail page
- `POST /api/share` accepts `boardId`, creates a short-lived read-only token (UUID, store in a `sharedBoards` map in memory or a simple KV), returns a shareable URL: `/shared/<token>`
- `app/shared/[token]/page.tsx` renders the board as a read-only map+list view (no edit controls)
- The shared page has a "Save to my TravelPanel" CTA that deep-links to the share flow for each clip
- Token expiry: 7 days (simple timestamp check on the server)
- NOTE: This is server-memory only (no DB), so shared links expire on redeploy — fine for v1

### C4 — Proactive Resurfacing
**Status**: `[x]` Done  
**Why**: Users clip things months before a trip. When the trip approaches, relevant clips should surface automatically.  
**Files**: `app/settings/page.tsx`, new `components/TripReminder.tsx`, `lib/resurfacing.ts`  
**What to do**:
- In settings, add a "Upcoming trip" date picker — user sets an optional destination + departure date
- Store in localStorage: `{ destination: string, departureDate: string, boardId?: string }`
- `lib/resurfacing.ts` — `getResurfacedClips()`: when departure is within 14 days, surface the 3–5 most substance-rich clips for that board (sort by `substance.length` descending)
- Show a dismissible `TripReminder` banner on the home/map screen when departure is within 14 days
- Banner shows "Your [destination] trip is in X days — review your saved spots": tap → navigates to board
- Dismiss clears until departure date changes

---

## PHASE D — iOS Native Polish & UI Excellence

> The gap between a web app and a *great* iOS app is feel. Phase D closes it.

### D1 — Skeleton Loading States
**Status**: `[x]` Done  
**Why**: Blank screens and spinning indicators feel cheap. Skeletons match the content shape and feel instant.  
**Files**: new `components/SkeletonCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create a `SkeletonCard` component: animated shimmer rectangles matching the `InboxCard` shape (thumbnail, title, tag row)
- Show 6 skeleton cards while items are loading in the inbox view
- Show 3 skeleton board cards while boards are loading in the boards view
- Use a CSS `@keyframes shimmer` animation (gradient from `#f3f4f6` to `#e5e7eb`)
- Remove all `loading && <Spinner />` patterns in favour of skeletons

### D2 — Haptic Feedback on Key Actions
**Status**: `[x]` Done  
**Why**: Haptics make actions feel real and satisfying on a physical device. Critical for the "clip saved" moment.  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/NavBar.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `impact(style?: 'light'|'medium'|'heavy')` and `notification(type: 'success'|'warning'|'error')` that call `@capacitor/haptics` when on a native platform (no-op on web)
- Call `notification('success')` when a clip is saved in `app/share/page.tsx`
- Call `impact('light')` on NavBar tab switches
- Call `impact('medium')` when generating a trip plan
- Call `notification('error')` when enrichment fails
- Install: `npm install @capacitor/haptics`

### D3 — Pull-to-Refresh
**Status**: `[x]` Done  
**Why**: iOS users expect pull-to-refresh everywhere. Without it, the app feels static.  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Install `@capacitor/pull-to-refresh` (or implement natively with touch events if not available)
- Add pull-to-refresh to the inbox list and boards list: on refresh, re-run the failed-item retry queue AND reload boards from IndexedDB
- Show a native spinner at the top while refreshing (use `PTRPlugin.refresh()` callback pattern)
- Alternatively: use CSS `overscroll-behavior: contain` + `useSwipeDown` hook detecting 80px+ downward swipe

### D4 — Dark Mode
**Status**: `[x]` Done  
**Why**: Majority of iPhone users use dark mode. The current app is white-only and looks out of place at night.  
**Files**: `app/globals.css`, `tailwind.config.js`, `app/layout.tsx`, across all components  
**What to do**:
- Enable Tailwind dark mode with `darkMode: 'class'` in `tailwind.config.js`
- In `app/layout.tsx`, detect system dark mode via `prefers-color-scheme` media query and apply `dark` class to `<html>`
- Audit all components: replace hard-coded `bg-white`, `text-gray-900`, etc. with dark variants (`dark:bg-gray-900`, `dark:text-gray-100`)
- Ensure map tiles remain readable in dark mode (MapLibre supports dark style — switch to `dark-matter` style in dark mode)
- Key surfaces: NavBar, InboxCard, BoardCard, LocationDetailCard, SharePage, SettingsPage

### D5 — Swipe-to-Delete on Clip Cards
**Status**: `[x]` Done  
**Why**: Curation is core to the app. Removing a bad clip should be a one-thumb gesture, not buried in menus.  
**Files**: `components/InboxCard.tsx`, new `components/SwipeableRow.tsx`  
**What to do**:
- Create `SwipeableRow` wrapper using `@use-gesture/react` (or raw touch events): track swipe-left delta, snap to 80px reveal for a delete button
- Show a red "Delete" action revealed behind the card on left-swipe
- Confirm with a quick haptic `impact('medium')` + slide-out animation before deletion
- On delete: remove from IndexedDB, remove from board's `itemIds`, animate card out of the list
- Also add swipe-right to "move to board" (shows a bottom sheet board picker) — secondary feature, implement only if swipe-left works cleanly

### D6 — Map Terrain & Satellite Toggle
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`  
**What to do**:
- Add a small control button (top-right of map) cycling through: Streets → Satellite → Terrain
- Use OpenFreeMap's available styles: `liberty` (streets), add satellite layer via MapLibre raster source (Esri World Imagery URL)
- Persist last-used style in localStorage
- Smooth style transition (cross-fade the map layers)

---

## PHASE E — Performance & Scale

### E1 — Virtual Scrolling for Large Clip Lists
**Status**: `[x]` Done  
**Why**: At 200+ clips, the inbox renders all cards in DOM, causing jank on scroll.  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Use `@tanstack/react-virtual` to virtualise the clip list: only render cards in the viewport ± 2 buffer items
- Fixed row height of 96px (current InboxCard height); or dynamic with `estimateSize`
- Measure: before/after FPS profiling in Chrome DevTools on a list of 300 items

### E2 — Offline Queue for Enrichment
**Status**: `[x]` Done  
**Why**: Users often clip on weak connections. Enrichment should queue and retry when connectivity returns.  
**Files**: `lib/enrichItem.ts`, `lib/retryQueue.ts` (extend existing)  
**What to do**:
- Listen to `navigator.onLine` / `online` event; when connection returns, trigger the retry queue immediately
- Store "queued for enrichment" status separately from "failed" so the UI shows "Waiting for connection…" rather than a failure state
- Add `enrichmentStatus: 'queued'` to the status state machine in `lib/db.ts`

---

## PHASE F — Dark Mode Completion & Visual Polish

> Phase D4 added dark mode infrastructure and covered the main screens.
> Several high-visibility surfaces were missed. This phase finishes dark mode
> and polishes the visual layer that users see most.

### F1 — Dark Mode: Plan & Trip Timeline Views
**Status**: `[x]` Done  
**Why**: Users generate trip plans at night. The plan view is all white and painful in dark mode.  
**Files**: `app/plan/[boardId]/page.tsx`, `components/TripTimeline.tsx`, `components/DayStripCard.tsx` (if exists)  
**What to do**:
- Audit `app/plan/[boardId]/page.tsx` — add `dark:` variants to all bg/text/border classes
- Audit `components/TripTimeline.tsx` — progress bar, activity rows, visited states
- Look for any DayStripCard or similar component used in the plan view and add dark variants
- Test: plan view header, day cards, sourced tips, the timeline tab

### F2 — Dark Mode: Board Detail, Share & Location Detail
**Status**: `[ ]` Not started  
**Why**: Board detail page, shared board page, and LocationDetailCard are all white-only. Any user who taps these in dark mode gets a jarring white flash.  
**Files**: `app/boards/[id]/page.tsx`, `app/shared/page.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- `app/boards/[id]/page.tsx` — dark header, item list, share button
- `app/shared/page.tsx` — dark read-only view with clip cards
- `components/LocationDetailCard.tsx` — dark bottom sheet, substance list, buttons
- Also check `app/share/page.tsx` (the capture flow) for dark support

### F3 — Dark Mode: Map Tiles Switch to Dark Style
**Status**: `[ ]` Not started  
**Why**: When the app is in dark mode the base map stays bright white (OpenFreeMap liberty). The map style toggle from D6 handles manual switching, but the map should automatically use a dark tile style when the system is in dark mode.  
**Files**: `components/MapView.tsx`  
**What to do**:
- In `MapView`, read the current `dark` class from `document.documentElement` (or add a `isDark` prop from the parent page)
- If dark mode is active AND the user hasn't manually overridden the style, auto-select a dark tile style
- OpenFreeMap has a `dark-matter` style: `https://tiles.openfreemap.org/styles/dark-matter` — use this
- The D6 style toggle should still work on top: if user cycles styles in dark mode, `dark-matter` replaces `liberty` as the "streets" base
- Persist the manual override separately from the dark-mode default

### F4 — Share Page UX: URL Preview Card
**Status**: `[ ]` Not started  
**Why**: When the user arrives at `/share?url=...`, the current UI shows a simple input. Before saving, the user should see a preview of what's being captured (the page title + domain), giving them confidence the right thing was clipped.  
**Files**: `app/share/page.tsx`  
**What to do**:
- On mount, if a `url` param is present, immediately show a preview card: extract the domain + title from the URL string (no fetch needed — parse `new URL(url).hostname`)
- Display: `<domain icon> <hostname> — <decoded URL path>` with an indigo border
- Below the preview, show "Save to TravelPanel" button (primary) and "Cancel" (secondary)
- If platform-specific URL detected (Xiaohongshu, Douyin etc.), show the platform badge in the preview
- This replaces the "Share URL" text input for the pre-filled URL flow, keeping the input only for manual entry

### F5 — Clip Detail: Inline Substance Expansion
**Status**: `[ ]` Not started  
**Why**: The "💡 3 tips" badge on InboxCard is a teaser. Users tap it expecting something to happen — currently nothing does. The substance should be expandable directly on the card without navigating to the detail view.  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add an `expanded` boolean state to InboxCard (local state)
- When the user taps the "💡 N tips" badge, toggle expanded
- In expanded state, show the substance list inline below the tags (max 3 items visible, "show all" if more)
- Each substance item: icon + content text, compressed to 1 line (truncate)
- Collapse on second tap or on swipe
- Keep the card height reasonable — clamp substance content to 1 line each

---

## PHASE G — Clip Engine Quality

> The clip action is the #1 moat. This phase improves clip capture speed,
> URL support breadth, and content fidelity.

### G1 — Instant Inbox Appearance
**Status**: `[ ]` Not started  
**Why**: Currently the clip only appears in the inbox AFTER enrichment completes (~3-5 seconds). Users return to the app and wonder if it saved. The clip should appear instantly with a "Finding the magic…" skeleton, then update in place.  
**Files**: `app/share/page.tsx`, `lib/db.ts`, `hooks/useSavedItems.ts`  
**What to do**:
- When `saveItem()` is called, immediately add the item with `enrichmentStatus: 'pending'` and `title: url` to state and IDB
- Navigate to `/inbox` right away (don't wait for enrichment)
- `useSavedItems` already picks up pending items — the skeleton card will show
- Enrichment runs in the background and the card updates via the existing polling / refreshItem mechanism
- Remove any `await` on `enrichItem()` in the save flow; fire-and-forget

### G2 — YouTube & Instagram URL Support
**Status**: `[ ]` Not started  
**Why**: Many users clip YouTube travel vlogs and Instagram reels. The `parse-url.ts` platform detection doesn't handle these, so they fall through as `other`. The Claude prompt should be updated to extract locations from these content types.  
**Files**: `lib/parse-url.ts`, `lib/types.ts` (Platform type), `app/api/import/route.ts`  
**What to do**:
- Add `'youtube'` and `'instagram'` to the `Platform` type
- Add URL detection for youtube.com, youtu.be, instagram.com in `parse-url.ts`
- Add `PLATFORM_LABELS` + `PLATFORM_BG` + `PLATFORM_COLORS` entries for the new platforms
- Update the Claude prompt in `api/import/route.ts` to handle YouTube video descriptions and Instagram captions
- Add to the `PLATFORM_FILTERS` array in `app/inbox/page.tsx`

### G3 — Clip Deduplication
**Status**: `[ ]` Not started  
**Why**: If the user clips the same URL twice (e.g. shares it again from the app), they get a duplicate. Silent de-dup prevents clutter.  
**Files**: `lib/db.ts`, `app/share/page.tsx`  
**What to do**:
- Before saving a new item, check if any existing item has the same `url` (normalize: strip trailing slash, lowercase)
- If duplicate found: show a toast "Already saved — X was already in your inbox" and navigate to inbox without re-enriching
- Add a `getItemByUrl(url)` function to `lib/db.ts` using a scan (or add a 'by-url' index in a DB v3 upgrade)
- Toast component: a small non-blocking banner that auto-dismisses after 3s

### G4 — Substance Quality: Source Quote Display
**Status**: `[ ]` Not started  
**Why**: The `source_quote` field on SubstanceItem is extracted by Claude but never shown. Showing the exact words from the post (in italics, as a pull-quote) dramatically increases trust in the wisdom layer.  
**Files**: `components/LocationDetailCard.tsx` (SubstanceList section)  
**What to do**:
- In the substance list, if an item has `source_quote`, show it below the content as:
  `"[source_quote]"` — in italic, text-gray-400, text-xs, with a left border-l-2 border-indigo-200
- Cap source_quote display at 120 characters (truncate with "…")
- Only show if `source_quote` is non-empty and different from `content`

---

## PHASE H — Navigation & Planning Intelligence

### H1 — Route Map: Per-Day Driving Time Estimates
**Status**: `[ ]` Not started  
**Why**: The plan view shows a day-by-day list but users have no sense of how long driving between stops will take. Adding rough estimates (based on haversine distance × average speed) makes the plan feel more real.  
**Files**: `components/RouteMapView.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- For each day, compute the total route distance using `haversineDistance` between consecutive activity locations (extracted from their associated clips)
- Assume 40km/h average in a city, 80km/h outside cities (use a simple heuristic: if distance between any two stops > 30km, assume highway speed)
- Show "Day X: ~45 min driving" below each day header in the plan view
- On the route map, show the day's path as a dashed polyline between the stops (use MapLibre's `addLayer` with `type: 'line'`)

### H2 — Smart Default Trip Duration
**Status**: `[ ]` Not started  
**Why**: The trip planner prompt always generates 3 days regardless of how many clips are in the board. A board with 2 clips should get a 1-day plan; a board with 30 clips should get 7 days.  
**Files**: `app/api/plan/route.ts`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- In `app/plan/[boardId]/page.tsx`, count the unique locations in the board's items
- Suggest a duration: `Math.min(Math.ceil(locationCount / 4), 7)` days — 4 spots per day, max 7 days
- Pass `suggestedDays` to the plan API and inject it into the prompt: "Generate a N-day itinerary"
- Add a duration picker to the plan UI (1–14 days, default = suggested) above the Generate button

### H3 — Plan Regeneration Diff View
**Status**: `[ ]` Not started  
**Why**: When a user regenerates a plan (creating a new version per A10), they currently have no way to see what changed. A simple before/after diff shows the value of regeneration.  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- When a new plan version is generated, compare it to the previous version: count added/removed activities
- Show a brief toast: "New plan: 2 activities added, 1 removed vs previous version"
- In the version selector, add a "△ N changes" badge next to newer plan versions
- Diff is purely client-side: compare activity names between versions

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
