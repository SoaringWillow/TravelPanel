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

## PHASE C — iOS Polish & Native Feel (Current Sprint)

> Goal: make the app feel like a premium iOS product — smooth gestures, haptics,
> beautiful empty states, and complete core flows. All tasks are web/Next.js
> implementable without Xcode unless noted.

### C1 — Swipe-to-Delete on Cards
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, possibly `app/boards/[id]/page.tsx`  
**What to do**:
- Wrap each card in a Framer Motion drag container (horizontal axis only)
- Swipe left > 80px reveals a red delete zone; release > 120px triggers delete with confirmation
- Show a trash icon in the revealed zone
- On delete: remove from IndexedDB, animate card out with height collapse
- Works for both Inbox items and Board detail items

### C2 — Haptic Feedback on Key Actions
**Status**: `[x]` Done  
**Files**: `lib/haptics.ts` (new), `app/share/page.tsx`, `components/InboxCard.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create `lib/haptics.ts`: thin wrapper around `@capacitor/haptics` that no-ops outside native context
- `impact('light')` — card taps, chip selections
- `impact('medium')` — save success, board creation
- `impact('heavy')` — delete confirmation
- `notification('success')` — clip saved (share done screen)
- `notification('warning')` — rate limit hit
- Wire into: share done state, board chip tap, delete confirm, retry button

### C3 — Empty States for All Pages
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/boards/[id]/page.tsx`, `app/page.tsx`  
**What to do**:
- Inbox empty: illustration with "Save your first inspiration" + share instructions + "Try the demo" button
- Boards empty: "Create your first collection" with a + button prominently centred
- Board detail empty: "No clips yet — add from your inbox" with a clear CTA
- Map empty: animated pulsing pin with "Save a post with locations to see it here"
- Each empty state uses the indigo/violet gradient palette and is visually distinct

### C4 — Pull-to-Refresh on Inbox
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `hooks/useSavedItems.ts` or similar  
**What to do**:
- On mobile, dragging down from the top of the list triggers a refresh of all items from IndexedDB
- Show a spinner during refresh (300ms minimum so it feels intentional)
- After refresh, re-run the retry queue for any failed enrichments
- Use Framer Motion drag + a threshold (pull > 60px = trigger)
- Trigger haptic `impact('light')` on threshold hit

### C5 — Board Cover Images
**Status**: `[x]` Done  
**Files**: `app/boards/page.tsx`, `lib/db.ts`  
**What to do**:
- When a clip with a thumbnail is added to a board, automatically set that thumbnail as `coverThumbnail` on the board (if not already set)
- In the board grid, show the cover thumbnail as a blurred background behind the emoji + board name
- If no cover: show a gradient based on the first letter of the board name
- Add a "Change cover" option in board settings (just pick from existing clip thumbnails in that board)

### C6 — Inline Clip Editing
**Status**: `[x]` Done  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- In `LocationDetailCard`, add an Edit button (pencil icon) that switches to edit mode
- Editable fields: title (text input), custom notes (textarea), tags (chip toggles)
- Save on blur or explicit "Save" button — writes to IndexedDB via `updateItemFields()`
- Add `updateItemFields(id, fields)` to `lib/db.ts`
- Cancel discards changes (show "Discard?" confirm if dirty)

### C7 — Inbox Sort & Filter
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `components/SearchBar.tsx`  
**What to do**:
- Add a filter bar below the search bar: "All", "Xiaohongshu", "YouTube", "Instagram", "WeChat", "Douyin"
- Platform chips are horizontally scrollable; active chip is indigo-filled
- Add sort toggle: "Newest" / "Oldest" / "Most locations"
- Persist the selected filter in component state (not URL — no page reload)
- Combine with existing full-text search (search + filter stack)

### C8 — Plan Export UI (wire existing lib)
**Status**: `[x]` Done (already implemented in plan page — PDF + ICS buttons wired)  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/exportPlan.ts`  
**What to do**:
- `lib/exportPlan.ts` already exists but the buttons are not wired up in the plan view
- Add an Export menu (sheet or dropdown) in the plan header with two options:
  - "Export PDF" → calls `exportToPDF(plan)` from `lib/exportPlan.ts`
  - "Add to Calendar (.ics)" → calls `exportToCalendar(plan)` from `lib/exportPlan.ts`
- Show a loading state while generating (PDF can take 1-2s)
- After download starts, show a "Downloaded!" toast for 2s

### C9 — App Icon & Capacitor Branding
**Status**: `[x] Done`  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `capacitor.config.ts`, `public/`  
**What to do**:
- Generate a set of app icon PNGs (1024x1024 base) using the existing `generate-icons.js` logic
  but with the full ✈️ on indigo gradient design
- Place correctly named files in `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json`
- Update `public/` with a 512x512 web app icon for the PWA manifest
- Update `app/layout.tsx` metadata with proper title, description, theme-color (#6366f1)
- Update `public/manifest.json` (or create it) with PWA metadata

### C10 — Safe Area & Notch Audit
**Status**: `[ ]` Not started  
**Files**: `app/globals.css`, `app/layout.tsx`, all page files  
**What to do**:
- Audit every page for proper `safe-area-inset-*` handling using `env()` CSS variables
- The share page, inbox, boards, plan, and settings pages all need safe top/bottom padding
- Create Tailwind utility classes: `safe-top` → `pt-[env(safe-area-inset-top)]`, `safe-bottom` → `pb-[env(safe-area-inset-bottom)]`
- The NavBar fixed bottom bar must sit above the home indicator on notchless iPhones
- Verify the plan page header doesn't overlap the status bar

---

## PHASE D — On-Trip & Discovery (Future)

### D1 — On-Trip GPS Mode
**Status**: `[ ]` Not started  
**What to do**: Show user's live location on the map; highlight nearby saved spots; turn-by-turn hint to next spot

### D2 — Post-Trip Timeline
**Status**: `[ ]` Not started  
**What to do**: After a trip, allow marking spots as "visited", add photos/notes per spot

### D3 — Shared Boards v1
**Status**: `[ ]` Not started  
**What to do**: Generate a read-only share link for a board (Supabase required); recipient sees map + clips

### D4 — Proactive Resurfacing
**Status**: `[ ]` Not started  
**What to do**: Weekly push notification: "You saved 3 Tokyo clips 2 months ago — ready to plan?"

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
