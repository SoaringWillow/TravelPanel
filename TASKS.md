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

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[x]` Done

### C2 — Post-Trip Timeline
**Status**: `[x]` Done

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[x]` Done

---

## PHASE D — iOS Polish & Beautiful UX (Current Sprint)

> All Phase A–C completable tasks are done. Phase D focuses on making the app
> genuinely beautiful and complete for the iOS App Store — the things that
> separate a prototype from a product.

### D1 — Clip Editing
**Status**: `[x]` Done  
**Why**: Users can't edit clips after saving. Wrong titles (Xiaohongshu share text is often garbage), missing tags, and wanting to add personal notes are all common. This is a core product gap.  
**Files**: `components/LocationDetailCard.tsx`, new `components/EditClipSheet.tsx`, `lib/db.ts`  
**What to do**:
- Add `updateItem(id, Partial<SavedItem>)` to lib/db.ts
- Create EditClipSheet: bottom sheet with fields for title, description, tags (multi-select chips), personal notes (textarea)
- Add "Edit" button (pencil icon) to LocationDetailCard header
- After save: update item in IndexedDB + refresh the UI state
- Tags: show existing extracted tags as toggle chips + allow adding custom tags

### D2 — Board Editing
**Status**: `[x]` Done  
**Why**: Users can't rename boards or change their emoji. With auto-created boards from the Share Extension having generic names like "🗺 New Board", this is a significant UX gap.  
**Files**: `components/BoardCard.tsx`, `app/boards/[id]/page.tsx`, possibly new `components/EditBoardModal.tsx`  
**What to do**:
- Long-press (or context menu via ⋯ button) on a board card → "Edit board"
- Modal with name input + emoji picker (grid of travel emojis)
- Save updates the board in IndexedDB, refreshes the UI

### D3 — Swipe-to-Delete on Clip Cards
**Status**: `[x]` Done  
**Why**: iOS users expect swipe-to-delete. Currently delete is buried in the detail card. This makes managing clips much faster.  
**Files**: `components/InboxCard.tsx`, possibly add a swipe gesture hook  
**What to do**:
- Add left-swipe gesture on InboxCard (and BoardCard clip list)
- Reveal red delete button on swipe
- Confirm delete (or instant with undo toast, 3s grace period)
- Use `@use-gesture/react` or framer-motion drag for the gesture

### D4 — Map Filtering by Tag/Board
**Status**: `[ ]` Not started  
**Why**: With 50+ clips, the map becomes overwhelming. Users need to filter by "show only food pins" or "show only Tokyo board pins".  
**Files**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Add a filter bar below the top header on the home/map page
- Filter chips: "All" + one per board (emoji+name) + tag filters (food, nature, etc.)
- When a filter is active, only show pins for matching items
- Filter chips scroll horizontally; active chip highlighted in indigo

### D5 — Skeleton Loading States
**Status**: `[x]` Done  
**Why**: The app currently shows blank screens or spinners while loading from IndexedDB. Skeleton screens dramatically improve perceived performance.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create a `SkeletonCard` component: animated shimmer placeholder matching InboxCard dimensions
- Show 3–4 skeleton cards while IndexedDB loads on the Inbox and Boards pages
- Use CSS animation: `@keyframes shimmer { from { opacity: 0.6 } to { opacity: 1 } }`

### D6 — Dark Mode
**Status**: `[ ]` Not started  
**Why**: iOS 15+ users expect dark mode. The app is currently white-only, which looks jarring in system dark mode.  
**Files**: `app/globals.css`, `tailwind.config.js`, all page/component files  
**What to do**:
- Enable `darkMode: 'class'` or `darkMode: 'media'` in tailwind.config.js
- Update every `bg-white`, `text-gray-900`, etc. with dark: variants
- Key surfaces: page backgrounds → `dark:bg-gray-950`, cards → `dark:bg-gray-900`, text → `dark:text-gray-100`
- Test on the Map, Inbox, Boards, Share, Plan, Settings pages

### D7 — Haptic Feedback on iOS
**Status**: `[ ]` Not started  
**Why**: iOS apps feel incomplete without haptic feedback on key actions. It's a small detail that significantly improves the native feel.  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Create `lib/haptics.ts` wrapping `@capacitor/haptics` (lightweight, already used pattern)
- Add `impact('medium')` on: clip saved, plan generated, board created
- Add `notification('success')` on: enrichment complete
- No-op gracefully outside Capacitor context (web/browser)

### D8 — Clip Notes & Personal Context
**Status**: `[ ]` Not started  
**Why**: Users want to add personal context to clips: "visited with Sarah", "waiting for cherry blossom season", "too expensive but worth it once". This is distinct from extracted substance — it's user-generated.  
**Files**: `lib/types.ts`, `lib/db.ts`, `components/LocationDetailCard.tsx`, `components/EditClipSheet.tsx`  
**What to do**:
- Add `notes?: string` to SavedItem (already in the type, just not surfaced in the UI)
- Surface notes in LocationDetailCard below the substance section
- Editable in EditClipSheet (D1) — a textarea with "Your notes" placeholder
- Include notes in the planner prompt so Claude can reference personal context

---

## PHASE E — Power Features (Next Sprint)

### E1 — Vibe Search (client-side, no Supabase)
**Status**: `[ ]` Not started  
**Why**: B4 is blocked on Supabase. But we can implement a good semantic-ish search using TF-IDF + substance content without embeddings. At 200 clips this works well; switch to pgvector when B1 is active.  
**Files**: new `lib/vibeSearch.ts`, `components/SearchBar.tsx`  
**What to do**:
- Extend the existing SearchBar to search across: title, description, tags, substance content, notes
- Weight substance items higher (they contain the real wisdom)
- Add "vibe" tokens: map common intents to tag sets ("cheap" → budget, "romantic" → relaxation, "foodie" → food)
- Show matched substance snippet in results (not just clip title)

### E2 — Location Editing on Map
**Status**: `[ ]` Not started  
**Why**: Claude sometimes extracts wrong coordinates. Users need a way to fix a pin by dragging it or searching for the correct place.  
**Files**: `components/MapView.tsx`, `components/EditClipSheet.tsx`, `lib/db.ts`  
**What to do**:
- In EditClipSheet (D1), show the extracted locations list
- "Fix location" button per location: opens a mini map with draggable pin
- On save: update the location coordinates in the item

### E3 — Trip Day Editing
**Status**: `[ ]` Not started  
**Why**: AI-generated plans are a great starting point but users need to adjust them. Move activities between days, add/remove stops.  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Make each activity in the plan draggable between days (drag-and-drop)
- "Remove" button per activity (×)
- "Add note" to an activity (user context)
- Re-save the edited plan as the current version

### E4 — Offline-First Enrichment Queue
**Status**: `[ ]` Not started  
**Why**: On iOS, if the user saves a clip without network, enrichment silently fails. Items get stuck in 'pending'.  
**Files**: `lib/enrichItem.ts`, service worker / background fetch  
**What to do**:
- Register a Background Fetch (iOS) or service worker background sync
- When network returns, automatically retry pending/failed items
- Show a "Back online — enriching 3 saved clips" toast

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
