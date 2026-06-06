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

## PHASE D — iOS Polish & Feature Completion

### D1 — Clip Edit Mode 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: Users can't fix wrong extractions (bad coordinates, wrong title, typos). Read-only clips are a retention killer once the novelty of extraction wears off.  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add an edit pencil button to `LocationDetailCard`
- When tapped, switch to edit mode: editable title, description, notes textarea
- Allow editing location names and removing/adding individual location pins via a simple list
- Allow editing tags (toggle chips from the full tag list)
- "Save changes" → `updateItemEnrichment` patch, "Discard" → revert
- No AI re-extraction on edit — just update the stored data

### D2 — Move Clip to Board 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: Clips saved to Inbox have no way to be assigned to a board after the fact. Inbox piles up and becomes unusable. This is a basic collection management feature.  
**Files**: `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Long-press or swipe left on `InboxCard` → reveal action row: "Move to board" + "Delete"
- "Move to board" opens a bottom sheet showing all boards + "New board" option
- Selecting a board calls `addItemToBoard` and removes from Inbox view
- Also wire the same "Move" action inside `LocationDetailCard` detail view

### D3 — Import Backup (restore JSON)
**Status**: `[ ]` Not started  
**Why**: B5 added export but without import, backup is useless for device migration or accidental deletion recovery.  
**Files**: `app/settings/page.tsx`, new `lib/importData.ts`  
**What to do**:
- Add "Restore from backup" section below the export button in settings
- File input accepting `.json` — parse and validate as `TravelPanelBackup` schema
- Conflict resolution: skip items/boards/trips whose IDs already exist (idempotent)
- Show restore progress and summary: "42 clips, 8 collections imported"
- Handle malformed files gracefully (show parse error, don't corrupt DB)

### D4 — Trip Plan Timeline View 🔴 HIGH PRIORITY
**Status**: `[ ]` Not started  
**Why**: The current plan view is a text-heavy card list. A visual timeline with time markers, thumbnails, and distance estimates makes plans feel premium and actually usable for navigation.  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`, new `components/TimelineActivity.tsx`  
**What to do**:
- Replace the current `DayStripCard` activity list with a vertical timeline layout
- Each activity: left time column + connecting line + right content card (photo, name, duration, sourced tips)
- Show activity thumbnail from the source clip (matched by location name)
- Add a distance/travel time indicator between consecutive activities ("~12 min drive")
- "View on map" button on each activity → navigate to `/` with `?flyTo=lat,lng`
- Keep the existing streaming/version selector — just upgrade the activity renderer

### D5 — Map Trip Route Overlay
**Status**: `[ ]` Not started  
**Why**: TravelPanel claims "map-centric UI" but the map shows only scattered pins. Showing the day-by-day route for a saved plan makes the map the star.  
**Files**: `components/MapView.tsx`, `app/page.tsx`, `lib/db.ts`  
**What to do**:
- On the main map, if the currently-viewed board has a saved trip plan, add a toggle "Show trip route"
- When active: draw day-coloured polylines connecting activity locations in order (Day 1 = blue, Day 2 = green, etc.)
- Number badges on pins showing which day they appear on
- Tap a route segment → show activity name + time
- Uses `RouteMapView` pattern already in place

### D6 — Haptic Feedback (Capacitor)
**Status**: `[ ]` Not started  
**Why**: The app feels like a website, not a native app. Haptic feedback on key actions (pin tap, save, delete) is the #1 thing that makes Capacitor apps feel native.  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Create `lib/haptics.ts` with wrappers: `taptic()` (light), `successTaptic()` (medium), `errorTaptic()` (heavy)
- Import `@capacitor/haptics`; wrap in try/catch so it no-ops in browser
- Add `taptic()` on: map pin tap, board/inbox item tap
- Add `successTaptic()` on: clip save success (done stage in share page)
- Add `errorTaptic()` on: enrichment failed, limit hit

### D7 — Map Style Toggle (Satellite / Street)
**Status**: `[ ]` Not started  
**Why**: Travel planners want to see terrain and landmarks, not just street labels. Satellite mode is visually stunning and makes location review much richer.  
**Files**: `components/MapView.tsx`  
**What to do**:
- Add a small floating button (bottom-right, above the FAB) to cycle map style: Streets → Satellite → Terrain
- Store preference in `localStorage` so it persists
- MapLibre style URLs: OpenFreeMap streets (current), then satellite (use maptiler/esri free tier or OpenAerialMap), then OpenTopoMap
- The button shows a small icon indicating the NEXT style (not current)

### D8 — Near Me Filter
**Status**: `[ ]` Not started  
**Why**: On-trip use case: user is at a location and wants to see which saved clips are nearby. Currently no way to filter by current location.  
**Files**: `app/page.tsx`, `components/MapView.tsx`  
**What to do**:
- Add a "Near me" toggle button in the map toolbar
- Requests GPS permission via browser Geolocation API
- When active: show a radius circle (3km default) and filter pins to only those inside
- A slider to adjust radius (1km / 3km / 10km)
- Show a "X clips nearby" count badge
- Auto-pan map to user location when activated

### D9 — Budget Signals in Plans
**Status**: `[ ]` Not started  
**Why**: Substance items often contain price signals ("人均 ¥80", "entry fee $15", "free on Tuesdays"). Surfacing these in the trip plan turns vague advice into actionable budget planning.  
**Files**: `app/api/plan/route.ts`, `lib/types.ts`, `components/DayStripCard.tsx`  
**What to do**:
- During plan generation, scan substance items for price patterns (¥N, $N, €N, "free", "budget", "expensive")
- Add `estimatedCost?: string` to `Activity` type ("~¥80/person" or "Free")
- Render it as a subtle cost badge on each activity card
- Add a daily cost summary to each `DayPlan` (sum of activities with known costs)
- Keep it graceful: activities without price signals don't show anything

### D10 — iOS App Icon + Splash Screen
**Status**: `[ ]` Not started  
**Why**: The current iOS app uses the default Capacitor/Ionic icon. This looks unprofessional and will be rejected by App Store review. A proper icon is required for TestFlight.  
**Files**: `ios/App/App/Assets.xcassets/`, `public/icons/`, new `scripts/generate-icons.js`  
**What to do**:
- Design a map-pin icon in SVG: blue teardrop with white inner circle, gradient background
- Create `scripts/generate-icons.js` using `sharp` (npm) to generate all required iOS icon sizes
  (20×20, 29×29, 40×40, 60×60, 76×76, 83.5×83.5, 1024×1024 @1x/2x/3x)
- Generate PWA icons for `public/icons/` (192×192, 512×512) + update `public/manifest.json`
- Update `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json` to reference generated files
- Create a simple white-on-blue splash screen matching the icon

### D11 — Share Plan as Beautiful Link
**Status**: `[ ]` Not started  
**Why**: Trip plans are created in isolation. Users want to share their Tokyo 5-day itinerary with travel companions. This is a viral growth mechanism.  
**Files**: `app/plan/[boardId]/page.tsx`, new `app/plan/[boardId]/share/page.tsx`, new `app/api/share-plan/route.ts`  
**What to do**:
- "Share plan" button in plan view → generates a read-only shareable URL
- Server-side: store plan JSON in a `shared_plans` table (Supabase when available, or temporary serverless KV)
- For offline-first: encode the plan as a URL-safe compressed JSON in the hash (no server needed for small plans)
- Read-only view at `/plan/shared/[token]`: beautiful HTML with day timeline, maps, sourced tips
- Add Open Graph meta tags so WhatsApp/iMessage previews look rich

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
