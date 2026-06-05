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
**Status**: `[~]` Blocked — needs Supabase pgvector (B1 keys)  
**Needs**: Supabase pgvector (from B1)  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page

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

## PHASE D — iOS App Polish & Quality (Current Sprint)

> Goal: Make TravelPanel feel like a native iOS app — fluid, delightful, zero friction on the core clip flow.
> Priority order: `D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → D9 → D10 → D11 → D12`

### D1 — Clipboard URL Detection in Import Sheet
**Status**: `[x]` Done  
**Why**: On mobile, users copy a URL then switch to TravelPanel. Auto-detecting the clipboard URL and offering it as a one-tap suggestion reduces friction on the #1 action.  
**Files**: `components/ImportSheet.tsx`  
**What to do**:
- On sheet open, call `navigator.clipboard.readText()` (with permission fallback)
- If the clipboard contains a URL, show a "Paste from clipboard" suggestion chip above the input
- Tapping the chip fills the URL input and auto-triggers import
- On iOS, clipboard access prompts a system banner — this is expected and acceptable

### D2 — Board Cover Collage
**Status**: `[ ]` Not started  
**Why**: Empty-looking board cards give no visual sense of what's inside. Thumbnail collages make boards feel rich and inviting.  
**Files**: `components/BoardCard.tsx`, `app/boards/page.tsx`  
**What to do**:
- In the boards page, compute the first 4 thumbnails for each board from `items` matching `board.itemIds`
- Pass as `thumbnails: string[]` prop to `BoardCard`
- Render a 2×2 thumbnail grid as the card background (with overlay for text readability)
- Fallback to the current emoji + gradient when no thumbnails are available

### D3 — Data Restore / Import from Backup
**Status**: `[ ]` Not started  
**Why**: Without restore, the B5 export is write-only. Data loss on device wipe is existential.  
**Files**: `lib/exportData.ts`, `app/page.tsx` or new `components/RestoreSheet.tsx`  
**What to do**:
- Add a file input (hidden, `.json`) next to the export button
- Parse the `TravelPanelExport` JSON schema
- Validate version + structure before importing
- Merge strategy: skip items/boards already present by `id`, add new ones
- Show a success toast: "Restored X clips, Y boards"

### D4 — Swipe-to-Delete on Inbox Cards
**Status**: `[ ]` Not started  
**Why**: iOS users expect swipe-left to reveal delete. The current flow requires tapping into a detail view.  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Wrap `InboxCard` with a swipe gesture (use `@use-gesture/react` or a simple touch handler)
- Swipe left reveals a red "Delete" action button  
- Swipe fully left triggers delete directly (with a 1s undo toast)
- Use `framer-motion` `drag` for smooth animation

### D5 — Haptic Feedback on Key Actions
**Status**: `[ ]` Not started  
**Why**: Haptic feedback is a hallmark of native iOS quality. Currently the app is silent on all interactions.  
**Files**: `lib/haptics.ts` (new), call sites in share/page.tsx, ImportSheet.tsx  
**What to do**:
- Create `lib/haptics.ts` with `hapticLight()`, `hapticMedium()`, `hapticSuccess()`, `hapticError()` wrappers
- Use `@capacitor/haptics` when in native context, no-op in browser
- Fire haptics on: clip saved ✓, plan generated ✓, delete confirmed ✓, import error ✗
- Import and call at relevant points

### D6 — Board Detail Page Search + Sort
**Status**: `[ ]` Not started  
**Files**: `app/boards/[id]/page.tsx`  
**What to do**:
- Add a search bar to the board detail page (reuse `SearchBar` component)
- Add a sort dropdown: by date saved, by location count, by substance count
- Sort state persists only in-session (no need for localStorage)

### D7 — Trip Sharing via Shareable Link
**Status**: `[ ]` Not started  
**Why**: Users want to share itineraries with travel companions. Currently plans only export to PDF/ICS.  
**Files**: `app/plan/[boardId]/page.tsx`, new `app/plan/[boardId]/share/route.ts`  
**What to do**:
- Generate a read-only shareable URL: encode the TripPlan as compressed base64 in the URL hash
- "Share" button on the plan view creates the URL and copies to clipboard
- Anyone with the link can view the plan in a read-only version of the plan page
- No server required — all data in the URL

### D8 — Offline Detection & Graceful Degradation
**Status**: `[ ]` Not started  
**Files**: `hooks/useOnlineStatus.ts` (new), `components/OfflineBanner.tsx` (new)  
**What to do**:
- `useOnlineStatus()` hook using `navigator.onLine` + window events
- Show a subtle "Offline — clips are still saved locally" banner at top when offline
- Disable the "Clip" button and show "No internet — paste URL for later" when offline
- Map tiles still load from the browser cache

### D9 — App Icon Asset Generation
**Status**: `[ ]` Not started  
**Why**: The app uses the default Capacitor icon. A custom icon is required for App Store submission and makes the app feel polished.  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, new `scripts/generate-app-icons.js`  
**What to do**:
- Design a 1024×1024 master icon (indigo gradient map pin, same as browser extension)
- Generate all iOS icon sizes (20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024) using `sharp`
- Output to the Xcode asset catalog path with correct `Contents.json`
- Update splash screen image similarly

### D10 — Board Statistics View
**Status**: `[ ]` Not started  
**Files**: `app/boards/[id]/page.tsx`  
**What to do**:
- At the top of a board detail page, show a stats strip: total clips, total locations pinned, total substance items, total trips planned
- Tap a stat to scroll to the relevant section

### D11 — Batch Operations (Select / Move / Delete)
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Long-press on any card enters "select mode" (checkbox appears on all cards)
- Floating action bar appears at bottom: "Move to board" / "Delete" / "Cancel"
- "Move to board" shows a board picker sheet
- Confirm delete shows count: "Delete 3 clips?"

### D12 — Substance-Only View (Wisdom Feed)
**Status**: `[ ]` Not started  
**Why**: The substance items are the moat. A dedicated "Wisdom Feed" view — all tips/warnings/wisdom from all clips, chronologically — surfaces the value of the substance layer in a new context.  
**Files**: new `app/wisdom/page.tsx`, update `components/NavBar.tsx`  
**What to do**:
- New page at `/wisdom` listing all substance items across all clips
- Filter by type: tip, warning, opinion, wisdom, context, recommendation
- Each item shows the source clip title + "from your clip" attribution
- Add "Wisdom" tab to NavBar (replace or add next to existing tabs)

---

## PHASE C — On-Trip Mode (Future)

*(Previously listed above — moving to end of file to keep priority order)*

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
