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
**Status**: `[x]` Done

### C4 — Proactive Resurfacing
**Status**: `[x]` Done

---

## PHASE D — Beautiful iOS App (Current Sprint)

> All Phase A–C actionable tasks are complete. Phase D targets a truly polished,
> premium iOS experience — the kind users trust with months of travel research.
> Ordered by impact on the North Star metric (weekly clips per active user).

### D1 — iOS Native UX (Haptics + Transitions + Safe Areas)
**Status**: `[ ]` Not started  
**Files**: `app/layout.tsx`, `app/share/page.tsx`, `components/NavBar.tsx`, `app/page.tsx`  
**What to do**:
- Add Capacitor Haptics plugin (`@capacitor/haptics`) to package.json
- Create `lib/haptics.ts` wrapper: `taptic(type: 'light'|'medium'|'success'|'warning')` that no-ops outside native context
- Fire `taptic('success')` on clip save, board create, plan generation complete
- Fire `taptic('light')` on every NavBar tab switch
- Audit all `safe-top` / `safe-bottom` CSS classes — ensure every page that sits behind the status bar uses `env(safe-area-inset-top)` padding; same for bottom NavBar
- Add `transition-all duration-200` to all page navigations (Next.js already has this via framer-motion; ensure NavBar tab switches feel snappy)
- Add the `status-bar` background color (`#4f46e5`) to the Capacitor status bar config so the iOS status bar matches the app header

### D2 — Clip Editing (Edit Title, Description, Move Board)
**Status**: `[ ]` Not started  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`, possibly new `components/EditClipSheet.tsx`  
**What to do**:
- Add an Edit button (pencil icon) to `LocationDetailCard`
- Create `EditClipSheet.tsx` — a bottom drawer with:
  - Editable title field (pre-filled from `item.title`)
  - Editable description textarea
  - Board selector: list all boards + "Inbox" as options; current board pre-selected
  - Save button calls `updateItem()` in db.ts
- Add `updateItem(id, partial)` to `lib/db.ts` (already has `updateItemEnrichment`; add a general update)
- Moving boards: `removeItemFromBoard(oldBoardId, itemId)` + `addItemToBoard(newBoardId, itemId)`; if Inbox selected, just clear boardId
- Track `clip_edited` event in analytics

### D3 — Swipe-to-Delete on Clip Cards
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add swipe-left gesture to reveal a red Delete button (iOS-style)
- Use `framer-motion` drag on the card: `dragConstraints={{ left: -80, right: 0 }}`, `drag="x"`
- When dragged past -60px, show a red `Trash2` action revealed underneath
- On tap of the red zone or release past threshold, call the existing `onDelete` prop
- Keep existing long-press / menu approach as fallback for non-touch devices

### D4 — Substance Wisdom Tab on Board Detail
**Status**: `[ ]` Not started  
**Files**: `app/boards/[id]/page.tsx`, possibly new `components/WisdomTab.tsx`  
**What to do**:
- Add a tab bar to the board detail page: "Places" | "Wisdom"
- "Places" tab = the existing grid (current default)
- "Wisdom" tab aggregates ALL `substance` arrays from all board items into one flat list
- Group substance by type (tip, warning, opinion, wisdom, context, recommendation) with icons/colors
- Each entry shows: type icon, content, and the source clip title as a footnote
- Allow filtering by type (chip row at top)
- Empty state: "Save and enrich clips to see extracted wisdom here"
- This surfaces the #1 strategic moat on the board that users already know

### D5 — Pull-to-Refresh + Loading Skeletons
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Add a skeleton placeholder for `InboxCard` while items are loading (use `animate-pulse` gray boxes matching card layout)
- On `app/inbox/page.tsx` and `app/boards/page.tsx`: when loading=true, show 6 skeleton cards instead of spinner
- Add pull-to-refresh on the inbox scrollable list:
  - Use a `touchstart`/`touchmove` handler to detect pull-down gesture
  - When pulled > 60px, trigger a reload of items from IndexedDB
  - Show a small spinner with "Refreshing…" during reload
  - On Capacitor iOS: can use `@capacitor/app`'s `appStateChange` to refresh when app comes to foreground

### D6 — Favorites + Sort/Filter on Clips
**Status**: `[ ]` Not started  
**Files**: `lib/types.ts`, `lib/db.ts`, `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Add `isFavorite?: boolean` to `SavedItem` in `lib/types.ts`
- Add `toggleFavorite(id)` to `lib/db.ts`
- Add a heart/star button to `InboxCard` (top-right corner) that fires `toggleFavorite`
- On `app/inbox/page.tsx`, add a sort/filter bar:
  - Sort: "Newest first" | "Oldest first" | "Favorites first"
  - Filter: "All" | "★ Favorites" | "Pending enrichment" | platform filter (chips)
- The filter/sort state persists in `localStorage` so the user's preference is remembered

### D7 — Onboarding Walkthrough for New Users
**Status**: `[ ]` Not started  
**Files**: new `components/OnboardingWalkthrough.tsx`, `app/layout.tsx`  
**What to do**:
- Create a 3-step animated walkthrough modal shown to first-time users (localStorage key: `onboarding_complete`)
- Step 1: "Save from any app" — shows the Share button icon, text "Tap Share → TravelPanel in any browser or social app"
- Step 2: "AI extracts spots + wisdom" — shows a mini clip card with locations and substance badge; "We extract every tip, warning and insight, not just pins"
- Step 3: "Plan your trip" — shows a mini itinerary preview; "Turn your saves into a day-by-day plan with sourced advice"
- Navigation: dots indicator at bottom, "Next" and skip buttons
- Final CTA: "Start saving" → closes and optionally opens the Share sheet or the map view
- Store `onboarding_complete = true` on finish/skip

### D8 — Enhanced Plan Day View
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`  
**What to do**:
- Add horizontal day-tab navigation at the top of the plan: "Day 1" | "Day 2" | "Day 3" etc. (swipeable)
- When a day tab is selected, scroll to that day's section AND filter the map to show only that day's locations
- Add time-estimate per activity (e.g., "~2 hours") — Claude can include this in the plan prompt
- Add a "Share plan" button that generates a shareable plan text (uses the existing plan data) and opens the system share sheet
- Add estimated daily walking/transit distance at the top of each day card
- On the DayStripCard: make sourced tips (`sourcedTips` from A12) visually distinct — show a small clip thumbnail + "from: [title]" citation

---

## PHASE E — Power User Features (Next Sprint)

### E1 — In-App Notes on Clips
**Status**: `[ ]` Not started  
**Files**: `lib/types.ts`, `lib/db.ts`, `components/LocationDetailCard.tsx`  
**What to do**:
- Add `notes?: string` field to `SavedItem`
- Add a "Notes" section to `LocationDetailCard` — tap-to-edit inline textarea
- Auto-save on blur with a subtle "Saved" checkmark toast
- Notes appear in full-text search (extend `lib/searchItems.ts`)

### E2 — iOS Widget (Capacitor + WidgetKit)
**Status**: `[ ]` Not started  
**What to do**:
- Add a WidgetKit extension to the Xcode project
- Small widget: shows the count of saves this week + a "Clip" deep link button
- Medium widget: shows the 3 most recent saves with thumbnails and a "Plan" button
- Requires writing Swift/SwiftUI + sharing data via App Group UserDefaults (already in use for Share Extension)
- See `ios/App/ShareExtension/XCODE_SETUP.md` for App Group setup reference

### E3 — Real-World Enrichment Signals (Festivals, Weather, Prices)
**Status**: `[ ]` Not started  
**Files**: `app/api/plan/route.ts`, possibly `app/api/enrich/route.ts`  
**What to do**:
- This is the "trip planner vs real-world context" differentiator from PRODUCT_STRATEGY.md
- Add a festivals/events knowledge injection to the plan prompt:
  - Hardcode key annual events with dates (Cherry Blossom ~Apr 1–14 in Tokyo, Golden Week May, etc.)
  - If the plan mentions a destination + the user's travel dates are within an event window, inject a `⚠️ [Event] overlaps your dates — expect [X] impact`
- Add weather guidance: encode seasonal weather patterns per major destination into the planner prompt
- The goal is plans that say "April in Kyoto = cherry blossom peak + 40% price surge" without needing a live API

### E4 — Destination Clustering for Plan Generation
**Status**: `[ ]` Not started  
**Files**: `app/api/plan/route.ts`  
**What to do**:
- Currently the planner passes all item coordinates to Claude and asks it to cluster
- For 50+ locations, this produces poor results
- Implement client-side geographic clustering before sending to Claude:
  - Group locations by bounding box (within ~100km of each other)
  - Label each cluster with its dominant city/region name
  - Pass clusters to the planner, not individual pins
  - This produces "Kyoto cluster (12 saves)" → "Tokyo cluster (8 saves)" grouping that the planner can route between intelligently

### E5 — Ambient Board Organization (Auto-Tag + Auto-Sort)
**Status**: `[ ]` Not started  
**Files**: `lib/db.ts`, `app/boards/page.tsx`, possibly `app/api/organize/route.ts`  
**What to do**:
- When a user's inbox hits 10+ items, offer "Let AI organize your inbox into boards"
- Calls `/api/organize` with all inbox items → Claude clusters them by destination/theme → returns suggested board groupings
- User sees a preview of the proposed boards ("3 items → Japan", "4 items → Bali", "2 items → Food") with accept/reject
- On accept: create the boards, move items
- This is the "ambient organization promise" from PRODUCT_STRATEGY.md: clips organize themselves

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
