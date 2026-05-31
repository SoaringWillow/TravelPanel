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
**Delivered**: `browser-extension/` — MV3 extension with popup UI, context menus (right-click clip), configurable TravelPanel URL, PNG icon generator, Safari-compatible manifest

### B3 — Xiaohongshu Fix (Claude Vision)
**Status**: `[x]` Done  
**What to do**: Accept image payload from iOS Share Sheet, use Claude Vision to extract metadata + substance  
**Delivered**: ShareViewController extracts preview image → compressed JPEG saved to App Group → CapacitorBridge reads into sessionStorage → share page passes imageBase64 to enrichItem → /api/import uses Claude Vision (generateObject with image message part)

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Not started  
**Needs**: Supabase pgvector (from B1)  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page  
**Delivered**: `app/settings/page.tsx` — new Settings tab in NavBar; data summary card; "Download backup (JSON)" exports all items/boards/trips; danger-zone clear-all; `getAllTrips()` added to db.ts

---

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[x]` Done  
**Files to change**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Add user location dot to the map using the browser Geolocation API + MapLibre `GeolocateControl`
- Add a "Locate me" FAB that flies the map to the user's current position
- Implement a "Nearby" chip/filter on the home page: shows only clips within 10km of current position, with distance label on each pin ("1.2km")
- Distance calculation: Haversine formula, client-side
- Graceful degradation: if geolocation denied, hide the locate button with a toast ("Location permission denied")

### C2 — Post-Trip Timeline
**Status**: `[x]` Done  
**Files**: new `app/timeline/[boardId]/page.tsx`, `lib/types.ts`, `lib/db.ts`  
**What to do**:
- Add "Check in" action on location detail cards — records `checkedInAt: number` on a SavedItem
- New timeline page per board: vertical timeline of checked-in places sorted by `checkedInAt`
- Each entry shows thumbnail, title, distance from previous stop, time gap
- Link from board detail page: "View trip timeline"
- Empty state: "Start checking in to places as you visit them"

### C3 — Shared Boards v1
**Status**: `[ ]` Not started  
**Needs**: Supabase (B1 keys) — blocked until B1 is activated  
**What to do**: Generate a read-only share link for a board (UUID-keyed public URL), allow recipients to view and clone the board into their own collection

### C4 — Proactive Resurfacing
**Status**: `[x]` Done  
**Files**: `components/NearbyAlert.tsx`, `app/page.tsx`  
**What to do**:
- On map view, periodically check if the user is within 500m of any saved clip that they haven't visited (no `checkedInAt`)
- Show a subtle bottom toast: "You're near [Place name] — your saved clip from [source]"
- Tap opens the detail card
- Requires C1 geolocation to be active; no-ops if location is unavailable
- Debounce: max one alert per 5 minutes per place

---

## PHASE D — iOS Polish & Production Readiness

### D1 — Haptic Feedback
**Status**: `[x]` Done  
**Files**: new `lib/haptics.ts`, `package.json`, `components/LocationDetailCard.tsx`, `app/share/page.tsx`, `components/ImportSheet.tsx`  
**What to do**:
- Add `@capacitor/haptics` to package.json dependencies
- Create `lib/haptics.ts`: thin wrapper with `taptic(style)` — tries `@capacitor/haptics`, falls back to `navigator.vibrate()`
- Trigger `light` impact on: pin tap, board selection
- Trigger `medium` impact on: item saved, check-in confirmed
- Trigger `success` notification on: enrichment complete, plan generated
- Graceful no-op on web/desktop

### D2 — Skeleton Loading States
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, new `components/SkeletonCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create `SkeletonCard` component: animated shimmer card matching InboxCard dimensions
- In inbox and boards pages, show 4–6 SkeletonCards while `loading === true`
- Replace spinner with skeleton in board detail page
- Use `bg-gray-200 animate-pulse rounded` pattern with Tailwind

### D3 — Pull-to-Refresh
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add pull-to-refresh gesture on iOS using `@capacitor/haptics` + touch events
- On pull: trigger re-enrichment for pending items, refresh board/item lists
- Show a subtle spinner at top during refresh

### D4 — Item Editing
**Status**: `[x]` Done  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add an "Edit" button to the detail card (pencil icon in header)
- Editable fields: title (text input), notes (textarea), tags (chip selector)
- Save button: calls `updateItemFields(id, { title, notes, tags })` in db.ts
- Autosave on blur for notes field
- Optimistic update in useSavedItems

### D5 — Inbox Filters & Sort
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `components/SearchBar.tsx`  
**What to do**:
- Add filter chips below search bar: All · Unassigned · Enriched · Failed · [platform chips]
- Add sort selector: Newest · Oldest · Most substance · Closest (if location active)
- Persist selected filter in sessionStorage
- "Failed" filter shows items with `enrichmentStatus === 'failed'` with retry button

### D6 — App Icon & Launch Screen
**Status**: `[x]` Done  
**Files**: `public/`, `ios/App/App/Assets.xcassets/`, `app/layout.tsx`  
**What to do**:
- Generate all required iOS app icon sizes from the indigo pin design (use generate-icons.js as base)
- Update `public/manifest.json` with proper icon paths
- Add Apple touch icon meta tags in layout.tsx
- Create proper launch screen storyboard in Xcode (replace default)
- Document in ios/App/XCODE_SETUP.md

### D7 — Offline Indicator
**Status**: `[x]` Done  
**Files**: new `components/OfflineIndicator.tsx`, `app/layout.tsx`  
**What to do**:
- Listen to `navigator.onLine` events
- Show a subtle banner: "You're offline — clips save locally, enrichment paused"
- Banner dismisses automatically when connection returns
- Prevent import attempts when offline (show helpful message instead)

---

## PHASE E — iOS Polish & Production Readiness (Sprint 3)

### E1 — Safe Area + Bottom Spacing Polish
**Status**: `[x]` Done
**Why**: On iPhone with notch/Dynamic Island and home indicator, content sits behind the nav bar and status bar. This makes the app feel unfinished.
**Files to change**: `app/globals.css`, `components/NavBar.tsx`, `app/layout.tsx`, all page files with bottom-padded scroll areas
**What to do**:
- Add `pb-[env(safe-area-inset-bottom)]` and `pt-[env(safe-area-inset-top)]` CSS utilities to `globals.css`
- Update NavBar to use `pb-[env(safe-area-inset-bottom)]` so it extends behind the home indicator
- Update all pages that have `pb-24` to use `pb-[calc(6rem+env(safe-area-inset-bottom))]` or a utility class
- Add `pt-[env(safe-area-inset-top)]` to page headers that currently use `pt-12` (should be `pt-12 + safe-area-top`)
- Use `viewport-fit=cover` (already set) + CSS env() variables

### E2 — Keyboard-Aware Input Handling
**Status**: `[x]` Done
**Why**: On iOS, the software keyboard covers form inputs in the import sheet and search bar. Users can't see what they're typing.
**Files to change**: `components/ImportSheet.tsx`, `app/inbox/page.tsx`, `app/share/page.tsx`
**What to do**:
- In ImportSheet: scroll the input into view on focus via `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Add `inputmode="url"` to URL input fields for the correct iOS keyboard
- Add `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck={false}` to URL inputs
- In search bar: add `inputmode="search"` and `enterKeyHint="search"` to trigger the search keyboard on iOS
- In share page textarea/input: add `inputmode="text"` and ensure the form scrolls to keep the focused field visible

### E3 — Onboarding Tutorial Overlay
**Status**: `[x]` Done
**Why**: New users land on a blank map with no context. The seed data helps but there's no guidance on the app's core gesture (long-press a pin, tap to detail card, check in).
**Files**: new `components/OnboardingTour.tsx`, `app/page.tsx`
**What to do**:
- Create `OnboardingTour` component that shows 3 tooltip-style step cards:
  1. "Clip a link — tap + to save travel inspiration" (points to FAB)
  2. "Tap any pin to see tips and wisdom from the post" (points to map)
  3. "Build a board — organize clips into trips" (points to boards tab in NavBar)
- Show only on first visit (flag: `localStorage.getItem('hasSeenTour')`)
- Each step has a "Next" button; last step has "Got it" that sets the flag
- Overlay uses a semi-transparent backdrop with a spotlight cutout around the pointed element
- Skip button on step 1

### E4 — Clip Source URL Preview
**Status**: `[x]` Done
**Why**: When users tap a clip, they can't navigate back to the original post. The URL is stored but never shown.
**Files to change**: `components/LocationDetailCard.tsx`
**What to do**:
- Add an "Open source" link at the bottom of the detail card (below check-in button)
- Show the platform icon + domain name (e.g. "📱 xiaohongshu.com")
- Tap opens `window.open(item.url, '_blank')`
- Only show if `item.url` is a valid http/https URL
- Style: subtle gray border button, external link icon (ExternalLink from lucide-react)

### E5 — Board Cover Thumbnails
**Status**: `[x]` Done
**Why**: Board cards show an emoji + name but no visual preview of what's inside. A photo grid or cover photo makes boards feel alive.
**Files to change**: `components/BoardCard.tsx`, `lib/db.ts`
**What to do**:
- Show up to 4 item thumbnails in a 2×2 grid as the board card background (if thumbnails available)
- If < 4 thumbnails: fill remaining slots with the board emoji on indigo
- `coverThumbnail` is already stored on Board — use it as the primary large thumbnail
- Use CSS `object-cover` to fill the grid cells
- Overlay the board name + emoji in a gradient footer at the bottom of the card

### E6 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done
**Why**: Deleting a clip requires tapping the card to open a menu. Mobile-native UX expects swipe-left-to-delete.
**Files to change**: `components/InboxCard.tsx`
**What to do**:
- Add swipe-left gesture: track `touchstart`/`touchmove`/`touchend`, translate card left
- Reveal a red delete zone behind the card when swiped >60px
- Swipe >50% of card width: snap to delete (with haptic + `onDelete` callback)
- Partial swipe: snap back to original position
- Show a trash icon in the revealed zone
- Works alongside existing tap-to-open behavior

### E7 — Plan View Substance Citations
**Status**: `[x]` Done — already implemented in A12 (sourcedTips type, API route, and plan view rendering are all wired)
**Why**: A12 threaded substance into plans but the UI rendering of `sourcedTips` may not be showing the "from your clip: X" attribution visually.
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx` (if it exists)
**What to do**:
- Find where activities are rendered in the plan view
- If `activity.sourcedTips` exists and has items, render each with a subtle "📎 from: [sourceTitle]" attribution badge
- Style: small amber/gold chip, italic source title, tucked below the activity description
- Test with the seed board data that has substance items

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
