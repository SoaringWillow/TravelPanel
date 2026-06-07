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

### C1 — On-Trip GPS Mode ("Near Me")
**Status**: `[x]` Done  
**Why**: When a user is physically traveling, the most useful thing is: "which of my saved clips are near me right now?" This turns TravelPanel from a planner into an on-trip companion.  
**Files**: `app/page.tsx`, `components/MapView.tsx`, new `components/NearbyPanel.tsx`, `lib/geo.ts`  
**What to do**:
- Add a `lib/geo.ts` utility: `distanceKm(a, b)` using Haversine, `sortByDistance(clips, userLat, userLng)`
- Add a "Near Me" FAB (location pin icon) to `app/page.tsx` below the existing + FAB
- On tap: call `navigator.geolocation.getCurrentPosition()`, fly map to user location
- Show a pulsing blue dot at user location on the MapLibre map
- Slide up a `NearbyPanel` bottom sheet listing clips sorted by distance, with a distance badge (e.g. "0.4 km")
- Only show clips that have at least one location coordinate
- Dismiss panel on map tap; keep "Near Me" mode toggled until user explicitly turns it off
- If geolocation is denied, show a toast: "Enable location in Settings to use Near Me"
- Works fully offline (no API calls needed — distances are computed client-side)

### C2 — Post-Trip Timeline
**Status**: `[x]` Done  
**Why**: After returning from a trip, users want to relive it. A timeline of visited spots with their substance notes creates a travel journal automatically.  
**Files**: `app/trips/[boardId]/timeline/page.tsx` (new), `lib/db.ts`  
**What to do**:
- Add a "View Timeline" button to completed trip plans in `app/plan/[boardId]/page.tsx`
- Create a vertical timeline view: each day is a row, each activity in that day is a card
- Each card shows: location name, substance tips surfaced for that location, source clip thumbnail
- Add a `completedAt?: number` field to the `Trip` type in `lib/types.ts`
- Mark a plan as "completed" when user taps a new "Mark as Traveled" button
- The timeline is read-only and shareable as a screenshot (use `html2canvas` or share API)

### C3 — Shared Boards v1
**Status**: `[ ]` Not started  
**Needs**: Supabase B1 keys  
**What to do**: Generate a read-only shareable link for a board (deep link → web preview page showing the board's clips + map)

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started  
**Needs**: Supabase B1 keys  
**What to do**: If user has clips for a destination and a weather/event signal fires (e.g. user's next trip), surface relevant clips as a push notification

---

## PHASE D — iOS Native Polish 🍎

> Goal: make TravelPanel feel like a premium native iOS app, not a web app in a shell.
> All tasks in this phase address specific issues found in the iOS audit.

### D1 — Safe Area + Scroll Polish (iOS critical)
**Status**: `[x]` Done  
**Why**: Headers/footers are cut off by notch/Dynamic Island/home indicator on real devices. This is visible and embarrassing.  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`, `app/settings/page.tsx`, `components/NavBar.tsx`, `app/globals.css`  
**What to do**:
- Add `safe-area-inset-top` CSS variable support to `globals.css`: `.safe-top { padding-top: env(safe-area-inset-top, 0px) }`, `.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px) }`
- Apply `safe-top` to all page headers and `safe-bottom` to all scrollable content areas
- Apply `pb-[calc(6rem+env(safe-area-inset-bottom,0px))]` to all scrollable content (to clear the NavBar + home indicator)
- Add `-webkit-overflow-scrolling: touch` to all scrollable containers for iOS momentum scroll
- Test header doesn't clip on iPhone 14 Pro (Dynamic Island = 59px top inset)

### D2 — Dark Mode
**Status**: `[ ]` Not started  
**Why**: The audit found zero dark mode support. iOS 17+ users with system dark mode see a blinding white app.  
**Files**: All component files — add `dark:` Tailwind classes throughout  
**What to do**:
- Add `darkMode: 'class'` to `tailwind.config.ts` (or confirm it's set to `'media'`)
- Update `app/layout.tsx` to add a `ThemeProvider` that detects system preference and adds `class="dark"` to `<html>`
- Key color mappings: `bg-white → dark:bg-gray-900`, `bg-gray-50 → dark:bg-gray-950`, `text-gray-900 → dark:text-gray-100`, `border-gray-100 → dark:border-gray-800`, `bg-white/95 backdrop-blur → dark:bg-gray-900/95 backdrop-blur`
- Files needing dark mode: all `app/**/page.tsx`, `NavBar.tsx`, `InboxCard.tsx`, `ImportSheet.tsx`, `LocationDetailCard.tsx`, `SearchBar.tsx`
- Map dark style: MapLibre supports `demotiles` dark style — switch when system prefers dark

### D3 — Touch Targets + Haptics
**Status**: `[x]` Done  
**Why**: Many interactive elements are 13–16px — below iOS 44pt minimum. Haptics make interactions feel native.  
**Files**: `components/InboxCard.tsx`, `components/NavBar.tsx`, `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Increase all icon-only buttons to minimum `w-11 h-11` (44px × 44px) with `flex items-center justify-center`
- Add Capacitor Haptics: `import { Haptics, ImpactStyle } from '@capacitor/haptics'`
- Trigger `Haptics.impact({ style: ImpactStyle.Light })` on: clip save, board create, plan generate
- Trigger `Haptics.impact({ style: ImpactStyle.Medium })` on: delete confirmation, share
- Trigger `Haptics.notification({ type: NotificationType.Success })` on: enrichment complete
- All haptic calls must be wrapped in try/catch (no-op outside native context)

### D4 — Thumbnail Placeholder + Error States
**Status**: `[x]` Done  
**Why**: When thumbnails fail to load, cards look broken (empty grey). Need a consistent fallback.  
**Files**: `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Create a `ThumbnailImage` wrapper component that: shows a skeleton shimmer while loading, shows a styled fallback (platform icon + gradient background) on error
- Fallback design: gradient based on platform color (teal for YouTube, red for Instagram, etc.) with the platform initial letter centered
- Use this wrapper everywhere a thumbnail is displayed

### D5 — Pull to Refresh
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Implement pull-to-refresh using Capacitor's Motion plugin or a CSS overscroll trick
- On pull: re-run the enrichment retry queue (retry all `status: 'failed'` items)
- Show a native-looking spinner during the refresh
- Update the "last refreshed" timestamp in the UI

### D6 — iPad Split-View Layout  
**Status**: `[x]` Done  
**Files**: `app/page.tsx`, `app/inbox/page.tsx`  
**What to do**:
- At `lg:` breakpoint (768px+), show sidebar + content layout
- Left sidebar (320px): clip list / search / boards nav
- Right: full-width map or plan view
- NavBar becomes a vertical sidebar on iPad

---

## PHASE E — AI Quality

### E1 — Streaming Enrichment Status
**Status**: `[ ]` Not started  
**Why**: Enrichment takes 3–8s with no progress. Users think it's broken.  
**Files**: `app/api/import/route.ts`, `lib/enrichItem.ts`, `components/InboxCard.tsx`  
**What to do**:
- Change `/api/import` to stream NDJSON (same pattern as `/api/plan`)
- Emit events: `{ type: 'progress', stage: 'fetching' | 'extracting' | 'done' }`
- `enrichItem.ts` reads the stream and updates a progress state
- `InboxCard.tsx` shows the current stage text during enrichment: "Fetching page…" → "Extracting locations…" → "Done"

### E2 — Smart Duplicate Detection
**Status**: `[ ]` Not started  
**Why**: Users accidentally clip the same URL twice. Silent duplicates pollute boards.  
**Files**: `lib/db.ts`, `app/page.tsx` (ImportSheet flow), `app/share/page.tsx`  
**What to do**:
- Before saving a new item, check if `url` already exists in IndexedDB
- If duplicate found, show a warning: "You already saved this. View it?" with a link
- User can still save if they want (sometimes re-clips are intentional with different board)

### E3 — Coordinate Verification Pass
**Status**: `[ ]` Not started  
**Why**: Claude sometimes hallucinated GPS coordinates. A verification step catches gross errors (e.g. a "Tokyo restaurant" at 0,0 or in the wrong country).  
**Files**: `app/api/import/route.ts`  
**What to do**:
- After getting `locations` from Claude, run a lightweight sanity check: filter out any location with `lat === 0 && lng === 0`, and locations whose coordinates place them more than 5000 km from any other location in the same post (likely hallucination)
- Log filtered locations to console in dev mode
- No extra API calls needed — pure geometric logic

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
