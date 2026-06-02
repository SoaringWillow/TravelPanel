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
**Status**: `[ ]` Not started

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started

---

## PHASE D — iOS Polish & Native Feel 🍎

> Goal: make the app feel genuinely native and delightful on iPhone. These are all web-layer changes (Tailwind/React) that the Capacitor shell renders as a native app. Work top-to-bottom.

### D1 — Haptic Feedback on Key Actions
**Status**: `[ ]` Not started  
**Files**: `lib/haptics.ts` (new), `app/share/page.tsx`, `components/InboxCard.tsx`, `components/ImportSheet.tsx`  
**What to do**:
- Create `lib/haptics.ts` wrapper: `tap()`, `success()`, `error()`, `heavy()` — calls `@capacitor/haptics` on native, no-ops in browser
- `tap()` on every button press in share flow and inbox cards
- `success()` after a clip is saved and after plan is generated  
- `error()` on enrichment failure or rate-limit hit
- Install `@capacitor/haptics` (already in package.json likely — check first; if not, add to imports)

### D2 — Pull-to-Refresh on Inbox & Boards
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, new `components/PullToRefresh.tsx`  
**What to do**:
- Create `PullToRefresh` component: detect overscroll-up gesture (touchstart/touchmove delta), show a spinner at top, call `onRefresh()` when dragged far enough, release with spring animation
- On `onRefresh` in inbox: re-run the retry queue for failed items + reload items from IndexedDB
- On `onRefresh` in boards: re-read boards from IndexedDB (pick up any changes)
- Respect `safe-top` inset so spinner appears below the status bar

### D3 — Swipe-to-Delete on Inbox Cards
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Wrap InboxCard in a swipe gesture handler using `framer-motion` `drag="x"` with constraints `{ right: 0 }`
- As the user drags left > 60px, reveal a red delete background with a trash icon
- On release > 100px, animate the card height to 0 and delete from IndexedDB
- On release < 100px, spring back to origin
- On iOS, trigger `tap()` haptic when reveal threshold is crossed and `heavy()` on delete confirm

### D4 — Skeleton Loading Screens
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Replace the raw `loading ? 'Loading…' : <content>` pattern with animated skeleton screens
- Create a `SkeletonCard` component: grey shimmer rectangles matching the InboxCard shape (thumbnail placeholder, 2 text line placeholders)
- In inbox: show 4 SkeletonCards while `loading` is true
- In boards: show 3 skeleton board tiles
- Shimmer animation: CSS `@keyframes shimmer` with `background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)` moving left-to-right

### D5 — Dark Mode Support
**Status**: `[ ]` Not started  
**Files**: `app/globals.css`, `app/layout.tsx`, all page components  
**What to do**:
- Enable Tailwind dark mode: add `darkMode: 'media'` to `tailwind.config.js`
- Replace hard-coded `bg-white`, `text-gray-900` etc. with dark-mode-aware variants: `bg-white dark:bg-gray-900`, `text-gray-900 dark:text-gray-100`
- Pages to update: `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/settings/page.tsx`, `app/share/page.tsx`
- Components to update: `NavBar`, `InboxCard`, `LocationDetailCard`, `ImportSheet`
- Map: MapLibre supports dark style — swap to `dark` tile URL when `prefers-color-scheme: dark`
- Test with `@media (prefers-color-scheme: dark)` in browser devtools

### D6 — iOS App Icon (Proper Branding)
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/` + a new `scripts/generate-app-icons.py`  
**What to do**:
- Write a Python script `scripts/generate-app-icons.py` that generates all required iOS app icon sizes (20, 29, 40, 60, 76, 83.5, 1024 px) as PNG using only stdlib (same approach as browser-extension icons)
- Icon design: deep indigo (#4F46E5) background, white map-pin shape centered, small white dot inside pin head
- Run the script and verify all 12 required icon sizes are generated in the Xcode asset folder
- Update `Contents.json` in the appiconset to reference the generated files
- Add the script to `package.json` scripts as `"icons": "python3 scripts/generate-app-icons.py"`

---

## PHASE E — Content Management

> Fill the "crud gap" — users need to manage their clips and boards.

### E1 — Delete & Archive Clips
**Status**: `[ ]` Not started  
**Files**: `components/LocationDetailCard.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Add a "Delete clip" button (trash icon) to `LocationDetailCard` — tapping shows a confirmation (`confirm()` dialog or an inline "Are you sure?" animation)
- On confirm: delete from IndexedDB, remove from board's `itemIds`, emit an `itemDeleted` event via a custom DOM event so the map and inbox re-render
- The swipe-to-delete on InboxCard (D3) covers the inbox surface; this covers the detail card surface
- After deletion: close the detail card, fly the map back to full view, show brief toast "Clip deleted"

### E2 — Edit Board (Rename, Emoji, Delete)
**Status**: `[ ]` Not started  
**Files**: `app/boards/page.tsx`, `app/boards/[id]/page.tsx`  
**What to do**:
- On boards list page: long-press (or tap a "…" menu icon) on a board card to show options: Rename, Change emoji, Delete
- Rename: inline editable input (tap to edit, blur to save to IndexedDB)
- Change emoji: emoji picker (a grid of 20 common travel emojis: 🗺🏔🏖🌃🍜🎭🛕🌅🏕🏛🎨🏄🌊🌸🍣🗼🎋🛶🏯🌋)
- Delete: confirmation → delete board and all its `itemIds` mappings (clips remain in inbox)
- On board detail page (`[id]`): show a "Edit board" button in the header that navigates to inline edit mode

### E3 — Move Clip Between Boards
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Already partially exists in inbox (the "Move to board" sheet) — extend it to work from `LocationDetailCard` too
- Add a "Move to…" action in the detail card's action row (join an existing row of icon-buttons)
- Open a bottom sheet listing all boards + "Remove from board" option
- On select: update `item.boardId`, update old board's `itemIds` (remove), update new board's `itemIds` (add)

### E4 — Re-Enrich (Refresh) Clip
**Status**: `[ ]` Not started  
**Files**: `components/LocationDetailCard.tsx`, `lib/enrichItem.ts`  
**What to do**:
- Add a "Re-extract" / refresh icon button to `LocationDetailCard` (small circular arrow icon, bottom of card)
- Tapping resets `enrichmentStatus` to `'pending'` and calls `enrichItem(id, url)` again
- Show a loading spinner inside the button while enrichment runs
- On success: re-read item from IndexedDB and update the card's displayed data (substance, locations, etc.)
- Useful when a clip was clipped before the page was fully loaded, or after Xiaohongshu images are available

---

## PHASE F — Discovery & Plan UX

> Surface clips better and make trip plans more useful.

### F1 — Tag/Category Filter on Map
**Status**: `[ ]` Not started  
**Files**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Add a horizontal scrollable tag-filter row below the top bar on the home page
- Tags: All | 🍜 Food | 🌿 Nature | 🏛 Culture | 📸 Photo | 🎭 Art | 🏖 Beach | 🏔 Mountain
- Active filter: highlighted chip (indigo background)
- Filter the `items` passed to `MapView` based on `item.tags`; non-matching pins fade to 30% opacity
- "All" clears the filter; tag is stored in local state only (no URL param needed)

### F2 — Plan Sharing (Copy as Text)
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add a "Share" button in the plan view toolbar (next to Export)
- "Share as text" generates a markdown-formatted trip itinerary string with day headers, time slots, activity names, and sourced tips
- On native (Capacitor): use `@capacitor/share` to open the iOS share sheet with the text
- On web (browser fallback): copy to clipboard and show "Copied!" toast
- Format example:
  ```
  🗺 Tokyo Weekend — 2 Days
  
  **Day 1 — Arrival & Culture**
  🕘 9:00 AM — Senso-ji Temple
  💡 From your clip "Tokyo Hidden Gems": Go at 7am to beat crowds
  🕒 2:00 PM — Ueno Park
  ...
  ```

### F3 — Substance Highlights on Map Pins
**Status**: `[ ]` Not started  
**Files**: `components/MapView.tsx`  
**What to do**:
- On pin tap (before the full `LocationDetailCard` opens), show a compact "peek" tooltip above the pin
- Tooltip shows: clip title (1 line) + the first substance item's content (1 line, truncated) + "X more tips" badge
- This surfaces the substance layer passively while browsing the map
- Tooltip dismisses on next tap or after 3 seconds; tapping the tooltip opens the full detail card
- Implement as an absolutely-positioned div anchored to the pin's map coordinates (use MapLibre's `LngLat` to pixel conversion)

### F4 — Activity Icon System in Plan View
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx` (or equivalent)  
**What to do**:
- Map activity names to emoji icons: food/restaurant/eat → 🍽, temple/shrine/church → 🛕, museum/gallery → 🏛, market/shop → 🛍, park/garden/nature → 🌿, beach/sea/ocean → 🏖, viewpoint/vista/view → 📸, bar/nightlife/club → 🌃, hotel/sleep/rest → 🏨, transport/train/bus → 🚃, activity/sport/hike → 🥾
- Match by keyword presence in `activity.name.toLowerCase()`
- Show the icon before the activity name in the plan UI
- Fallback icon: 📍 (generic pin)

---

## PHASE G — Cloud Sync Activation (Needs Supabase Keys)

### G1 — Supabase Project Bootstrap  
**Status**: `[ ]` Blocked on keys  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**What to do**: Once keys are provided — run `supabase/schema.sql`, wire `syncNow()` on auth change + app focus, add sign-in surface to settings page

### G2 — Embedding Search (Vibe Search)
**Status**: `[ ]` Blocked on G1  
**Needs**: Supabase pgvector enabled  
**What to do**: (was B4) Embed clip substance text via `text-embedding-3-small`, store in pgvector, add semantic search bar

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
