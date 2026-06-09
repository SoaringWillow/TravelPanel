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

## PHASE C — Native Polish & Core Management (Current Sprint)

> All Phase A + most of Phase B done. The app extracts substance, plans trips, exports data,
> and has a browser extension. What's left to be **beautiful and fully functional** on iOS:
> board-filter on map, clip editing, board rename, iOS haptics/safe-areas, dark mode,
> thumbnail images in cards, performance with large libraries, and offline support.
>
> Recommended order: `C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8`

### C1 — Board Filter on Map
**Status**: `[x]` Done  
**Why**: Map currently shows ALL saved items regardless of board. With 100+ clips across multiple trips, the map is unusable. Board filter is the #1 UX gap.  
**Files**: `app/page.tsx`, `components/MapView.tsx`, possibly a new `components/BoardFilterBar.tsx`  
**What to do**:
- Add a horizontal pill-scroll board filter bar above the map (or in the top-right overlay)
- "All" pill always visible and selected by default
- One pill per board (show emoji + name, truncated to 12 chars)
- Filter state in `useState` — on selection, pass `filteredBoardId` to `MapView` and only show items from that board
- Persist last-used filter in `sessionStorage` so it survives hot reloads
- Animate pill selection with a subtle spring (framer-motion)

### C2 — Clip Edit Mode (title, notes, tags)
**Status**: `[x]` Done  
**Why**: Users can't correct a wrong extracted title or add personal notes. `SavedItem.notes` exists in the type but is never editable.  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts` (update function already exists: `updateItemEnrichment`)  
**What to do**:
- Add an edit icon (Pencil) in the detail card header
- Toggling edit mode turns the title and description into `<input>`/`<textarea>` fields, in-place
- Show a tag selector: tap to toggle tags from the predefined list
- "Notes" text area (maps to `SavedItem.notes`)
- Save button commits via `db.updateItemEnrichment(id, 'done', { title, description, tags, notes })`
- Cancel restores original values
- Keyboard avoidance: scroll the card up when a keyboard appears (CSS `scroll-margin-bottom`)

### C3 — Board Rename
**Status**: `[x]` Done  
**Why**: Users can delete boards but not rename them. Board names are permanent typos.  
**Files**: `app/boards/page.tsx`, `components/BoardCard.tsx` (check if exists), `lib/db.ts`  
**What to do**:
- Long-press or swipe on a board card reveals a context menu: "Rename" + "Delete"
- Rename opens an inline text field seeded with the current name; confirm with Return or a ✓ button
- `saveBoard({ ...board, name: newName })` — `saveBoard` is already an upsert
- Add optional `updatedAt` field update: `saveBoard({ ...board, name, updatedAt: Date.now() })`

### C4 — iOS Safe Areas, Haptics, and Pull-to-Refresh
**Status**: `[x]` Done  
**Why**: On iPhone with a notch/Dynamic Island, content clips under the status bar and above the home indicator. No haptic feedback means saves feel unconfirmed.  
**Files**: `app/layout.tsx`, `app/globals.css`, `app/inbox/page.tsx`, `app/share/page.tsx`, `components/CapacitorBridge.tsx`  
**What to do**:
- `globals.css`: add `padding-top: env(safe-area-inset-top)` to the main content wrapper; `padding-bottom: env(safe-area-inset-bottom)` to nav
- `app/layout.tsx`: add `<meta name="viewport" content="...viewport-fit=cover">` to enable safe area CSS vars
- Haptic feedback on clip save: use `@capacitor/haptics` — `Haptics.impact({ style: ImpactStyle.Light })` — in `app/share/page.tsx` when stage transitions to 'done'
- Pull-to-refresh on inbox: use `@capacitor/splash-screen`'s RefreshPlugin or a pure CSS overscroll → re-fetch items from DB
- Install `@capacitor/haptics` if not present

### C5 — Thumbnail Display in Clip Cards
**Status**: `[x]` Done (was already implemented in InboxCard)  
**Why**: `SavedItem.thumbnail` is populated from og:image but never displayed in the card list. Users see a blank rectangle where a visual should be.  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- For clips with `thumbnail` set and `enrichmentStatus === 'done'`, show the thumbnail as a right-side image (64×64px rounded-lg) in the card
- Use `next/image` with `unoptimized` (since URLs are external and vary by platform)
- Graceful degradation: if image fails to load, hide it (onError → hide element)
- For Xiaohongshu clips with a Vision-derived thumbnail (no og:image available), keep blank — don't show broken icon

### C6 — Clip Library Performance (Virtual List)
**Status**: `[x]` Done  
**Why**: At 200+ saves, the inbox renders all cards in the DOM, causing scroll jank on mobile. This is an existential issue for power users.  
**Files**: `app/inbox/page.tsx`, possibly `components/VirtualInboxList.tsx`  
**What to do**:
- Install `@tanstack/react-virtual` (lightweight, no native deps, works in Next.js)
- Replace the `{items.map(...)}` render in the inbox with a virtualized list
- Row height is approximately 100px (fixed estimate); use `estimateSize` for variable
- Keep `SearchBar` outside the virtual container (renders above it)
- Preserve scroll position on back-navigation using `sessionStorage`

### C7 — Dark Mode
**Status**: `[x]` Done  
**Why**: iOS users overwhelmingly use Dark Mode at night. The current white UI is jarring. No `dark:` classes exist anywhere.  
**Files**: `app/globals.css`, `app/layout.tsx`, `tailwind.config.js`, all major components  
**What to do**:
- `tailwind.config.js`: set `darkMode: 'class'`
- `app/layout.tsx`: add a `ThemeProvider` that reads `prefers-color-scheme` and a `data-theme` override stored in `localStorage`
- Add `dark:` variants to: `bg-white → dark:bg-gray-900`, `text-gray-900 → dark:text-white`, card borders, map overlay backgrounds
- Settings page: add a Theme toggle (System / Light / Dark)
- `globals.css`: define CSS variables for the map background to invert in dark mode (`map-style: dark` uses MapLibre's built-in dark vector tiles)
- Aim: complete dark mode for map, inbox, boards, plan, share, and settings pages

### C8 — Offline Clip Queue
**Status**: `[x]` Done  
**Why**: The Share Sheet works offline (saves the item) but enrichment silently fails and never retries after connectivity returns. Users lose substance for clips saved on the subway.  
**Files**: `lib/enrichItem.ts`, `app/layout.tsx` (or a new `components/OfflineHandler.tsx`)  
**What to do**:
- In `enrichItem`, detect network errors (as opposed to API errors) and set `enrichmentStatus: 'pending'` instead of `'failed'`
- Add an `online` event listener to `window` that fires `retryPendingItems()` when connectivity returns
- `retryPendingItems()`: find all items with `status: 'pending'` and `retryCount < 3`, enqueue them with 500ms staggered delays
- Show a subtle offline banner ("You're offline — clips will enrich when back online") using `navigator.onLine` + the `online`/`offline` events
- Hide the banner on reconnection with a "Back online ✓" flash for 2s

---

## PHASE D — Advanced Features (Next Sprint)

### D1 — Map Board Filter (already in C1 above)
*(Merged into C1)*

### D2 — Shared Boards (Read-Only Link)
**Status**: `[ ]` Not started  
**Needs**: A short-link or Supabase storage for the board snapshot  
**What to do**: "Share board" generates a read-only `/boards/[id]/preview` page or a Supabase-hosted snapshot with clips + map

### D3 — Batch Import
**Status**: `[x]` Done  
**What to do**: Accept multiple URLs (newline-separated) in the import sheet; queue them as sequential enrichments

### D4 — Embedding/Vibe Search  
*(Same as B4 — Needs Supabase pgvector)*  
**Status**: `[ ]` Blocked on B1 activation  

### D5 — On-Trip GPS Mode
**Status**: `[x]` Done  
**What to do**: "I'm there now" mode — shows nearest saved clips, real walking distance, turn-by-turn link to Apple Maps

---

## PHASE E — Social + AI (Future)

### E1 — Post-Trip Timeline
**Status**: `[x]` Done

### E2 — Proactive Resurfacing ("you're near a saved spot")
**Status**: `[x]` Done

### E3 — AI Similar Places Suggestions
**Status**: `[x]` Done

---

## PHASE F — iOS Polish & Production Readiness

> All major features are implemented. This phase makes the app feel native,
> professional, and ready for App Store submission. Focus: visual polish,
> iOS-native gestures, PWA quality, and board management UX.

### F1 — PWA Manifest & iOS App Icons
**Status**: `[x]` Done
**Why**: The app lacks proper icons for "Add to Home Screen" on iOS. `manifest.json` has placeholder sizes. Without real icons, the app looks unfinished when installed.
**Files**: `public/manifest.json`, `public/icons/` (new), `app/layout.tsx`
**What to do**:
- Generate a proper icon set for the app (PNG) using the existing pure-Node PNG generator pattern from `browser-extension/scripts/generate-icons.js`
- Required sizes: 192×192 (Android/PWA), 512×512 (PWA splash), 180×180 (apple-touch-icon), 167×167 (iPad), 152×152, 120×120
- Icon design: indigo-to-violet gradient background + white map pin emoji or custom TravelPanel icon
- Update `public/manifest.json` with correct icon entries
- Add `<link rel="apple-touch-icon" href="/icons/icon-180.png">` to layout.tsx
- Add `<meta name="apple-mobile-web-app-title" content="TravelPanel">` to layout.tsx

### F2 — Emoji Picker for Boards
**Status**: `[x]` Done
**Why**: Boards default to 🗺 emoji, which makes all boards look the same. Users should be able to personalize with a travel emoji.
**Files**: `components/EmojiPicker.tsx` (new), `app/boards/page.tsx` (new board dialog), `app/share/page.tsx` (new board flow)
**What to do**:
- Create `EmojiPicker` component: a small grid (4 columns) of travel-relevant emojis
- Categories: Destinations (🗼🏯🗽🎡🏝🏔🌋🏕), Food (🍜🍣🍕🥘🍷🧋🥐), Activity (🎨🛍🧗🏄🚂✈️🚢🎭), Nature (🌊🌸🍁🌅🌃🌄)
- Tap to select; show in board card and rename input
- Wire into new board creation dialog in boards page and share page

### F3 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done
**Why**: iOS users expect swipe-left to reveal delete. Tap-the-trash is slower and less discoverable.
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`
**What to do**:
- Wrap each InboxCard in a swipeable container using framer-motion drag
- Swipe left beyond 80px threshold reveals a red delete button underneath
- Spring-snap back to center if not committed; animate out on confirm
- Only in the 'done' state cards (skeleton/failed cards use their own delete)
- Preserve the existing delete button as fallback

### F4 — Board Detail Sort & Filter
**Status**: `[x]` Done
**Why**: With 20+ clips in a board, finding specific places is hard. Sorting by date or location count helps.
**Files**: `app/boards/[id]/page.tsx`
**What to do**:
- Add a sort button (or dropdown) to the board detail header: "Newest first", "Oldest first", "Most locations", "Alphabetical"
- Apply sort to `boardItems` before rendering (both grid and timeline views)
- Persist sort preference in sessionStorage per board

### F5 — Plan View Improvements (Day Notes + Share)
**Status**: `[x]` Done
**Why**: The plan view generates well but users can't annotate it or share it with travel companions.
**Files**: `app/plan/[boardId]/page.tsx`
**What to do**:
- Add a per-day "Notes" expandable field (text area, stored in the Trip object in IndexedDB)
- Add a "Share Plan" button that uses the Web Share API (`navigator.share`) to share the plan as plain text (day-by-day summary)
- Graceful fallback: if Web Share not available, copy to clipboard with a toast confirmation

### F6 — Capacitor iOS Build Improvements
**Status**: `[ ]` Not started
**Why**: The iOS build workflow has friction. `capacitor.config.ts` and the iOS project need production polish for App Store submission.
**Files**: `ios/App/capacitor.config.ts`, `ios/App/App/Info.plist`
**What to do**:
- Verify `capacitor.config.ts` has correct `appId: 'com.soaringwillow.travelpanel'` and `appName: 'TravelPanel'`
- Add NSLocationWhenInUseUsageDescription to Info.plist (required for GPS mode)
- Add NSLocationAlwaysAndWhenInUseUsageDescription to Info.plist
- Update `capacitor.config.ts` to set `backgroundColor: '#6366f1'` for splash screen
- Document the production build steps in `ios/App/RELEASE.md`

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
