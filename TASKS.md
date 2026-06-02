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

## PHASE D — iOS Polish & Delight (Current Sprint — "Beautiful App" push)

> **Goal**: Turn the functional MVP into a product that feels native, premium, and inevitable on iPhone.
> Every task below is independently shippable and self-contained.

### D1 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Wrap InboxCard in a framer-motion drag container that responds to horizontal swipe
- Dragging left ≥ 60px reveals a red delete zone with a trash icon
- Release at ≥ 80px triggers `onDelete`; releasing short snaps back with spring animation
- Show a red strip on the right as drag handle hint (width = |dragX|)
- Lock vertical scroll while horizontal drag is active (`dragElastic: 0`, `dragConstraints` left=-120, right=0)
- On iOS, the momentum from the swipe should feel natural (no artificial dampening)

### D2 — Haptic Feedback on Key Actions
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `app/inbox/page.tsx`, `app/plan/[boardId]/page.tsx`, new `lib/haptics.ts`  
**What to do**:
- Install `@capacitor/haptics` if not present (check package.json first — add if missing)
- Create `lib/haptics.ts` with `tap()`, `success()`, `warning()` wrappers that no-op outside native context:
  ```typescript
  // tap: light impact for button presses
  // success: notification success for save/complete actions
  // warning: notification warning for deletes
  ```
- Wire `success()` on clip save (share page `handleSave` after setStage('done'))
- Wire `tap()` on every primary button press (plan generate, board create)
- Wire `warning()` on delete confirmation
- All wrappers must be async and swallow errors silently

### D3 — Empty States with Character
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/page.tsx`  
**What to do**:
- Inbox empty state: replace plain text with a card showing:
  - Large emoji/SVG illustration (a phone with a share sheet)
  - Headline: "Your travel inspiration starts here"
  - Body: "Share any Instagram, YouTube, or Xiaohongshu post and Claude extracts the wisdom for you."
  - CTA button: "Open a link to try" (opens ImportSheet with placeholder URL)
- Boards empty state: illustration of a stack of cards + "Create your first collection"
- Map empty state: already shows globe icon — enhance with "Save clips to see them on the map" subtitle
- All empty states should be centered, generous whitespace, never feel like an error

### D4 — Custom Map Markers by Category Tag
**Status**: `[ ]` Not started  
**Files**: `components/MapView.tsx`  
**What to do**:
- Replace the single default pin color with per-category colors based on the item's first tag:
  - `food` → `#f97316` (orange)
  - `nature` → `#22c55e` (green)
  - `culture` / `history` / `art` / `architecture` → `#a855f7` (purple)
  - `adventure` → `#ef4444` (red)
  - `beach` → `#06b6d4` (cyan)
  - `city` / `shopping` / `nightlife` → `#6366f1` (indigo, default)
- Use MapLibre's `createRoot`/canvas approach or symbol layers with circle-color expressions
- Keep clusters using the existing cluster layer, count badge stays the same
- Pins should be 12×12px filled circles with a 2px white stroke and 1px drop shadow

### D5 — Import JSON Backup (pair with B5 export)
**Status**: `[ ]` Not started  
**Files**: `app/settings/page.tsx`, `lib/exportData.ts`  
**What to do**:
- Add "Import from backup" button below the export button in Settings
- Opens a file picker (`<input type="file" accept=".json">`)
- Parse the JSON, validate it has `version: 1` and `items`/`boards`/`trips` arrays
- For each item/board/trip: skip if an item with the same `id` already exists (no overwrite)
- Show a result toast: "Imported 12 clips, 3 boards (5 already existed — skipped)"
- On parse error: "Invalid backup file — please use a TravelPanel export"
- Add `importBundle(bundle)` function to `lib/exportData.ts`

### D6 — Hero Thumbnail in Location Detail Card
**Status**: `[ ]` Not started  
**Files**: `components/LocationDetailCard.tsx`  
**What to do**:
- When `item.thumbnail` is set, show it as a full-width hero image at the top (height: 200px, object-cover)
- Add a gradient overlay (`linear-gradient(to top, rgba(0,0,0,0.6), transparent)`) so the title and platform chip are readable on top of the image
- Move title + platform chip into the image overlay area (bottom-left, white text)
- Remove the separate header section when thumbnail is present (merges into hero)
- When no thumbnail: show a platform-colored gradient banner (height: 80px) instead of blank space
- Add a subtle drag handle at the very top of the sheet (4×40px gray pill)

### D7 — Trip Plan UI Overhaul
**Status**: `[ ]` Not started  
**Files**: `components/DayStripCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Redesign `DayStripCard` to use a vertical timeline layout:
  - Day header with colored pill (Day 1, Day 2…) and the day's theme
  - Each activity is a card connected by a vertical dashed line (the timeline)
  - Activity card shows: time chip, location name (bold), duration, tips row
  - Sourced tips render distinctly: indigo left-border, "💡 from [clip title]" attribution in smaller italic text
- Plan header: show total days, total locations, estimated distance as a horizontal stat row
- "Regenerate" button with a spinner during generation (already exists — style it better)
- Plan version selector (PlanVersionBar) should be styled as a segmented control

### D8 — Boards View Grid Layout
**Status**: `[ ]` Not started  
**Files**: `app/boards/page.tsx`, `components/BoardCard.tsx`  
**What to do**:
- Switch boards list from single-column cards to a 2-column grid on mobile
- Each board card: cover image (first clip thumbnail or gradient placeholder), emoji + name overlay, clip count badge
- Long-press (or hold) to enter "edit mode" where boards show a delete/reorder handle
- "New board" is always the last cell in the grid with a dashed border + "+" icon
- Board card aspect ratio: 3:4 (portrait, like an album cover)

### D9 — Smooth Page Transitions
**Status**: `[ ]` Not started  
**Files**: `app/layout.tsx`, any page that navigates between views  
**What to do**:
- Wrap page content in a framer-motion `AnimatePresence` with `mode="wait"`
- Each page: `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -8 }}`
- Duration: 0.18s with `ease: [0.4, 0, 0.2, 1]`
- The share page already has good animations — apply the same treatment to boards, inbox, plan views
- NavBar should NOT animate (stays fixed); only the page content animates

### D10 — In-App "Quick Add" URL Entry
**Status**: `[ ]` Not started  
**Files**: `app/page.tsx`, `components/ImportSheet.tsx`  
**What to do**:
- The existing ImportSheet is a modal — improve the trigger UX:
- FAB (floating action button) on the map: indigo circle with "+" at bottom-right, 20px above the NavBar
- On tap: ImportSheet slides up from bottom as a full-height sheet with a drag handle
- Auto-focus the URL input immediately
- Paste button: detect clipboard content on focus, if it's a URL, show a "Paste" chip above the keyboard
- After save: FAB pulses with a green checkmark briefly before resetting

---

## PHASE E — On-Trip & Social (Future)

### E1 — On-Trip GPS Mode (was C1)
**Status**: `[ ]` Not started  
**What to do**:
- "Start Trip" button on a plan view activates GPS tracking mode
- Show user's current location on the plan map
- Highlight the nearest activity to current position
- Distance + ETA to next activity (using device GPS + straight-line distance)
- "Arrived" button marks an activity done and advances to the next

### E2 — AI Concierge ("I just landed")
**Status**: `[ ]` Not started  
**What to do**:
- New entry point on home screen: "I just landed in [destination]"
- Auto-detect location from GPS, find matching boards/clips
- Generate a same-day plan optimized for arrival time + current location

### E3 — Shared Boards (was C3)
**Status**: `[ ]` Not started  
**Needs**: Supabase auth (B1)  
**What to do**: Read-only share link for a board; shared recipient can view clips + plan but not edit

### E4 — Festival & Weather Enrichment (was future)
**Status**: `[ ]` Not started  
**What to do**: When generating a plan, inject real-world signals (festivals, weather, public holidays) as context — tell Claude "it's sakura season in Tokyo right now, adjust the plan accordingly"

---

## PHASE C — On-Trip Mode (original stubs, superseded by Phase E above)

### C1–C4
**Status**: Superseded by Phase E tasks above with more detail.

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
