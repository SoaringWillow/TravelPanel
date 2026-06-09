# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (updated 2026-06-09)

Phase A + B2/B3/B5 complete. B4 blocked on Supabase keys. Phase C tasks expanded below.

**Path to a beautiful, fully-functional iOS app:**

`D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → E1 → E2 → E3 → E4 → E5 → F1 → F2 → F3`

Skip D7 (dark mode) if timeline is tight — it's the most work for least conversion impact.

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

## PHASE D — iOS Native Feel & UI Polish

### D1 — Haptic Feedback
**Status**: `[x]` Done  
**Why**: Every clip save, plan start, and board creation should feel tactile. Missing haptics make the app feel like a website, not a native app. Haptics are a 0-cost conversion boost.  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Install `@capacitor/haptics` (`npm i @capacitor/haptics`)
- Create `lib/haptics.ts` with `light()`, `medium()`, `heavy()`, `error()` — each calls `Haptics.impact()` / `Haptics.notification()` with the right style and no-ops if not in native context
- `light()` — chip taps, nav taps, board selection
- `medium()` — clip saved successfully, board created
- `heavy()` — trip plan generation complete
- `error()` — enrichment failed after all retries
- Wire: share page `handleSave` → `medium()` on success; plan view on plan ready → `heavy()`

### D2 — Pull-to-Refresh
**Status**: `[ ]` Not started  
**Why**: Standard iOS interaction. Users expect to pull down to see new clips and re-trigger pending enrichment.  
**Files**: new `lib/usePullToRefresh.ts`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create `lib/usePullToRefresh.ts` — a hook that listens to `touchstart`/`touchmove`/`touchend` on a ref element, calculates pull distance, and calls a callback when pulled ≥ 64px
- Shows a spinning indicator when pulling (use `@capacitor/haptics` `selectionChanged` for the tick feel)
- On release: re-loads items from IndexedDB + triggers retry for any `status: 'failed'` items with `retryCount < 3`
- Wire into inbox page and boards page

### D3 — Swipe to Delete Clips
**Status**: `[ ]` Not started  
**Why**: Currently no way to remove a clip. Users who clip by mistake or want to declutter are stuck. Delete is a core CRUD operation.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/[id]/page.tsx`  
**What to do**:
- Add swipe-left gesture on InboxCard (touch/pointer events, no library needed) that reveals a red "Delete" action
- On confirm-delete: call `deleteItem(id)`, animate card out with height collapse (framer-motion `AnimatePresence`)
- Undo toast: use a simple fixed-bottom toast with 5 s countdown; on "Undo" re-insert the item with `saveItem`
- Haptic: `light()` on swipe start, `error()` on delete confirm
- Track `clip_deleted` in analytics

### D4 — Clip Edit Modal
**Status**: `[ ]` Not started  
**Why**: Auto-extracted titles are sometimes wrong, users want to add notes, and reassigning clips to different boards requires re-saving. No edit path exists today.  
**Files**: new `components/EditClipModal.tsx`, `components/LocationDetailCard.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Create `components/EditClipModal.tsx` — a Drawer (vaul) sheet with fields: Title (input), Notes (textarea, multiline), Board assignment (select from boards list)
- Open from the "…" overflow menu on `LocationDetailCard` and via a long-press on `InboxCard`
- Save button calls `saveItem({ ...item, title, notes, boardId })` + `addItemToBoard` if board changed
- Track `clip_edited`

### D5 — Empty State Illustrations
**Status**: `[ ]` Not started  
**Why**: Empty map, empty inbox, and empty boards list all show a blank white screen — looks broken. Welcoming empty states guide new users and make the first-run experience feel polished.  
**Files**: `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create three inline SVG components (`EmptyMap`, `EmptyInbox`, `EmptyBoards`) — simple, single-color travel illustrations (compass, envelope, world map pin)
- Each empty state has: illustration (80px), headline, 1-line description, one CTA button
- Map empty: "Your saved places will appear here" + "Share your first clip" button
- Inbox empty: "Clip travel posts from Instagram, YouTube, and more" + "How to clip" (opens share page directly with example URL)
- Boards empty: "Organise clips into trip collections" + "Create your first board" (opens create modal)

### D6 — Loading Skeletons
**Status**: `[ ]` Not started  
**Why**: IndexedDB loads are fast but not instant. The current blank-then-populated flash looks like a bug. Skeletons show structure while data loads.  
**Files**: new `components/SkeletonCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create `components/SkeletonCard.tsx` — a grey shimmer card with animated gradient sweep (`animate-pulse` + custom gradient). Should match InboxCard proportions: thumbnail block (h-40) + two text lines
- Show 3 `SkeletonCard` components while `isLoading === true` (add `isLoading` state, set false after first `getAllItems()` resolves)
- Boards page: similar skeleton for `BoardCard` (h-32 + two text lines)
- Fade out skeletons and fade in real cards (framer-motion opacity transition)

### D7 — Dark Mode
**Status**: `[ ]` Not started  
**Why**: iOS respects system appearance. An app that ignores dark mode feels unfinished in 2026. Many users run iOS dark mode full-time.  
**Files**: `tailwind.config.js`, `app/globals.css`, `app/layout.tsx`, all major components  
**What to do**:
- Set `darkMode: 'media'` in `tailwind.config.js`
- Add `dark:` variants to every `bg-white`, `bg-gray-50`, `text-gray-900`, `border-gray-100` in the major components (NavBar, InboxCard, BoardCard, LocationDetailCard, share page, plan page)
- Map: detect `prefers-color-scheme: dark`, switch MapLibre style to a dark base style (e.g. `maptiler/streets-v2-dark`)
- Add a manual override toggle (Light / Dark / System) in `app/settings/page.tsx`, persist in localStorage
- Test: all 4 pages + share page in dark mode

### D8 — Beautiful Board Cards with Cover Images
**Status**: `[ ]` Not started  
**Why**: The boards list is the app's "home base" for planning. Currently text-only emoji tiles. Cover images make it feel like a real travel app.  
**Files**: `components/BoardCard.tsx`  
**What to do**:
- Show `board.coverThumbnail` as a full-bleed background image behind the card (already stored, just not rendered)
- Dark gradient overlay (`from-black/0 via-black/20 to-black/70`) for text legibility
- Bottom: emoji + board name (white, shadow) + clip count chip + "X clips"
- If no cover image: use a gradient background seeded from the board's emoji (deterministic color from hash)
- Animate card entry with stagger (framer-motion `variants` + `staggerChildren: 0.06`)

---

## PHASE E — Feature Completeness

### E1 — Inline Clip Notes
**Status**: `[ ]` Not started  
**Why**: `SavedItem.notes` already exists in the type but is never rendered or editable. Users want to annotate clips ("booked for March", "skip unless kid-friendly", "ask about local guide").  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add a "Notes" section below the Wisdom section in `LocationDetailCard`
- Tap-to-edit: shows a textarea on tap, auto-focus
- Auto-saves on blur via `saveItem({ ...item, notes })`
- Placeholder: "Add a personal note…" (light gray, italic)
- Show notes as plain text when not editing (truncated to 3 lines with "more")

### E2 — Plan Image Export (Social Sharing)
**Status**: `[ ]` Not started  
**Why**: When users share their plan as an image, it markets the app organically. Current exports (PDF, ICS) are for planning tools, not social. Image sharing drives top-of-funnel.  
**Files**: `app/plan/[boardId]/page.tsx`, new `lib/sharePlanImage.ts`  
**Needs**: `npm i html2canvas`  
**What to do**:
- "Share as image" button in the completed plan view (share icon, near the PDF export button)
- Use `html2canvas` to screenshot the first DayStripCard + overview header
- Composit a TravelPanel watermark (logo + "Made with TravelPanel") at the bottom
- Call `navigator.share({ files: [imageFile] })` for native iOS share sheet, fallback to download link
- Track `plan_shared`

### E3 — Import Backup
**Status**: `[ ]` Not started  
**Why**: B5 added export but not import. Data portability requires round-trip. Also useful for device migration.  
**Files**: `app/settings/page.tsx`, new `lib/importData.ts`  
**What to do**:
- File input (`<input type="file" accept=".json">`) in Settings → Data & Backup section
- Parse the JSON, validate it matches `TravelPanelBackup` shape (check `version === '1.0'`, check `items`/`boards`/`trips` arrays)
- Merge strategy: skip any item/board/trip whose `id` already exists in the local DB (safe idempotent import)
- Show import summary: "✓ Imported 42 clips, 5 boards, 3 itineraries (12 already existed)"
- Track `backup_imported`

### E4 — Board Sorting & Filtering
**Status**: `[ ]` Not started  
**Why**: With 10+ boards, users need to find their "Tokyo 2024" board fast. Current sort (creation date, newest first) becomes unhelpful as the collection grows.  
**Files**: `app/boards/page.tsx`  
**What to do**:
- Sort dropdown/segmented control: "Recent" (default, by `updatedAt`), "A–Z", "Most clips", "Date created"
- Filter chips row: "All" (default), "Has plan", "No plan yet"
- Persist sort preference in `localStorage` key `boards_sort`

### E5 — Itinerary Route Visible on Map
**Status**: `[ ]` Not started  
**Why**: The RouteMapView component exists but the plan view doesn't link back to the main map with the route visible. Seeing the physical journey on the map is the "wow moment" that turns a list into a trip.  
**Files**: `app/plan/[boardId]/page.tsx`, `app/page.tsx`, `components/RouteMapView.tsx`  
**What to do**:
- "View route on map" button in the completed plan view — navigates to `/?boardId=<id>&showRoute=1`
- In `app/page.tsx`, read `boardId` + `showRoute` from URL search params
- When `showRoute=1`, load the latest trip for `boardId`, pass day-plan locations to `RouteMapView`
- Animate camera to fit all route points on mount (use MapLibre `fitBounds`)

---

## PHASE F — Performance & Reliability

### F1 — Enrichment Retry UI
**Status**: `[ ]` Not started  
**Why**: Failed enrichments silently sit. Users see a card title but no locations or wisdom, with no indication it failed or that they can retry.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Add a subtle "Extraction failed · Tap to retry" state on cards with `enrichmentStatus === 'failed'` and `retryCount >= 3`
- Tap calls `enrichItem(id, url)` immediately (bypasses the automatic retry queue)
- Show spinner while retrying, success/fail state after
- Track `clip_manual_retry`

### F2 — Clip Deduplication
**Status**: `[ ]` Not started  
**Why**: Users accidentally share the same URL twice and see duplicate cards with no warning. Duplicates pollute boards and waste AI credits.  
**Files**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- Add `getItemByUrl(url)` function to `lib/db.ts` (scan `items` store for matching `url` field)
- In `app/share/page.tsx`, before the board picker shows, call `getItemByUrl(rawUrl)`
- If duplicate found: show "You've already saved this" with the clip's title + board name + a "View it" button and a secondary "Save again anyway" option
- No duplicate check for blank URLs

### F3 — Background Enrichment Status Bar
**Status**: `[ ]` Not started  
**Why**: When the app opens and 5 clips are processing, users have no idea. A subtle top-of-screen bar shows the AI is working and builds trust.  
**Files**: `app/inbox/page.tsx`, new `components/EnrichmentStatusBar.tsx`  
**What to do**:
- Create `components/EnrichmentStatusBar.tsx` — a slim (h-8) animated bar that slides down from under the nav when items are processing
- Text: "✨ AI is reading 3 clips…" with a progress-style pulse animation
- Disappears automatically when no items have `enrichmentStatus: 'pending' | 'processing'`
- Poll every 3 seconds via `useEffect` + `setInterval`
- No bar when everything is `done` or `failed`

---

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Not started  
**Why**: Once the user is on their trip, the app should switch from planning mode to navigation mode — showing nearby saved spots with distance and walking direction.  
**Files**: new `app/trip/page.tsx`, `components/MapView.tsx`  
**What to do**:
- "Start trip" button in the plan view activates On-Trip mode
- Map shows user's live GPS location (Geolocation API or `@capacitor/geolocation`)
- Nearby pins from the current board pulse with distance label ("8 min walk")
- Next activity in the day plan is highlighted with a blue arrow
- "Mark as visited" button on each pin — checked off with haptic

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started  
**Why**: After a trip, users want to review what they did, rediscover which clips matched reality, and easily share a trip recap.  
**Files**: new `app/recap/[boardId]/page.tsx`  
**What to do**:
- Chronological timeline view of all clips in a board, sorted by when items were visited
- Photo grid of thumbnails
- "Write a note" prompt per day
- Export as a travel journal PDF

### C3 — Shared Boards v1
**Status**: `[ ]` Not started  
**Needs**: Supabase (B1) activated  
**Why**: Friends plan trips together. Sharing a board link is a growth lever — every shared board is a new user acquisition opportunity.  
**Files**: new `app/boards/[id]/share/page.tsx`, `lib/cloudSync.ts`, Supabase `boards` table  
**What to do**:
- "Share board" button generates a public read-only link (`/boards/[id]/share`)
- Public page shows board clips + map (no edit, no auth required)
- Share via iOS native share sheet (`navigator.share`)
- Click-to-clone: "Save to my TravelPanel" button on the public view

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started  
**Why**: The North Star is weekly clips per active user. Resurfacing old clips ("You saved 12 Tokyo clips 3 months ago — planning to go?") re-activates dormant users.  
**Files**: new `app/api/remind/route.ts`, `lib/supabase.ts`, push notification setup  
**What to do**:
- Weekly cron (Vercel cron or Supabase edge function): find users with 5+ clips but no trip plan
- Send a "Reminder: your [City] trip is waiting to be planned" push notification via Supabase Edge + APNs
- Deep-link to the board planner

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
