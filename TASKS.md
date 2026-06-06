# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Execution Order (revised 2026-06-06)

Goal: a beautiful, fully functional iOS app that achieves the product vision — capture → organize → plan, with substance as first-class data.

**Immediate sprint** (no blockers): `D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8`

These are pure iOS UX polish tasks. Each makes the app feel more native, more trustworthy, more delightful — no new infrastructure required.

**After D-phase is done**: `C1 → C4 → C2 → E2 → E1`

Blocked on Supabase keys: `B4 → E3 → E4`

---

## PHASE A — Bug-Free MVP ✅ COMPLETE

All tasks done. See completed tasks below.

---

## PHASE B — Cloud Sync + Native Capture

### B1 — Supabase Setup
**Status**: `[~]` Scaffolded, dormant until keys
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (request from user)
**Remaining**: create Supabase project, run `schema.sql`, add sign-in UI, wire `syncNow()` on auth + app focus, enable Google provider.

### B2 — Browser Extension
**Status**: `[x]` Done

### B3 — Xiaohongshu Fix (Claude Vision)
**Status**: `[x]` Done

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Not started
**Needs**: Supabase pgvector (from B1)
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done

---

## PHASE C — On-Trip Mode

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Not started
**Files**: new `app/trip/page.tsx`, `components/NearbyClips.tsx`
**What to do**:
- New `/trip` route accessible from the bottom nav (add a "Trip" icon when a board has a generated plan)
- On open, request `navigator.geolocation.getCurrentPosition()` with a graceful permission prompt
- Show the day's activities in time order (from the saved plan)
- Highlight the current/next activity with a large card + walking distance estimate
- Below: "Nearby from your clips" — show SavedItems with locations within 2km of current GPS position (distance calc: Haversine formula)
- "Navigate" button: opens Apple Maps deep link `maps://` with destination coordinates
- Works offline (plan + clips are in IndexedDB; only geolocation needs network)
- Add "Trip" tab to NavBar only when `localStorage.activeTripBoardId` is set (set it when user taps "Start Trip" on the plan view)

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started
**Files**: new `app/boards/[id]/timeline/page.tsx`, `lib/db.ts` (add `checkins` store)
**What to do**:
- Add a `checkins` store to IndexedDB: `{ id, itemId, boardId, checkedInAt: number, notes?: string }`
- On the trip view (C1), add a "Check in" button on each activity — records a checkin
- New "Timeline" tab on board detail page showing checkins in chronological order
- Each checkin shows: thumbnail, name, time, optional notes, "View clip" link
- Empty state: "Start your trip to collect moments here"

### C3 — Shared Boards v1
**Status**: `[ ]` Not started
**Needs**: Supabase auth (B1)

### C4 — Proactive Resurfacing (Trip Countdown)
**Status**: `[ ]` Not started
**Files**: `app/page.tsx`, new `components/TripCountdownBanner.tsx`
**What to do**:
- When any saved item has a plan with a departure date set (add `departureDate?: string` to `Trip`), show a banner on the home screen: "✈️ Tokyo in 5 days — you have 47 clips ready"
- Banner links to the board's plan view
- Allow user to set a departure date on the plan view (simple date input, stored on the Trip object)
- Show a subtle countdown chip on the board card in the boards list
- No push notifications required (web banner only for now)

---

## PHASE D — iOS Native Polish 🎯 CURRENT SPRINT

### D1 — Haptic Feedback on Key Actions
**Status**: `[x]` Done
**Files**: `app/share/page.tsx`, `components/InboxCard.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `lib/haptics.ts` with `haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error')` that calls `navigator.vibrate()` on Android and `Haptics.impact()` from `@capacitor/haptics` on iOS
- Light haptic: board chip tap in share flow
- Medium haptic: "Clip to TravelPanel" save button
- Success haptic: clip saved successfully (stage === 'done')
- Medium haptic: plan generation start button
- Success haptic: plan generation complete
- Error haptic: enrichment failed state
- Install `@capacitor/haptics` — it's already a Capacitor ecosystem package, no App Store permission needed

### D2 — Swipe-to-Delete on Clip Cards
**Status**: `[x]` Done
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`
**What to do**:
- Add swipe-left gesture to inbox clip cards that reveals a red "Delete" action
- Use Framer Motion's `drag` + `dragConstraints` on the card: dragging left beyond -80px snaps to show delete button; dragging further to -screen-width confirms deletion with haptic feedback
- On delete confirm: animate card out (height to 0) then call `deleteItem(id)` from db.ts
- Add `removeItemFromBoard` cleanup if card belongs to a board
- Also add a "Move to board" action on swipe-right (just the button, launches a board-picker sheet)
- Long-press context menu as alternative: "Delete", "Move to board", "Copy URL"

### D3 — Item Detail Editing
**Status**: `[x]` Done
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`
**What to do**:
- Add `updateItem(id: string, updates: Partial<SavedItem>)` to `lib/db.ts`
- In `LocationDetailCard.tsx`, add an edit mode toggle (pencil icon in top-right)
- In edit mode, fields become editable:
  - Title: inline text input (auto-resizing)
  - Notes: multiline textarea (`notes` field on SavedItem — already in the type)
  - Tags: tag pills with × to remove + an "Add tag" button that shows a dropdown of common tags
- Save on blur or "Done" tap — call `updateItem()`
- Visual feedback: brief "Saved ✓" toast at bottom
- Notes field: shown below substance items in view mode when non-empty, styled as a handwritten-style memo card

### D4 — Board Management (Rename, Emoji, Reorder)
**Status**: `[x]` Done
**Files**: `app/boards/page.tsx`, `app/boards/[id]/page.tsx`, `lib/db.ts`
**What to do**:
- Long-press on a board card in the boards list opens a context menu: "Rename", "Change emoji", "Delete"
- Rename: inline text edit on the board name, saves on Enter/blur
- Change emoji: a simple emoji picker (show a grid of ~40 travel-relevant emojis: ✈️🗼🗺🏝🏔🏯🎌🌸🍜🎎🎿🚂🛶🏄🌴🌅🗽🏰🌋⛩🛕🎡🎭🎪🌉🌃🎢🏟🏛🌆🌇🏙🌊🏖🏕⛺🌄🌞🌝🌟)
- Delete: confirm dialog "Delete this board? Your clips will move to Inbox." — calls `deleteBoard(id)` (already implemented)
- Board detail page (`app/boards/[id]/page.tsx`): add a "..." menu in top-right for same actions
- Reorder boards: long-press + drag in the boards list (Framer Motion `Reorder.Group`)

### D5 — Dark Mode Support
**Status**: `[x]` Done
**Files**: `app/layout.tsx`, `tailwind.config.js`, all component files
**What to do**:
- Add `darkMode: 'class'` to `tailwind.config.js` (already might be there)
- In `app/layout.tsx`, detect system preference: `useEffect` + `matchMedia('prefers-color-scheme: dark')` + add `dark` class to `<html>` element. Also listen for changes.
- Store override in localStorage (`colorScheme: 'light' | 'dark' | 'system'`), settable from Settings page
- Add `dark:` variants to all primary components:
  - Background: `bg-white` → `dark:bg-gray-900`, `bg-gray-50` → `dark:bg-gray-950`
  - Text: `text-gray-900` → `dark:text-gray-100`, `text-gray-500` → `dark:text-gray-400`
  - Borders: `border-gray-100` → `dark:border-gray-800`
  - Cards: `bg-white` → `dark:bg-gray-800`
  - Map: MapLibre has a dark style — switch to `demotiles/dark` when dark mode active
- Settings page: add appearance toggle (System / Light / Dark)
- Priority order: MapView.tsx, InboxCard.tsx, NavBar.tsx, LocationDetailCard.tsx, share/page.tsx

### D6 — Skeleton Loading States
**Status**: `[x]` Done
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`
**What to do**:
- Create `components/SkeletonCard.tsx`: an animated shimmer placeholder matching the InboxCard dimensions
  - Use CSS animation: `@keyframes shimmer { from { background-position: -200px 0 } to { background-position: 200px 0 } }` with gradient background
  - Same aspect ratio as a real clip card (thumbnail + 2 text lines)
- In `app/inbox/page.tsx`: show 4 SkeletonCards while `loading === true`
- In `app/boards/page.tsx`: show 2 skeleton board-card placeholders
- In `LocationDetailCard.tsx` (detail card): show skeleton for the substance section while enrichment is in `processing` state
- Replace all "Loading..." text spinners with skeleton variants

### D7 — Paste-URL Import (Clipboard)
**Status**: `[ ]` Not started
**Files**: `app/page.tsx`, `components/ImportSheet.tsx`
**What to do**:
- On the main map view, add a floating "Paste URL" button near the + FAB (only show on non-iOS, since iOS users use the Share Sheet)
- On iOS (detect via `Capacitor.getPlatform() === 'ios'`), instead show a "+" FAB that opens a URL input sheet (for cases where the Share Sheet isn't convenient)
- The input sheet is a simple bottom sheet: URL input field (with `navigator.clipboard.readText()` auto-paste on open), optional title field, board selector chips, "Save" button
- This reuses the existing ImportSheet component if one exists, or triggers the share-page flow client-side
- Check `app/page.tsx` for the existing import sheet component and extend it

### D8 — Plan View Polish (Gift Moment UX)
**Status**: `[ ]` Not started
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`
**What to do**:
- The plan generation is "a gift moment" — implement a dramatic reveal:
  - During generation: show a streaming progress view with large animated thinking steps ("Organizing your 23 saves...", "Building your Tokyo adventure...", "Adding your wisdom...")
  - Each agent step renders as a large card that slides in from the bottom
  - Completion: a brief "confetti-style" animation (CSS keyframe burst of colored dots) before the plan slides in
- Plan scrolling: the day strip cards should have a sticky date header that doesn't disappear while scrolling within that day
- Each activity card: add a subtle indigo left-border glow when the card has sourced tips (the "wisdom" moat — make it visible and premium-feeling)
- "Regenerate" button: move to a floating action button at bottom of plan, always visible, with variant label ("New version" + version count badge)
- Add a "Share Plan" button in the plan header that calls `window.print()` or triggers the PDF export (A9) for iOS share sheet

---

## PHASE E — Discovery & Depth

### E1 — Wisdom Board View (Substance Library)
**Status**: `[ ]` Not started
**Files**: `app/boards/[id]/page.tsx`, new `components/WisdomTab.tsx`
**What to do**:
- Add a "Wisdom" tab to the board detail page (alongside existing "Clips" and "Map" tabs if present)
- The Wisdom tab shows ALL substance items from ALL clips in this board, aggregated and browsable
- Group by type: Tips 💡, Warnings ⚠️, Opinions 💬, Wisdom 🧠, Context 🌍, Recommendations ⭐
- Each item shows: content + source clip title (as a small tappable chip that opens the clip detail)
- Search within the wisdom tab (filter in-memory by content text)
- Sort options: by type, by clip, by recency
- Empty state: "Clip travel posts to build up your wisdom library"
- This is the "Wisdom tab" from the product strategy — the third primary surface alongside Map and Plan

### E2 — Real-World Enrichment Signals (Festival/Weather)
**Status**: `[ ]` Not started
**Files**: `app/api/plan/route.ts`, new `lib/enrichSignals.ts`
**What to do**:
- Create `lib/enrichSignals.ts` with a static dataset of major travel events:
  ```ts
  { location: "Tokyo", region: "Japan", event: "Cherry Blossom", 
    window: "late March - mid April", priceSurge: 1.4, 
    crowdLevel: "very high", note: "Book accommodation 3+ months ahead" }
  ```
  Include: Cherry Blossom (Tokyo/Kyoto), Golden Week (Japan), Obon (Japan), Diwali (India), 
  Songkran (Thailand), Chinese New Year (China/SE Asia), Carnival (Brazil/Europe), 
  Christmas Markets (Germany/Austria), Ramadan (Middle East), Coachella/etc (USA)
- In `app/api/plan/route.ts`, before generating the itinerary:
  1. Extract all destination countries/cities from the board's clips
  2. Check `enrichSignals.ts` for any events matching the destinations
  3. If `departureDate` is set on the trip (from C4), filter to events overlapping the travel window
  4. Inject matched signals as a `enrichmentWarnings` block in the planner prompt
- In the plan output, render enrichment warnings as yellow advisory cards above the day plan:
  `⚠️ Tokyo Cherry Blossom peaks Mar 25 – Apr 10. Accommodation typically 40% above average. Consider adjusting dates or booking early.`
- Make warnings dismissible (save dismissed IDs to localStorage)

### E3 — Embedding/Vibe Search
**Status**: `[ ]` Not started
**Needs**: Supabase pgvector (from B1)
**What to do**: Embed clip descriptions + substance text via Anthropic embeddings, store in pgvector, enable semantic "vibe" search

### E4 — Pro Tier
**Status**: `[ ]` Not started
**Needs**: Usage data from real users to determine what Pro unlocks
**What to do**: Stripe integration, paywall for unlimited plan generations, priority enrichment

### E5 — Multilingual (Chinese UI)
**Status**: `[ ]` Not started
**What to do**: i18n infrastructure + Chinese (Simplified) translation of all UI strings

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*

### A1 — Substance Extraction (2-layer clip schema) ✅
### A2 — Enrichment Retry Queue ✅
### A3 — Error Tracking (PostHog) ✅
### A4 — AI Cost Guard ✅
### A5 — In-App Resource Request Notifications ✅
### A6 — Pin Clustering at Low Zoom ✅
### A7 — Full-Text Search on Clips ✅
### A8 — Onboarding Seed Boards ✅
### A9 — Plan Export (PDF + Calendar) ✅
### A10 — Multi-Version Plan Support ✅
### A11 — Surface Substance in Clip Detail (Wisdom view) ✅
### A12 — Thread Substance into Trip Plans (sourced itineraries) ✅
### B2 — Browser Extension ✅
### B3 — Xiaohongshu Fix (Claude Vision) ✅
### B5 — Cloud Backup Export ✅
