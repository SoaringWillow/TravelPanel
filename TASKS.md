# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Current State (as of 2026-06-02)

All Phase A (MVP) tasks are complete. Phase B tasks done: B2 (Browser Extension), B3 (Vision/Xiaohongshu), B5 (Data Export). B1 is scaffolded (dormant until Supabase keys). B4 (Vibe Search) is blocked by B1.

**North Star metric**: Weekly clips per active user. Every task should serve capture OR retention.

---

## Recommended Execution Order

`C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → D1 → D2 → E1`

---

## PHASE C — iOS Polish & Native Feel (Current Sprint)

### C1 — Haptic Feedback on Key Actions 🔴 HIGH IMPACT
**Status**: `[x]` Done
**Why**: Haptics are the single cheapest upgrade for native feel. Every iOS app should have them. Without haptics the app feels "web-y" even inside Capacitor.
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/InboxCard.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Install `@capacitor/haptics` (`npm install @capacitor/haptics`)
- Create `lib/haptics.ts` with a `haptic(type)` wrapper that no-ops on web:
  - `impact('medium')` → `HapticsImpactStyle.Medium`
  - `impact('light')` → `HapticsImpactStyle.Light`
  - `impact('heavy')` → `HapticsImpactStyle.Heavy`
  - `notification('success'|'warning'|'error')`
- Add haptics in these moments:
  - `share/page.tsx`: success check → `haptic('notification', 'success')`
  - `share/page.tsx`: board tap / save → `haptic('impact', 'medium')`
  - `InboxCard.tsx`: delete confirm → `haptic('notification', 'warning')`
  - Plan generate button → `haptic('impact', 'heavy')`
  - Plan complete → `haptic('notification', 'success')`

### C2 — User Location on Map ("You Are Here")
**Status**: `[ ]` Not started
**Why**: An iOS travel app without "show me on the map" is crippled. Users want to see where they are relative to their saved spots.
**Files**: `components/MapView.tsx`, possibly new `hooks/useLocation.ts`
**What to do**:
- Create `hooks/useLocation.ts`: wraps `navigator.geolocation.watchPosition`, returns `{lat, lng, accuracy, loading, error}`
- In `MapView.tsx`: add a "locate me" button (crosshair icon, bottom-right of map controls)
- On click: call `map.flyTo({center: [lng, lat], zoom: 14})`
- Render user location as a pulsing blue dot: GeoJSON point source + circle layer (inner white, outer blue pulse via CSS animation)
- Show accuracy radius as a semi-transparent circle
- If permission denied: show a toast "Enable location access in Settings"
- The button should be a floating rounded square matching the map's zoom controls style

### C3 — Swipe to Delete in Inbox
**Status**: `[ ]` Not started
**Why**: Swipe-to-delete is a universal iOS pattern. Long-pressing or finding a delete button in a menu feels un-native for a quick curation action.
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`
**What to do**:
- Wrap `InboxCard` in a swipe gesture using `framer-motion` drag constraints:
  - Drag threshold: if dragged left > 80px, reveal a red delete zone
  - If released at > 120px: trigger `onDelete(id)` with haptic
  - If released at < 80px: snap back with spring animation
- The delete zone should be a red background with a trash icon that reveals behind the card as it slides
- Prevent drag if card is in `pending`/`processing` state
- Add `dragElastic: 0.1` for satisfying resistance feel

### C4 — Pull-to-Refresh on Inbox & Boards
**Status**: `[ ]` Not started
**Why**: iOS standard pattern for list refresh. Users expect it.
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`
**What to do**:
- Implement a pure-CSS/JS pull-to-refresh without external libraries:
  - Listen to `touchstart` / `touchmove` / `touchend` on the scroll container
  - Only trigger if at scroll top AND dragging down
  - Show a spinner/loader when pulled past threshold (60px)
  - On release past threshold: call refresh function + haptic
  - Animate the spinner with `framer-motion` (rotate + fade in/out)
- Inbox: refresh re-runs `getAllItems()` and the enrichment retry queue
- Boards: refresh re-runs `getAllBoards()`

### C5 — Thumbnail Images in Clip Cards
**Status**: `[ ]` Not started
**Why**: Cards without images look bare. The `thumbnail` field is extracted by the API but `InboxCard` only shows a gray placeholder. Showing real images makes the board feel alive.
**Files**: `components/InboxCard.tsx`, `components/BoardCard.tsx`
**What to do**:
- In `InboxCard.tsx`: if `item.thumbnail` is set, render it as the card hero image (top of card, 140px tall, `object-cover`, `rounded-t-2xl`)
- Handle image load errors with `onError` → fall back to the gray skeleton
- Add a 300ms fade-in transition when the image loads (`opacity: 0` → `opacity: 1`)
- For cards in `pending`/`processing` state: keep the animated skeleton (already exists)
- In `BoardCard.tsx`: use `board.coverThumbnail` (already stored) as the board cover image
  - If no thumbnail: show a gradient placeholder using the board emoji as the center element

### C6 — Polished Plan View (Timeline Layout) 🔴 HIGH IMPACT
**Status**: `[ ]` Not started
**Why**: The plan view is functional but not beautiful. The day strip cards are small, and the activity list is plain. An itinerary should feel exciting to look at — it's the payoff of the whole app.
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`, new `components/ActivityCard.tsx`
**What to do**:
- Redesign `DayStripCard` to a taller, more visual card (show day number large, theme as subtitle, stop count, and a row of 3 location name chips)
- Create new `ActivityCard` component for each activity in the day plan:
  - Left column: time + vertical connecting line (like a timeline)
  - Right: location name (bold), duration chip, tips list
  - If `sourcedTips` present: render with a small indigo "from your clip:" tag and clip title
  - Subtle drop shadow, rounded corners, white background
- Replace the current flat list with this timeline layout
- Add a sticky "Day X: Theme" header as you scroll through activities
- Keep existing export buttons (PDF, ICS) in a floating bottom action bar

### C7 — Beautiful Empty States
**Status**: `[ ]` Not started
**Why**: First-time users and cleared boards see bare, text-only empty states. These are the highest-anxiety moments in UX. A good empty state converts curiosity into action.
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `components/MapView.tsx`
**What to do**:
- **Inbox empty state** (no clips yet): Large SVG illustration of a phone with the Share Sheet open. Headline: "Your travel inspiration lives here". Body: "Share any Instagram, YouTube, or Xiaohongshu post via the iOS Share Sheet". CTA button: "How to clip" → links to a simple in-app guide
- **Boards empty state**: Illustration of map pins forming a constellation. Headline: "Plan your first adventure". CTA: "Create a board" → opens CreateBoardModal
- **Map empty state** (no locations extracted yet): Subtle grey map with a dashed circle. Text: "Save a few clips and locations will appear here". Keep existing onboarding seed handling
- All empty states should animate in with a gentle `opacity: 0 → 1` + `y: 10 → 0`

### C8 — Improved Full-Text Search (Substance-Aware)
**Status**: `[ ]` Not started
**Why**: The current search (A7) only matches title/description/tags. Substance items contain the richest content but aren't searched. A user searching "cash only Japan" won't find a clip whose substance says "cash only, bring ¥50,000".
**Files**: `lib/searchItems.ts`, `components/SearchBar.tsx`
**What to do**:
- Update `searchItems.ts` to also search across `item.substance[].content` and `item.substance[].applies_to`
- Boost score for substance matches (a substance hit ranks equal to a title hit)
- In `SearchBar.tsx`: when a substance item matches the query, show a preview snippet: "💡 cash only, bring ¥50,000" below the card title (max 60 chars, truncated)
- Add a subtle "X substance matches" count when results are filtered
- Search is still client-side and debounced

### C9 — Share a Plan via iOS Share Sheet
**Status**: `[ ]` Not started  
**Why**: Users want to share trip plans with travel companions. Currently there's no way to share a plan. Even a plain-text share is far better than nothing.
**Files**: `app/plan/[boardId]/page.tsx`, new `lib/shareText.ts`
**What to do**:
- Install `@capacitor/share` (`npm install @capacitor/share`)
- Create `lib/shareText.ts`: `formatPlanAsText(plan, boardName)` → generates a clean multi-line text itinerary
  - Header: `🗺 [Board Name] — [X]-day itinerary\n`
  - Each day: `📅 Day 1: [Theme]\n  🕐 9:00 · [Location] (2h)\n  💡 Tip: ...\n`
- Add a "Share" button to the plan view top-right header (Share icon from lucide)
- On native: call `Share.share({ title, text })` via Capacitor
- On web: fall back to `navigator.share` if available, else copy to clipboard

### C10 — Import from Camera Roll (Screenshot Share)
**Status**: `[ ]` Not started
**Why**: Xiaohongshu doesn't allow URL sharing from outside the app. Users often screenshot posts. The Share Extension can receive photos, but the web import sheet has no image input path.
**Files**: `components/ImportSheet.tsx`, `app/share/page.tsx`
**What to do**:
- Add an "Upload Screenshot" button to the `ImportSheet` modal (next to the URL input)
- Uses `<input type="file" accept="image/*" capture="environment">` — on iOS this opens Camera Roll
- On image selected: read as base64 via `FileReader`, call `enrichItem` with empty URL + imageData
- Show "Reading image with AI..." loading state
- This completes the Xiaohongshu fix for web/desktop flows without the iOS Share Extension

---

## PHASE D — On-Trip Features

### D1 — Nearby Clips Filter on Map
**Status**: `[ ]` Not started  
**Needs**: User location permission (C2)
**What to do**:
- After C2 is done: add a "Nearby" toggle button on the map (location pin icon, top-right)
- When active: filter map pins to only show clips within 5km of current location
- Show a subtle radius ring around user location indicating the filter boundary
- Tapping a nearby pin shows the detail card with a new "🧭 0.4 km away" distance chip

### D2 — On-Trip Navigation Mode
**Status**: `[ ]` Not started  
**Needs**: D1, planned trip
**What to do**:
- "Start Trip" button on the plan view → enters Navigation Mode
- Full-screen map centered on current position
- Shows the planned route with each stop numbered
- Highlighted "current stop" based on proximity (< 200m → auto-advance)
- Swipe up to show mini activity card for current stop
- "Stop" button to exit navigation mode

### D3 — Proactive Nearby Resurfacing
**Status**: `[ ]` Not started  
**Needs**: D1, Capacitor geolocation
**What to do**:
- On app foreground: if user is within 500m of a saved clip location → show a "You're near [X]!" banner
- Banner shows: clip title, distance, and "View on Map" button
- Dismiss with swipe
- Only show once per clip per day (track in localStorage with timestamp)
- No background geolocation — fires only on app open/foreground

---

## PHASE E — Social & Growth

### E1 — Shareable Read-Only Board Links
**Status**: `[ ]` Not started  
**Needs**: A deployed URL (not localhost)
**What to do**:
- Add a "Share Board" button to `app/boards/[id]/page.tsx`
- Generates a URL: `<appUrl>/boards/[id]?preview=1`
- When `?preview=1` is set: the board page renders as read-only (no delete, no edit)
- The board data is read from IndexedDB — this only works if the recipient opens the same device (use case: sharing your own plan screen)
- Phase 2 of this (cross-device sharing) requires B1 Supabase

### E2 — Clip Categories / Tags Polish
**Status**: `[ ]` Not started  
**What to do**:
- Current tags come from Claude (food, nature, culture, etc.) but aren't surfaced in the UI
- Add a horizontal tag filter row in the inbox (below platform filter row)
- Tapping a tag filters to clips with that tag
- Tags should have color coding: food=orange, nature=green, culture=purple, etc.
- Empty state per tag: "No [nature] clips yet — save a post about hiking to see it here"

### E3 — Auto-Cluster Clips into Trip Suggestions
**Status**: `[ ]` Not started  
**What to do**:
- Look at unassigned inbox clips that share a geographic cluster (within 100km)
- Show a "Looks like you're planning Japan? Create a board" nudge card at top of inbox
- Uses the existing `supercluster` library already in the codebase
- Nudge includes: map thumbnail, clip count, suggested board name
- One-tap creates a board and moves matching clips into it

---

## PHASE F — B4 Vibe Search (Unblocked Path)

### F1 — Client-Side Embedding Search (No Supabase)
**Status**: `[ ]` Not started  
**Why**: B4 (semantic search via Supabase pgvector) is blocked. But we can do client-side embedding search using `transformers.js` (Xenova) — runs entirely in-browser with a small model.
**What to do**:
- Install `@xenova/transformers` (add to package.json)
- Create `lib/embedSearch.ts`:
  - Lazy-load `pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')`
  - On first search, embed all clip descriptions + substance text using the model
  - Cache embeddings in IndexedDB (recompute only when clip changes)
  - On query, embed the query and compute cosine similarity against all cached embeddings
  - Return clips sorted by similarity score
- Wire into `SearchBar.tsx`: if query starts with `~` (tilde), use vibe search instead of keyword search
- UX: show "🔮 Vibe search" badge when in semantic mode

---

## Completed Tasks

### Phase A (All Done ✓)
- A1 — Substance Extraction (2-layer clip schema)
- A2 — Enrichment Retry Queue
- A3 — Error Tracking (PostHog)
- A4 — AI Cost Guard
- A5 — In-App Resource Request Notifications
- A6 — Pin Clustering at Low Zoom
- A7 — Full-Text Search on Clips
- A8 — Onboarding Seed Boards
- A9 — Plan Export (PDF + Calendar)
- A10 — Multi-Version Plan Support
- A11 — Surface Substance in Clip Detail (Wisdom view)
- A12 — Thread Substance into Trip Plans (sourced itineraries)

### Phase B (Partially Done)
- B1 — Supabase Setup (scaffolded, dormant until keys)
- B2 — Browser Extension (Chrome/Safari Manifest V3 clipper)
- B3 — Xiaohongshu Fix (Claude Vision for image payloads)
- B4 — Embedding/Vibe Search **(blocked — needs Supabase pgvector from B1)**
- B5 — Cloud Backup Export + Settings page
