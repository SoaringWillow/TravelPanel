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
**Status**: `[x]` Done  
**Needs**: Supabase pgvector (from B1) — implemented without it using Claude semantic expansion  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page

---

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[x]` Done

### C2 — Post-Trip Timeline
**Status**: `[x]` Done

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started

---

## PHASE D — Native iOS Polish (Current Sprint)

> Goal: Every interaction should feel native iOS — smooth, tactile, fast. No spinner text.
> Priority order: `D1 → D2 → D3 → D4 → D5 → D6`

### D1 — Loading Skeletons
**Status**: `[x]` Done  
**Files**: `components/SkeletonCard.tsx` (new), `app/inbox/page.tsx`, `app/timeline/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create a `SkeletonCard` component: a shimmering grey rectangle the same size as `InboxCard` using a CSS animation (`@keyframes shimmer`)
- Replace all `animate-spin` loading spinners and "Loading…" text with skeleton grids
- In inbox: show 6 skeleton cards (2-column grid) while `loading === true`
- In timeline: show 3 skeleton entries (full-width card shape) while loading
- In boards page: show 4 skeleton board cards while loading
- Use `bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer` (add `shimmer` keyframe to `globals.css`)

### D2 — Pull-to-Refresh
**Status**: `[x]` Done  
**Files**: `hooks/usePullToRefresh.ts` (new), `app/inbox/page.tsx`, `app/timeline/page.tsx`  
**What to do**:
- Create `usePullToRefresh(onRefresh: () => Promise<void>)` hook using pointer events (works on both web and iOS WebView):
  - Track `touchstart` / `touchmove` / `touchend` on the scroll container
  - When pulled down >80px from top and `scrollTop === 0`, trigger `onRefresh`
  - Show a spinning indicator at the top during pull and while refreshing
- In inbox page: pull-to-refresh re-fetches all items from IndexedDB and re-runs pending enrichment retry
- In timeline page: pull-to-refresh re-fetches items
- The refresh indicator should be an indigo spinner that scales in from 0 as the user drags

### D3 — Haptic Feedback
**Status**: `[x]` Done  
**Files**: `lib/haptics.ts` (new), `app/share/page.tsx`, `components/InboxCard.tsx`, `components/NearMePanel.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `haptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning')` that:
  - Calls `@capacitor/haptics` `ImpactOccurred` / `NotificationOccurred` when in Capacitor context
  - No-ops on web (graceful)
- Fire `haptic('success')` when a clip is saved in `app/share/page.tsx`
- Fire `haptic('light')` on board chip tap in the share page
- Fire `haptic('medium')` on long-press delete in `InboxCard`
- Fire `haptic('light')` when Near Me panel clips are tapped

### D4 — Edit Clip (title + notes)
**Status**: `[x]` Done  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add an "Edit" button (pencil icon) to the `LocationDetailCard` header
- Tapping opens an inline edit mode for:
  - Title (text input, max 200 chars)  
  - Notes (textarea, max 1000 chars, currently stored as `notes?: string` on `SavedItem`)
- Add `updateItemNotes(id: string, title: string, notes: string): Promise<void>` to `lib/db.ts`
- Save button commits and exits edit mode; ESC/dismiss cancels
- Show a small "Edited" badge on the card if notes are non-empty

### D5 — Duplicate Detection
**Status**: `[x]` Done  
**Files**: `lib/db.ts`, `app/share/page.tsx`, `components/ImportSheet.tsx`  
**What to do**:
- Add `findItemByUrl(url: string): Promise<SavedItem | null>` to `lib/db.ts`
  - Scan all items, normalize URLs (strip trailing slash, lowercase scheme/host) for matching
- In `app/share/page.tsx`, before showing the board picker, check if the URL is already saved
- If duplicate found: show a yellow banner "Already saved as: [title]" with a link to view it on the map
- User can still save again if they want (dismiss banner and proceed)
- In `ImportSheet`, add the same check after URL is entered (show inline "Already saved" hint)

### D6 — Bulk Operations
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Add a "Select" toggle button to the inbox header (appears when items exist)
- When in select mode, each card shows a checkbox overlay; tapping toggles selection
- Show an action bar at the bottom: "Delete [N]" and "Move to board [N]"
- Delete: confirm dialog, then batch-delete selected items from IndexedDB
- Move: show the board picker bottom sheet, then bulk-assign `boardId`
- "Select all" shortcut in the action bar
- Exit select mode with the X button or after completing an action

---

## PHASE E — Production Ready

> Goal: App Store submission quality — no rough edges, proper error handling, import from backup.
> Priority order: `E1 → E2 → E3 → E4 → E5`

### E1 — Import from JSON Backup
**Status**: `[x]` Done  
**Files**: `lib/importData.ts` (new), `components/SettingsSheet.tsx`  
**What to do**:
- Create `lib/importData.ts` with `importFromBackup(file: File): Promise<{imported: number; skipped: number}>`
  - Parse the JSON from `lib/exportData.ts` format (version 2)
  - For each item/board/trip: upsert via `saveItem`/`saveBoard`/`saveTrip` (skip if ID already exists)
  - Return counts for a success toast
- Add an "Import backup" button to `SettingsSheet` below the export button
- Trigger a hidden `<input type="file" accept=".json">` on click
- Show a result toast: "Imported 42 clips (3 already existed)"

### E2 — In-App Review Prompt
**Status**: `[x]` Done  
**Files**: `lib/db.ts` (or localStorage), `app/share/page.tsx`  
**What to do**:
- After the 5th clip is saved (track `clipCount` in localStorage), trigger a review prompt
- Use `@capacitor/rate-app` `requestReview()` in native context
- On web, show a subtle "Enjoying TravelPanel? ★ Rate us" banner that links to App Store URL
- Only trigger once (store `hasRequestedReview: true` in localStorage after showing)

### E3 — PWA Offline Banner
**Status**: `[x]` Done  
**Files**: `app/layout.tsx`, new `components/OfflineBanner.tsx`  
**What to do**:
- Listen to `navigator.onLine` events (online/offline)
- When offline, show a subtle yellow banner at the top: "Offline — saved clips still available"
- The banner animates in from the top and dismisses when connectivity returns
- The map will still load tiles from the cache (MapLibre caches tiles automatically)
- Add a `manifest.json` to the Next.js public folder with proper PWA metadata

### E4 — Global Error Boundary
**Status**: `[x]` Done  
**Files**: `components/ErrorBoundary.tsx` (new), `app/layout.tsx`  
**What to do**:
- Create a React class `ErrorBoundary` component with `componentDidCatch`
- On error, render a clean fallback: "Something went wrong" with a "Reload" button
- Wrap the `<body>` content in `app/layout.tsx` with `<ErrorBoundary>`
- In development, render the error stack; in production, just the reload button
- Log to PostHog if key is present: `track('app_error', { message, stack })`

### E5 — Board Cover Image
**Status**: `[x]` Done  
**Files**: `app/boards/page.tsx` or boards-related components  
**What to do**:
- Each board card should show a cover image auto-selected from the first item in the board that has a thumbnail
- Add `getCoverImage(boardId: string): Promise<string | null>` to `lib/db.ts` — fetches the first item with a thumbnail
- In the board list/grid view, show the cover image behind the board name (with a gradient overlay)
- If no items have thumbnails, fall back to the board emoji on a solid indigo background
- Lazy-load cover images with a skeleton shimmer placeholder

---

## PHASE F — Delight & Discovery (iOS Polish Sprint 2)

> Goal: Transform from functional to delightful. Every screen should feel purposeful and premium.
> Priority order: `F1 → F2 → F3 → F4 → F5 → F6`

### F1 — Map Welcome State
**Status**: `[x]` Done
**Files**: `app/page.tsx`
**What to do**:
- When `items.length === 0` and map is loaded, show a centered overlay card on the map:
  - Big emoji 🌍, bold headline "Clip your first destination", subtitle "Share a post from WeChat, Douyin, or Instagram to get started"
  - A "Clip something" button that opens `ImportSheet`
  - Card should float above the map with blur backdrop: `bg-white/90 backdrop-blur-md rounded-3xl shadow-xl`
- When items exist but none have coordinates (all enrichment pending), show a subtle pill: "Locations loading…" with a spinner at the top of the map

### F2 — First-Launch Onboarding Tour
**Status**: `[x]` Done
**Files**: new `components/OnboardingTour.tsx`, `app/page.tsx`
**What to do**:
- Create a 3-step full-screen modal that shows on first launch (gate with `localStorage.tp_onboarded`)
- Step 1: "📱 Clip from anywhere" — illustration of share sheet, text explaining iOS Share Extension
- Step 2: "🗺 AI finds the spots" — show example InboxCard with locations + substance badge
- Step 3: "✈️ Plan your trip" — show example plan itinerary snippet
- Each step: image/illustration area (160px, indigo bg with emoji), title, subtitle, Next/Get Started button
- Progress dots at bottom; "Skip" link top-right; final button navigates to main app

### F3 — Substance Feed (Wisdom Across Clips)
**Status**: `[x]` Done
**Files**: new `app/wisdom/page.tsx`, `components/NavBar.tsx`
**What to do**:
- Add a "Wisdom" tab to NavBar (💡 icon, 5th tab — or replace an existing less-used tab)
- `app/wisdom/page.tsx`: aggregates all `substance` items from all saved clips
- Group by `type`: Tips (💡), Warnings (⚠️), Recommendations (⭐), Opinions (💬), Context (🌍)
- Each item shows: icon + type label, `content`, source clip title (italic, gray), location if applicable
- Filter chips at top to toggle types; search bar filters by content
- Empty state: "Save some clips with substance to see wisdom here"

### F4 — Plan View Guided Empty State + Progress Indicator
**Status**: `[x]` Done
**Files**: `app/plan/[boardId]/page.tsx`
**What to do**:
- When board has items but none have coordinates: show a "Not enough location data" empty state with a helpful tip to retry enrichment
- When board has fewer than 2 locations: show a step-by-step guide card above the generate button:
  - "You have N location(s). For best results, add 3+ spots." with a count indicator
- Show a visual progress bar while streaming: "Crafting your day 1… 2… 3…" that advances as each day object arrives in the NDJSON stream
- Replace the plain spinner with an animated indigo progress bar at the top of the streaming plan

### F5 — Pending Enrichment Badge on Inbox Tab
**Status**: `[x]` Done
**Files**: `components/NavBar.tsx`, `app/page.tsx` or `app/layout.tsx`
**What to do**:
- When items have `enrichmentStatus: 'pending'` or `'processing'`, show a small pulsing indigo dot badge on the Inbox tab icon
- Source the count from a `usePendingCount` hook that queries IndexedDB via `getItemsByStatus`
- Badge should pulse (CSS animation) while pending, disappear when all done
- Keep it subtle: 8px dot, no number, just the visual indicator

### F6 — Board Detail Polish (Substance Highlights)
**Status**: `[ ]` Not started
**Files**: `app/boards/[boardId]/page.tsx` (or create it if missing)
**What to do**:
- Read the board detail page (check if it exists). If it does, add a "Highlights" row below the board header
- Show the top 3 substance items (highest quality tips/recommendations) from all clips in the board
- Use `SubstanceList` component; style as a horizontal scroll of mini-cards
- Each card: icon + type + content truncated to 2 lines + source clip title
- If no substance, show a "Add more clips for AI insights" prompt

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
