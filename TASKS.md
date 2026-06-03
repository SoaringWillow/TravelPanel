# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-03)

**Phase A & B are complete** (except B4 which needs Supabase keys). **Phase D is the active sprint.**

Phase D priority order: `D2 → D4 → D5 → D1 → D6 → D3 → D7 → D8`

- D2 (swipe-to-delete) and D4 (notes) are the most-missed core interactions
- D5 (tag filter) unlocks the map at scale
- D1 (haptics) and D6 (photo clip) are iOS-native differentiators
- D3 (dark mode) and D7 (onboarding) are polish
- D8 (pull-to-refresh) is a finishing touch

Phase E tasks are future work, mostly gated on Supabase (B1).

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

---

## PHASE D — iOS Polish & Delight (Current Sprint — revised 2026-06-03)

> Goal: A beautiful, native-feeling iOS app. These tasks close the gap between "web app in a shell" and "app that feels built for iPhone."
>
> **Recommended order:** `D2 → D4 → D5 → D1 → D6 → D3 → D7 → D8`

### D1 — Haptic Feedback on Key Interactions
**Status**: `[x]` Done  
**Why**: iOS users expect physical feedback. Silent saves feel broken.  
**Files**: `app/share/page.tsx`, `components/ImportSheet.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `haptic(style: 'light'|'medium'|'heavy'|'success'|'error')` that calls `Capacitor` `Haptics` plugin — no-op if not in native context
- Fire `haptic('success')` when a clip is saved (after `setStage('done')`)
- Fire `haptic('light')` when a board chip is tapped in the share flow
- Fire `haptic('medium')` when plan generation starts
- Fire `haptic('success')` when a plan is generated successfully

### D2 — Swipe-to-Delete Clips with Undo Toast
**Status**: `[x]` Done  
**Why**: Deleting a clip currently has no gesture. Mobile-first apps need swipe-to-delete.  
**Files**: `app/inbox/page.tsx`, `components/InboxCard.tsx`, possibly new `components/SwipeableRow.tsx`  
**What to do**:
- Wrap each `InboxCard` in a `SwipeableRow` component that reveals a red delete button on swipe-left
- On delete: immediately remove from view, show a "Undo" toast for 4 seconds (bottom snackbar)
- If undo is not tapped within 4s, call `deleteItem()` from db.ts
- If undo IS tapped, re-insert the item at the original position
- Use `framer-motion` drag gestures (`x` motion value with a threshold of -80px)
- Works with both mouse (desktop) and touch (iOS)

### D3 — Dark Mode Support
**Status**: `[x]` Done  
**Why**: iOS dark mode is expected by users. The app is all white backgrounds — jarring at night.  
**Files**: `app/globals.css`, `tailwind.config.js`, key components  
**What to do**:
- Enable Tailwind `darkMode: 'class'` (already set or set it)
- Add `dark:` variants to all major components: bg-white → bg-gray-900, text-gray-900 → dark:text-white, etc.
- Add a `ThemeToggle` component in the settings page (`app/settings/page.tsx`) that sets `dark` class on `<html>` and persists in localStorage
- On iOS, auto-detect system preference via `prefers-color-scheme` media query on first launch
- MapLibre: use a dark basemap style when in dark mode (OpenFreeMap has a dark variant)

### D4 — Personal Notes on Clips
**Status**: `[x]` Done  
**Why**: Users want to annotate clips with their own context. "I was recommended this by Mei."  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`, `lib/types.ts`  
**What to do**:
- `SavedItem.notes` already exists in the type — it just needs a UI to edit it
- Add an editable notes section to `LocationDetailCard`: tapping shows a multiline textarea
- Auto-save on blur (debounced 500ms) by calling `updateItemNote(id, notes)` in db.ts
- Show a subtle "📝 Note" chip on `InboxCard` if `notes` is non-empty
- Notes survive export/import via the existing backup system (already in the schema)

### D5 — Tag/Category Filtering
**Status**: `[x]` Done  
**Why**: Users with 50+ clips need to filter by type. "Show me only food spots in Tokyo."  
**Files**: `app/inbox/page.tsx`, `app/page.tsx` (map view), `components/NavBar.tsx`  
**What to do**:
- Create `components/TagFilterBar.tsx`: a horizontally-scrollable row of tag chips (food, nature, culture, adventure, beach, mountain, city, etc.)
- Show this below the search bar in `/inbox` view
- Active tags filter the clip list (AND logic if multiple selected, OR is more user-friendly — use OR)
- On the map view, active tag filters hide pins that don't match
- Persist selected filters in `sessionStorage` so they survive navigation
- "All" chip always present and clears other filters

### D6 — Photo Clip Flow (Camera Roll → Claude Vision)
**Status**: `[x]` Done  
**Why**: Users screenshot travel posts. They want to clip screenshots directly, not just URLs.  
**Files**: `app/share/page.tsx`, `app/page.tsx`, `lib/enrichItem.ts`, `app/api/import/route.ts`  
**What to do**:
- Add a "Clip a screenshot" button to the main import sheet (`components/ImportSheet.tsx`)
- Uses `<input type="file" accept="image/*" capture="environment">` for camera/library access
- On image select: create a `SavedItem` with `url: 'local-photo'`, `platform: 'other'`, and pass the base64 image to `enrichItem()` as the image payload
- The existing B3 vision path in `/api/import` handles the extraction — it already accepts `imageData`
- In the share UI, show a thumbnail preview of the selected image in the page preview card
- After enrichment, the clip appears normally in the inbox with any extracted locations + substance

### D7 — Animated First-Launch Onboarding
**Status**: `[x]` Done  
**Why**: New users see a blank map and don't know what to do. Retention cliff at first launch.  
**Files**: new `components/OnboardingOverlay.tsx`, `app/page.tsx`  
**What to do**:
- Create a 3-step onboarding overlay that fires only on first launch (gate: `localStorage.getItem('onboarded')`)
- Step 1: "✈️ TravelPanel — Save travel inspiration from anywhere" (full-screen with animated map pin drop)
- Step 2: "📌 Clip posts from Instagram, YouTube, 小红书 via iOS Share Sheet or the browser extension"
- Step 3: "🗺 Generate AI trip plans from your saved clips, with cited tips from the posts you saved"
- Each step has a "Next →" button; last step has "Start exploring →" which sets `onboarded` flag
- The existing seed boards (A8) are pre-loaded in step 3 to show a rich demo of the substance layer
- Skip link always visible

### D8 — Pull-to-Refresh in Clip Lists
**Status**: `[x]` Done  
**Why**: On iOS, pull-to-refresh is muscle memory. The inbox feels stale without it.  
**Files**: `app/inbox/page.tsx`, `hooks/useSavedItems.ts`  
**What to do**:
- Add a `usePullToRefresh(onRefresh, containerRef)` hook in `hooks/usePullToRefresh.ts`
- Uses touch events to detect downward drag beyond 60px when already scrolled to top
- Shows an animated spinner (framer-motion rotate loop) during refresh
- On release: calls `onRefresh()` which re-reads all items from IndexedDB
- Also re-triggers any `pending` enrichment items (calls the retry queue)
- Snap back with spring animation on release

---

## PHASE E — Advanced Features (Future Sprint)

### E1 — AI Smart Collections
**Status**: `[x]` Done  
**Why**: Users with 100+ clips want automatic grouping. "All my Tokyo clips" shouldn't require manual board management.  
**Files**: new `app/api/cluster/route.ts`, `app/boards/page.tsx`  
**What to do**:
- Create `/api/cluster` endpoint that takes all item titles/descriptions/tags and uses Claude to suggest 3–5 collection themes
- Each suggested collection has a name, emoji, and list of item IDs
- Show "Suggested collections" section at the top of `/boards` view
- User can tap to create the board with one tap (pre-populated with the suggested items)
- Only runs when user has 20+ clips and no smart collections created yet

### E2 — Share Clip as Image Card
**Status**: `[x]` Done  
**Why**: Users want to share clips with friends ("You should visit this!"). Plain URL shares don't show the substance layer.  
**Files**: new `app/card/[itemId]/page.tsx`, new API route  
**What to do**:
- Create `/card/[itemId]` — a server-rendered OG-image-style page showing the clip's key info
- Use `next/og` (ImageResponse) to generate a branded image card: clip title, top 2 substance items, location count, TravelPanel branding
- Add "Share" button to `LocationDetailCard` that copies the URL or triggers native iOS share sheet
- The shared URL opens the card page which deep-links into the app

### E3 — Trip Itinerary Sharing
**Status**: `[x]` Done  
**Needs**: Server-side storage (Supabase B1) or serialization into URL  
**What to do**:
- Export a trip as a shareable link that renders a read-only itinerary view
- If Supabase available: store trip as public record, share `/trip/[shareId]`
- If not: serialize trip JSON into a compressed URL-safe base64 string, share `/trip/view?d=...`

### E4 — Nearby Discovery
**Status**: `[x]` Done  
**Why**: Users want to discover what else is near a saved location.  
**Files**: new `app/api/nearby/route.ts`, `components/LocationDetailCard.tsx`  
**What to do**:
- When viewing a clip's location detail, show a "Nearby" section
- Calls a new `/api/nearby?lat=&lng=&radius=500` endpoint
- Uses Overpass API (free, no key) to fetch nearby POIs (restaurants, attractions, transport)
- Shows 3–5 nearby places in a horizontal scroll row beneath the location card

### E5 — Collaborative Boards
**Status**: `[ ]` Not started  
**Needs**: Supabase B1 (cloud sync + auth)  
**What to do**:
- Share a board with friends via invite link
- Invitees can add clips to the shared board
- Changes sync in real-time via Supabase realtime subscriptions
- Plan can be generated from a collaborative board

---

---

## PHASE F — iOS Production Readiness (Current Sprint — 2026-06-03)

> Goal: Close the gap between "working web app in a Capacitor shell" and "beautiful, App Store-ready iOS app that feels native." All tasks are implementable without Supabase.
>
> **Recommended order:** `F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10`

### F1 — Clip Editing (Edit Title, Tags, Description)
**Status**: `[x]` Done  
**Why**: Users clip fast and often want to fix a wrong title or add missing tags afterward. There's no edit flow today — you'd have to delete and re-clip.  
**Files**: new `components/EditClipModal.tsx`, `components/InboxCard.tsx`, `lib/db.ts`  
**What to do**:
- Add `updateItem(id, patch)` to `lib/db.ts` that partial-updates a SavedItem in IndexedDB
- Create `EditClipModal.tsx` — slide-up sheet with fields for title, description, and tags (comma-separated input)
- Add an "Edit" button to the done-state `InboxCard` footer (pencil icon, next to Delete)
- On save: call `updateItem`, refresh the item in `useSavedItems` state
- Haptic feedback on save (use `haptic('success')`)

### F2 — Map Empty State & First-Clip Hint
**Status**: `[x]` Done  
**Why**: New users who dismissed onboarding see a blank map with no guidance. Retention cliff.  
**Files**: `app/page.tsx`, new `components/MapEmptyHint.tsx`  
**What to do**:
- Show a floating hint card over the map when `items.length === 0 && !loading`
- Card: illustration (✈️ + map pin), "No clips yet", sub-text "Tap + or share a URL from any app", subtle pulsing animation on the FAB
- Dismiss automatically the moment the first clip is saved (animate card out)
- Don't show if user has previously had clips (gate on `items.length === 0 AND never-had-clips localStorage key`)

### F3 — Network Error States & Offline Banner
**Status**: `[ ]` Not started  
**Why**: On iOS, network drops frequently. Silent failures erode trust.  
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx`, `components/ImportSheet.tsx`  
**What to do**:
- Add `OfflineBanner` that listens to `navigator.onLine` + `online`/`offline` events
- Renders a slim red/amber pill at the top when offline: "No internet — clips saved locally"
- Animate in/out with spring slide from top
- In `ImportSheet`, when fetch fails due to network, show inline error with "Try again when online"
- In `useSavedItems`, handle errors gracefully (no crash, show error toast)

### F4 — Long-Press Quick Actions on Map Pins
**Status**: `[ ]` Not started  
**Why**: Tapping a pin opens the detail card. But users want a quicker way to navigate to source, share, or fly-to on plan — without opening the full card.  
**Files**: `components/MapView.tsx`  
**What to do**:
- On long-press a map pin (touchstart + timeout 500ms), show a popover near the pin with 3 actions: "Open Source", "Share Clip", "Details"
- Popover: white card with shadow, arrow pointing to pin, 3 icon+label rows
- "Open Source" opens `item.url` in new tab / system browser
- "Share Clip" triggers native share or copies `/card/[id]` URL
- "Details" triggers the existing `onPinClick(item)` handler
- Dismiss on map tap elsewhere

### F5 — Swipe-Between-Days in Trip Plan
**Status**: `[ ]` Not started  
**Why**: The day strip is a horizontal scroll but swiping left/right on the activity list doesn't advance the day. On mobile, this feels broken.  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Wrap the active-day activities section in a `motion.div` with `drag="x"` and `dragConstraints={{ left: 0, right: 0 }}`
- On `onDragEnd`: if swipe velocity > 200 or drag distance > 80px left/right, advance/retreat `activeDayIndex`
- Animate the incoming day card in from the correct direction (left slide for next day, right slide for previous)
- Sync with the day strip dots (the horizontal scroll should auto-scroll to keep active day visible)

### F6 — Clip Source Attribution in Detail Card
**Status**: `[ ]` Not started  
**Why**: When a clip was generated from a screenshot (Vision extraction) or from a browser extension (not the Share Sheet), the source URL `local:photo:...` or raw URL is ugly and not clickable.  
**Files**: `components/LocationDetailCard.tsx`, `lib/parse-url.ts`  
**What to do**:
- In `LocationDetailCard`, show a formatted "Source" row at the bottom of the card
- If URL starts with `local:photo:` — show "📷 Clipped from screenshot"
- If URL is a valid http/https URL — show platform label + truncated URL as a tappable link
- Add a "View original" deep-link button that uses `window.open(url, '_system')` (Capacitor convention for opening in Safari)
- Hide the row entirely if no meaningful source can be shown

### F7 — Board Cover Photos from Clip Thumbnails
**Status**: `[ ]` Not started  
**Why**: Boards currently show only emoji + name. Adding a cover photo from the first clip thumbnail makes the boards grid feel rich and visual.  
**Files**: `components/BoardCard.tsx`, `hooks/useBoards.ts`  
**What to do**:
- In `BoardCard`, accept an optional `coverUrl?: string` prop
- If `coverUrl` present: render it as the card background with a dark gradient overlay at the bottom
- Board name and emoji rendered over the gradient
- In `boards/page.tsx`: compute `coverUrl` for each board by finding the first item in `board.itemIds` that has a thumbnail
- No DB schema change needed — derive at render time from `items` list

### F8 — Inline Enrichment Progress Toasts
**Status**: `[ ]` Not started  
**Why**: After clipping a URL, users return to the inbox and see the card in "loading" state. There's no feedback about what the AI found. The first "wow" moment happens silently.  
**Files**: `hooks/useEnrichmentRetry.ts`, new `components/EnrichmentToast.tsx`  
**What to do**:
- When an item transitions from `processing` → `done`, show a brief celebration toast
- Toast content: "✨ Found [N] places + [M] tips in [title]"
- Appears at top of inbox, slides down, auto-dismisses after 3.5s
- Use `useSavedItems`'s `items` diff (previous vs current enrichmentStatus) to detect transitions
- Only show once per item (gate with a Set of shown item IDs in a ref)

### F9 — Keyboard-Aware Import Sheet
**Status**: `[ ]` Not started  
**Why**: On iOS, the keyboard pushes the sheet content but the URL input field can get hidden behind it.  
**Files**: `components/ImportSheet.tsx`  
**What to do**:
- Use the Visual Viewport API (`window.visualViewport`) to detect keyboard height
- When keyboard appears, add bottom padding equal to `window.innerHeight - visualViewport.height`
- Animate the adjustment with a spring transition (framer-motion)
- On keyboard dismiss, remove the padding
- Fall back gracefully on browsers that don't support visualViewport

### F10 — Plan Stats Bar (Distance + Time Estimate)
**Status**: `[ ]` Not started  
**Why**: Users want to know at a glance how ambitious the day is. "Day 2 · 6 stops · ~12km · 4-5h" is the kind of summary that makes a plan feel real.  
**Files**: `components/DayStripCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- In `DayStripCard`, show a small stat row: stop count, estimated distance (sum of haversine between consecutive locations), estimated time (stops × 1.5h average)
- Format: "4 stops · ~8km · ~6h"
- Add haversine distance util to `lib/utils.ts` if not already present
- Show the stats on both the day strip card AND the day header in the detailed view

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
