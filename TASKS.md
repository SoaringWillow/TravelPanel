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
**Status**: `[x]` Done (local-first; cross-device requires cloud sync activation)
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
**Status**: `[x]` Done
**Why**: The iOS build workflow has friction. `capacitor.config.ts` and the iOS project need production polish for App Store submission.
**Files**: `ios/App/capacitor.config.ts`, `ios/App/App/Info.plist`
**What to do**:
- Verify `capacitor.config.ts` has correct `appId: 'com.soaringwillow.travelpanel'` and `appName: 'TravelPanel'`
- Add NSLocationWhenInUseUsageDescription to Info.plist (required for GPS mode)
- Add NSLocationAlwaysAndWhenInUseUsageDescription to Info.plist
- Update `capacitor.config.ts` to set `backgroundColor: '#6366f1'` for splash screen
- Document the production build steps in `ios/App/RELEASE.md`

---

## PHASE G — Intelligence & Delight

> App is feature-complete and iOS-ready. This phase adds AI superpowers,
> power-user workflow features, and subtle delightful touches that separate
> TravelPanel from competitors.

### G1 — Smart Clip Title Cleanup
**Status**: `[x]` Done
**Why**: Claude often extracts noisy titles like "Watch this video!" or "你一定不知道的10个旅行技巧" that don't tell the user where the clip is about. A cleanup pass would produce concise English destination-first titles.
**Files**: `app/api/import/route.ts`
**What to do**:
- Add a `cleanTitle` post-processing step in the import route: if the extracted title is >60 chars, starts with a non-destination word, or is in a non-English language, run a secondary Haiku call to produce a concise English title (e.g. "Nishiki Market, Kyoto — street food guide")
- Keep the original as `originalTitle` in the ImportResult (not stored in DB, just used for logging)
- Test case: Xiaohongshu title "去日本一定要打卡的50个地方！" should become "50 Must-Visit Places in Japan"

### G2 — Location Deduplication on Board
**Status**: `[x]` Done
**Why**: When multiple clips reference the same restaurant/temple/beach, the map shows duplicate overlapping pins. The trip planner also generates duplicate activities.
**Files**: `components/MapView.tsx`, `app/api/plan/route.ts`
**What to do**:
- In MapView, merge pins that are within 50m of each other: show the pin once with a count badge (e.g. "3 clips")
- On click, show a mini-list of the clips that mention this location
- In the plan route, deduplicate locations in `contentSummary` before sending to Claude

### G3 — Clip Cover Photo from Share Extension
**Status**: `[x]` Done
**Why**: iOS clips have no thumbnail for scraping-resistant platforms. The Share Extension receives the screenshot from iOS (the preview image), but currently only passes it to Claude for text extraction and discards it.
**Files**: `ios/App/ShareExtension/ShareViewController.swift`, `app/share/page.tsx`, `lib/db.ts`
**What to do**:
- In the Share Extension, after saving `pendingShareImage` for Claude Vision, also save a 200×200px thumbnail version as `pendingShareThumbnail`
- In `app/share/page.tsx`, read `pendingShareThumbnail` via Capacitor Preferences and save it as the item's `thumbnail` field (base64 data URL)
- This gives Xiaohongshu and WeChat clips a cover photo sourced from the iOS screenshot

### G4 — Weekly Inspiration Digest
**Status**: `[x]` Done
**Why**: Users forget about clips they saved weeks ago. A weekly "This week in your collection" reminder keeps the app top-of-mind.
**Files**: new `app/digest/page.tsx`, `lib/db.ts`
**What to do**:
- Create `/digest` page: shows 5 random clips the user saved more than 2 weeks ago ("Remember this? You saved it X weeks ago")
- Each clip shows thumbnail + title + first location + substance tip count
- "Plan a trip" CTA links to the board or creates a new one
- Add a "Digest" deep link from the home screen (PWA shortcut in manifest.json)

### G5 — Map Search + Location Jump
**Status**: `[x]` Done
**Why**: When a user wants to find their clips in a specific city, they have to manually pan. A "Jump to city" search would fix this.
**Files**: `app/page.tsx`, `components/MapView.tsx`
**What to do**:
- Add a location search bar to the map top bar (shows when the user taps a search icon)
- Use the free Nominatim API (OpenStreetMap geocoding) to resolve city/place names to coordinates
- On select, flyTo those coordinates at zoom 12
- Debounced (400ms), show up to 5 suggestions with country name disambiguation

### G6 — Haptic Feedback on Key Interactions
**Status**: `[x]` Done
**Why**: Current haptics are limited to clip save. More haptic moments make the app feel premium on iPhone.
**Files**: `lib/haptics.ts`, multiple components
**What to do**:
- Add `hapticLight()` on: board card tap, pin tap on map, tag toggle in edit mode, swipe-to-delete snap point
- Add `hapticMedium()` on: swipe-to-delete confirmation, plan generated, batch import complete
- Add `hapticError()` pattern (double short buzz) on: enrichment failure, copy/share fail
- New `hapticError()` in `lib/haptics.ts`: `navigator.vibrate([30, 50, 30])`

---

## PHASE H — App Store Quality & Final Polish

> All planned features are implemented. Phase H makes the app App Store-ready:
> crash-proof, accessible, fast, and delightful on iPhone. Goal: pass App Store
> review on the first submission and achieve ≥4.5 star rating from day one.
>
> Recommended order: `H1 → H2 → H3 → H4 → H5 → H6 → H7 → H8 → H9 → H10`

### H1 — Rate Limit User Feedback
**Status**: `[x]` Done
**Why**: When the enrichment or plan rate limit is hit, the user sees nothing — clips silently fail to enrich. This is a confusing UX gap identified in the audit.
**Files**: `lib/enrichItem.ts`, `app/share/page.tsx`, `lib/rateLimits.ts`
**What to do**:
- Expose rate limit status from `checkEnrichmentLimit()` to the share page
- In `app/share/page.tsx`, detect when enrichment is rate-limited and show a banner: "You've reached today's clip limit (10/hr). Your clip is saved and will be analysed in X minutes."
- Show when the limit resets (time remaining in human-readable format: "resets in 45 min")
- Same for plan generation limit: surface in `app/plan/[boardId]/page.tsx`
- Soft-block: clip is always saved; only enrichment is deferred

### H2 — React Error Boundary
**Status**: `[x]` Done
**Why**: Any unhandled JS error currently crashes the entire app with a white screen. This guarantees a 1-star review if it happens to a user.
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`
**What to do**:
- Create `ErrorBoundary` class component that renders a friendly recovery screen: emoji, "Something went wrong", "Reload TravelPanel" button that calls `window.location.reload()`
- Wrap the entire app tree in layout.tsx with `<ErrorBoundary>`
- Also wrap individual high-risk subtrees: `MapView` (WebGL crashes), `plan/[boardId]` (streaming errors)
- In dev mode, re-throw to preserve React dev overlay

### H3 — In-App Review Prompt
**Status**: `[x]` Done (custom modal — no native plugin needed)
**Why**: App Store ranking is directly correlated with review volume. Prompting users at the right moment (after their 5th saved clip, when they're happy) converts satisfied users into reviews.
**Files**: new `lib/reviewPrompt.ts`, `app/share/page.tsx`
**What to do**:
- Install `@capacitor-community/app-review` (or use the Capacitor API directly if available)
- Track clip save count in localStorage
- After the 5th clip saved AND `stage === 'done'`, wait 1.5s then show the native review prompt
- Gate: only prompt once (use `localStorage` flag `tp_review_prompted`); never in web/browser context (check Capacitor platform)
- Don't prompt if the user just hit a rate limit error

### H4 — Board Cover Photo from Clip Thumbnails
**Status**: `[x]` Done
**Why**: The boards list shows emoji icons only. Using the newest clip's thumbnail as a board cover photo makes the board list visually rich and more scannable.
**Files**: `app/boards/page.tsx`, `components/BoardCard.tsx` (if exists), `lib/db.ts`
**What to do**:
- In the boards list, for each board, find the most recently saved clip with a thumbnail
- Show it as a background image in the board card (blurred, with the emoji overlaid in the centre)
- If no thumbnails exist for the board, fall back to the solid gradient background (current behaviour)
- No DB changes needed — derive at render time from the items already loaded

### H5 — Quick Notes in Import/Share Flow
**Status**: `[x]` Done
**Why**: When clipping a URL, users often want to add a quick personal note ("great for anniversary trip", "friend recommended") before saving. Currently, notes can only be added via the full edit mode in the detail card.
**Files**: `app/share/page.tsx`, `lib/db.ts`
**What to do**:
- Add an optional `<textarea>` labelled "Quick note (optional)" below the board picker in the share page
- Max 280 chars, subtle placeholder: "Why are you saving this? (optional)"
- If filled, set `item.notes` before calling `saveItem()`
- Keep it fully optional — empty notes don't affect the save flow
- `SavedItem.notes` field already exists in the type

### H6 — Clip Detail Inline Map
**Status**: `[x]` Done
**Why**: The LocationDetailCard shows extracted locations as a text list, but users can't see WHERE they are spatially without going back to the full map. An inline mini-map in the detail card creates the "wow" moment.
**Files**: `components/LocationDetailCard.tsx`
**What to do**:
- In the detail card, if `item.locations.length > 0`, show a small map (height: 140px) below the title section
- Use the existing `MapView` component (dynamically imported, SSR disabled)
- Pre-fly to `item.locations[0]` at zoom 12; pan to reveal all locations if there are several
- Tapping the mini-map navigates to the home map page with `?flyTo=lat,lng&itemId=id` query params (already supported in page.tsx)
- Keep map read-only: no pin interaction beyond the tap-through

### H7 — Travel Date Context in Trip Planner
**Status**: `[x]` Done
**Why**: The current planner prompt has no knowledge of *when* the user wants to travel. "Cherry blossom season", "avoid typhoon season", and "Golden Week crowds" are date-dependent. Adding a date picker surfaces dramatically better plans.
**Files**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`
**What to do**:
- Add a "When are you travelling?" date picker (month + year, not exact dates) above the Generate button
- Pass `travelMonth` (e.g. "March 2027") to the plan API as part of the request body
- Include in the system prompt: "The user plans to travel in {travelMonth}. Factor in seasonal considerations: weather, festivals, crowds, and availability."
- Store the selected month in sessionStorage per board
- Optional, not required — if skipped, planner works exactly as before

### H8 — Accessibility Improvements
**Status**: `[x]` Done
**Why**: App Store review team checks for basic accessibility. VoiceOver support is required for App Store compliance on iOS.
**Files**: Multiple components
**What to do**:
- Audit all interactive elements for missing `aria-label` attributes: buttons without text, icon-only buttons, toggle controls
- Add `role="list"` and `role="listitem"` to all clip grid/list containers
- Ensure all images have meaningful `alt` text (or `alt=""` for decorative images)
- Verify that the map's NavigationControl has aria labels
- Add `aria-live="polite"` to dynamic status areas (enrichment loading, plan generation status)
- Test with iOS VoiceOver: navigate through the share flow, inbox, and board detail

### H9 — Inbox Multi-Select (Batch Operations)
**Status**: `[x]` Done
**Why**: Power users with 50+ clips need to bulk-manage clips: move 10 clips to a board at once, or delete a batch of irrelevant clips. One-at-a-time is painfully slow.
**Files**: `app/inbox/page.tsx`, `lib/db.ts`
**What to do**:
- Long-press (or a "Select" button in the header) enters multi-select mode
- Each card shows a checkbox indicator; tapped cards join the selection set
- Bottom action bar appears with: "Move to board" (opens board picker) and "Delete X clips" (confirmation required)
- Exit multi-select: tap "Cancel" or finish the action
- Selection state in component `useState<Set<string>>`
- Don't virtualize during multi-select (or preserve virtualizer with checkbox overlay)

### H10 — App Store Submission Checklist
**Status**: `[x]` Done
**Why**: App Store submission requires specific assets and configurations that are easy to miss. A tracked checklist prevents rejection.
**Files**: new `ios/App/APP_STORE_CHECKLIST.md`
**What to do**:
- Create a detailed checklist covering: app icons (all sizes), launch screen, required capabilities (Location When In Use), privacy manifests (required by Apple for API usage), App Privacy labels, age rating, screenshots (6.7", 6.1", 5.5", 12.9" iPad), App Store description (4000 chars max), subtitle (30 chars max), keywords (100 chars total)
- Include the exact Xcode settings needed: signing team, bundle ID, version + build number
- Note which items are already done vs still needed
- Include `NSPrivacyAccessedAPITypes` entries for UserDefaults access (required by Apple since iOS 17)

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
