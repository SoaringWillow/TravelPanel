# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-04)

Phase A and all actionable Phase B tasks are complete. The app extracts substance,
surfaces it in clip detail, threads it into plans, retries enrichment, clusters pins,
supports full-text search, onboarding seed boards, plan export/versioning, browser
extension (B2), Claude Vision for Xiaohongshu (B3), and JSON backup export (B5).

The next sprint is **Phase D — iOS Polish**. Goal: make the app feel beautiful and
fully native on iOS. Priority order (moat test: capture easier OR more substance):

`D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → D9 → D10 → D11 → D12`

B4 (vibe search) is blocked until Supabase keys are provided — skip it; it unblocks
automatically once `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist.

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

## PHASE D — iOS-First Polish (Current Sprint)

> Goal: every interaction feels premium on iOS. The clip action is snappy, substance
> is beautiful, and the app competes visually with top-tier travel apps.

### D1 — Duplicate URL Detection
**Status**: `[x]` Done  
**Why**: Saving the same URL twice silently creates two cards. Users with 50+ clips start seeing duplicates; data quality suffers and the inbox gets noisy.  
**Files to change**: `lib/db.ts`, `components/ImportSheet.tsx`, `app/share/page.tsx`  
**What to do**:
- Add `getItemByUrl(url: string): Promise<SavedItem | undefined>` to `lib/db.ts` — query the `items` store by URL
- In `ImportSheet` (web import flow): before showing the save button, call `getItemByUrl(url)`. If found, show an inline banner: "Already saved on [date] → [board name]" with a "View" link and a "Save anyway" option
- In `app/share/page.tsx` (iOS Share Extension flow): after reading the URL param, call `getItemByUrl` and if found show a duplicate banner at the top of the board picker with same UX
- The check is async (IndexedDB) — show a brief loading state ("Checking…") while it resolves

### D2 — Restore from Backup
**Status**: `[x]` Done  
**Why**: B5 added export. Without import/restore, data loss on device wipe is still existential. The pair completes the backup story.  
**Files to change**: `app/settings/page.tsx`, `lib/exportData.ts`  
**What to do**:
- Add `importFromJSON(json: unknown): Promise<{ boards: number; clips: number; trips: number }>` to `lib/exportData.ts`
  - Validate the JSON structure (must have `version: 2`, `boards[]`, `items[]`)
  - Import strategy: skip any item/board/trip whose `id` already exists in IndexedDB (non-destructive merge)
  - Use `saveItem`, `saveBoard`, `saveTrip` from `lib/db.ts` for each record
  - Return counts of imported vs skipped records
- In `app/settings/page.tsx` add a "Restore from backup" row below the export row
  - Hidden `<input type="file" accept=".json">` triggered by the button
  - Parse the file, call `importFromJSON`, show success: "Imported 42 clips, 5 boards" or error states
  - Confirm dialog before importing: "This will add N items to your library. Existing items won't be overwritten."

### D3 — Clip Notes / Personal Annotation
**Status**: `[x]` Done  
**Why**: The `notes` field already exists on `SavedItem` but is never exposed. Users want to add their own context ("Friend recommended this", "Call ahead to book"). This turns clips from pure extracts into personal travel intelligence.  
**Files to change**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add `updateItemNotes(id: string, notes: string): Promise<void>` to `lib/db.ts`
- In `LocationDetailCard`, add a "My notes" section at the bottom:
  - If `item.notes` is empty: show a "+ Add note" ghost button
  - On click, replace with a `<textarea>` (autofocused, 3 lines)
  - Auto-save on blur (debounced 500ms) via `updateItemNotes`
  - If notes exist, show them as editable text — tap to enter edit mode
  - Show a subtle pencil icon when notes are present
- Notes are included in the full-text search in `SearchBar` (already searches `substance` — add `notes` to the search fields)

### D4 — Rich Clip Cards with Thumbnail (InboxCard Redesign)
**Status**: `[x]` Done  
**Why**: Current InboxCard shows a plain card with text. Top travel apps (Romy, Wanderlog) have rich visual cards. The substance count badge is buried. This is the #1 visual impression the user has of their saved content.  
**Files to change**: `components/InboxCard.tsx`  
**What to do**:
- When `item.thumbnail` is present: show it as a full-width header image (16:9, `object-cover`) with a subtle gradient overlay at the bottom
- Platform badge: always visible in top-left corner of the thumbnail (or top-left of the card header if no thumbnail)
- Substance chips: below the title, show chip pills for substance types present (e.g. "💡 3 tips  ⚠️ 1 warning") — tap these chips to open the detail card with the substance tab focused
- Location count: "📍 4 places" chip if `item.locations.length > 0`
- Clean typography: title at 15px semibold, domain at 11px gray, max 2 lines for title
- Empty/loading states are already well-implemented — keep them, just restyle the done state
- The card tap target should open `LocationDetailCard` — ensure the whole card is tappable, not just the title

### D5 — Tag Filter Bar (Inbox + Map)
**Status**: `[x]` Done  
**Why**: At 50+ clips, users need to filter by category. Tags already exist on every clip but are never surfaced for filtering. "Show me only food clips" is a common mental query.  
**Files to change**: `app/inbox/page.tsx`, `app/page.tsx` (map view)  
**What to do**:
- Create `components/TagFilterBar.tsx`: horizontally scrollable chip row of tags aggregated from all visible items; "All" chip always first; active chip highlighted in indigo; clicking toggles filter; tapping active chip deselects
- Aggregate tags from all items: `const allTags = [...new Set(items.flatMap(i => i.tags))].sort()` — show only tags with ≥2 clips
- In `app/inbox/page.tsx`: place `TagFilterBar` below the search bar; filter the items list by `selectedTag`
- In `app/page.tsx` (map view): place `TagFilterBar` below the top bar; filter the pins passed to `MapView`
- Combine with existing search: if search query + tag filter are both active, apply both (AND)
- Empty state: "No [tag] clips yet" with the existing empty state component

### D6 — Haptic Feedback (iOS Native)
**Status**: `[x]` Done  
**Why**: Every premium iOS app uses haptics. Saves feel physical; confirmations feel real. This is the cheapest "this feels native" improvement available.  
**Files to change**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/ImportSheet.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with two helpers:
  - `hapticLight()` — `@capacitor/haptics` ImpactStyle.Light; no-ops if not in Capacitor
  - `hapticSuccess()` — `@capacitor/haptics` NotificationType.Success; no-ops outside native
  - Both are async, always imported with dynamic import so they don't bloat the web bundle
- Fire `hapticSuccess()` in `app/share/page.tsx` when the save completes (on transition to 'done' stage)
- Fire `hapticLight()` in `ImportSheet` when the user taps a board chip to select it
- Fire `hapticLight()` in `app/plan/[boardId]/page.tsx` when the "Generate plan" button is pressed
- Fire `hapticLight()` in `NavBar` on each navigation tap (via `onClick` handlers)

### D7 — Board Management Polish
**Status**: `[x]` Done  
**Why**: Boards can be created but not renamed, re-emojied, or archived. After a few trips users want to reorganize. The boards page is a dead end once boards exist.  
**Files to change**: `app/boards/page.tsx`, `app/boards/[id]/page.tsx`, `components/CreateBoardModal.tsx` (extend to edit mode), `lib/db.ts`  
**What to do**:
- Add `updateBoard(id: string, patch: Partial<Pick<Board, 'name' | 'emoji'>>): Promise<void>` to `lib/db.ts`
- Extend `CreateBoardModal` to accept an optional `board` prop (edit mode) — if provided, title = "Edit board", fields pre-filled, save calls `updateBoard` instead of `saveBoard`
- In `app/boards/page.tsx`: add a "⋯" overflow menu on each board card (long-press on iOS) with options: Edit, Delete
- Delete board confirmation modal: "Also delete all clips in this board?" with two buttons: "Delete board only" (orphans clips, removes board) vs "Delete everything" (deletes board + all its items)
- In `app/boards/[id]/page.tsx`: show board emoji + name in the header with an edit pencil button that opens the edit modal
- Board item count: show "N clips" under the board name on the boards list

### D8 — Import Sheet URL Preview
**Status**: `[x]` Done  
**Why**: When users paste a URL in the Import Sheet, they see nothing until the enrichment completes. Showing the og:image thumbnail instantly makes the capture feel fast and confirms they pasted the right URL.  
**Files to change**: `components/ImportSheet.tsx`  
**What to do**:
- When URL field is non-empty and the user pauses typing (300ms debounce), fetch `GET /api/preview?url=<url>` (new endpoint below)
- Create `app/api/preview/route.ts`: a lightweight endpoint that fetches only the `<head>` of the page and returns `{ title, thumbnail, platform }` — cap at 5s timeout, return empty on failure
- In `ImportSheet`, below the URL input: show a preview card (thumbnail as 3:2 image, title text, platform badge) when preview data is available; 150ms fade-in animation
- Platform badge auto-populated from the detected platform — shows before the user clicks Save
- Keep the existing "Clip" button flow unchanged; the preview is purely visual, no data passed from it

### D9 — Map Pin Visual Improvements
**Status**: `[ ]` Not started  
**Why**: All map pins currently look identical. Platform-colored pins and better tap targets make the map readable at a glance — "I can see I have 5 food places and 2 nature spots in Tokyo."  
**Files to change**: `components/MapView.tsx`  
**What to do**:
- Replace the existing circle layer with SVG marker icons using `maplibregl.Marker` (one per item) or GeoJSON symbol layer
- Color scheme (match platform): YouTube=`#ff0000`, Instagram=`#e1306c`, Xiaohongshu=`#ff2442`, other=`#6366f1`
- If item has tags, color by primary tag instead of platform: food=`#f97316`, nature=`#22c55e`, culture=`#8b5cf6`, adventure=`#f59e0b`, default=`#6366f1`
- Icon: filled circle + white dot (like the browser extension icon) at 24×24px
- On pin tap: brief pop animation (scale 1 → 1.2 → 1) before opening detail card
- Cluster markers: keep the existing count badge but color them dark indigo

### D10 — Plan View Visual Redesign
**Status**: `[ ]` Not started  
**Why**: The trip planner's output is the payoff for all the substance extraction. Currently it renders as a plain list. A card-based visual layout with timeline, location thumbnails, and highlighted substance citations will make users want to generate plans just to see the output.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`  
**What to do**:
- Redesign `DayStripCard` to show a full-bleed gradient card per day:
  - Day number + date label in top-left
  - Activities listed as timeline items (vertical line + dot + activity text)
  - Each activity has: icon (map pin for locations, star for activities), activity name, time estimate, and sourced tips inline (with "From: [clip title]" attribution in indigo)
  - If `activity.location` has coordinates, show a mini static map thumbnail (use MapLibre static render or a placeholder)
- Add a sticky day nav at the top of the plan view: horizontal scroll of "Day 1 · Day 2 · Day 3…" chips that jump-scroll the content
- "Copy to calendar" and "Export PDF" buttons moved to a floating bottom action bar
- Streaming state: show a pulsing skeleton card for the day currently being generated

### D11 — Dark Mode
**Status**: `[ ]` Not started  
**Why**: Dark mode is expected on iOS apps. Without it the app looks unfinished. The CSS variables for dark mode are already declared in `globals.css` (shadcn/ui defaults) — the work is adding `dark:` variants to each component.  
**Files to change**: `app/globals.css`, `app/layout.tsx`, all page and component files  
**What to do**:
- In `app/globals.css`, populate the `.dark` CSS variable block — use warm dark grays (`#111827`, `#1f2937`, `#374151`) not pure black; keep indigo accent
- In `app/layout.tsx`, read `prefers-color-scheme` via `useEffect` + `matchMedia` and add/remove `class="dark"` on `<html>` on first render; also handle toggle via `localStorage("theme")`
- Add a "Appearance" setting row in `app/settings/page.tsx`: "Light / Dark / System" three-way toggle stored in localStorage
- Audit each component file and add `dark:` Tailwind variants for: `bg-white` → `dark:bg-gray-900`, `text-gray-900` → `dark:text-gray-100`, `border-gray-100` → `dark:border-gray-800`, etc.
- MapLibre: switch tile style URL to dark variant (`protomaps/dark`) when dark mode is active
- Test all pages: map, inbox, boards, plan, share, settings

### D12 — Share Extension Native Board Picker (iOS)
**Status**: `[ ]` Not started  
**Why**: The current Share Extension opens the full web app to pick a board. This is slow (WebView cold-start ~1-2s) and visually jarring. A native mini-UI in the extension itself would let users tap a board and close in under 0.5s — matching the speed of iOS-native apps like Pocket.  
**Files to change**: `ios/App/ShareExtension/ShareViewController.swift` (UI redesign), possibly new `MainInterface.storyboard`  
**What to do**:
- Replace the `UIViewController` subclass with a `SLComposeServiceViewController`-style view that shows:
  - App icon + "Save to TravelPanel" header
  - Read recent boards from App Group (written by the main app on each board update): show up to 5 as tappable chips
  - "Inbox" chip always first
  - "Save" button that writes the clip + selected board to App Group and closes
- Main app on next launch: read the App Group item, call `saveItem()` + `enrichItem()`, no navigation needed
- This removes the WebView cold-start from the critical path; enrichment still runs as background after the user has already closed the sheet
- Note: reading/writing structs via App Group requires JSON encoding; reuse the same `pendingShareURL`/`pendingShareTitle`/`pendingShareBoardId` keys

---

## PHASE E — Cloud Activation (Unblocks with Supabase Keys)

> These tasks are dormant until `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> are set. Once set, run them in order.

### E1 — Activate Supabase (complete B1)
**Status**: `[ ]` Not started (blocked: needs Supabase keys)  
**Files to change**: `app/layout.tsx`, new `components/AuthProvider.tsx`, `lib/cloudSync.ts`  
**What to do**:
- Create Supabase project, run `supabase/schema.sql`
- Build `components/AuthProvider.tsx`: wraps `useEffect` that calls `supabase.auth.onAuthStateChange` and syncs on sign-in
- Add sign-in UI: magic-link email input in the Settings page (under a new "Account" section)
- Wire `syncNow()` from `lib/cloudSync.ts` on auth state change and on app foreground (`visibilitychange`)
- Add a cloud sync indicator (small cloud icon with spinner/checkmark) in the NavBar or Settings header

### E2 — Vibe / Embedding Search
**Status**: `[ ]` Not started (blocked: needs Supabase + E1)  
**Why**: This is the Phase B4 task. At 200+ clips, keyword search hits a wall. Embedding search enables "minimalist cafes Tokyo" → returns the right clips even if those exact words don't appear.  
**Files to change**: `app/api/embed/route.ts` (new), `lib/cloudSync.ts`, `components/SearchBar.tsx`  
**What to do**:
- On each clip save to Supabase, call `app/api/embed/route.ts` which generates an embedding via Claude and stores it in the `embedding` vector column
- Update `SearchBar` to detect "vibe queries" (no exact match found after text search) and fall back to pgvector similarity search via a new `app/api/search/route.ts`
- Add subtle "(vibe)" label next to results that came from semantic search

### E3 — Public Board Share Links
**Status**: `[ ]` Not started (blocked: needs Supabase + E1)  
**Why**: Users want to share their Tokyo board with friends planning the same trip. A read-only public link is low-risk and high-value.  
**Files to change**: `lib/db.ts`, new `app/b/[shareId]/page.tsx`, `app/boards/[id]/page.tsx`  
**What to do**:
- Add `isPublic: boolean` and `shareId: string` to the `Board` type
- "Share board" button in `app/boards/[id]/page.tsx` generates a unique `shareId`, sets `isPublic: true`, copies the URL `https://app.com/b/<shareId>` to clipboard
- `app/b/[shareId]/page.tsx`: reads board + items from Supabase (public RLS policy) and renders a read-only board view with substance visible
- Show all clips + the substance wisdom layer — this demonstrates the product's moat to potential new users

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
