# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.
> **Ultimate goal**: A beautiful, fully functional iOS travel app — the best travel inspiration manager on the App Store.

---

## ⭐ Recommended Execution Order (revised 2026-06-08)

The app's core loop is complete. Now the goal is **iOS-native quality** and **UX polish** — making every interaction feel intentional, fast, and beautiful on a real device.

`D1 → D2 → D3 → D4 → D5 → D6 → E1 → E2 → E3 → E4 → E5 → E6 → F1 → F2 → F3`

---

## PHASE D — iOS Polish & UX Quality

### D1 — Swipe Actions on Inbox Cards
**Status**: `[x]` Done  
**Why**: On mobile, users expect swipe-left to reveal actions (delete, move to board) on list items. This is a standard iOS pattern absent from the current card grid.  
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx` (or wherever the inbox grid lives — check `app/page.tsx` and `components/`)  
**What to do**:
- Wrap each InboxCard in a swipe-gesture container (use `react-use-gesture` / `@use-gesture/react` which is already a peer dep of Framer Motion, or use Framer Motion's drag)
- Swipe left → reveal two actions: red "Delete" button and indigo "Move to Board" button
- Swipe right → reveal green "Done / Archive" action (marks item as reviewed — store a `reviewed: boolean` flag in the item)
- Snap back on tap-outside or after action is triggered
- On desktop: show a three-dot context menu instead (detect via pointer media query or touch capability check)

### D2 — Duplicate Detection on Save
**Status**: `[x]` Done  
**Why**: Users sharing the same URL twice get silent duplicates. This confuses boards and inflates counts.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`, `hooks/useSavedItems.ts`  
**What to do**:
- On save, before calling `enrichItem`, check IndexedDB for any existing item with the same `url` (case-insensitive)
- If duplicate found: show an inline banner inside the share page ("You already saved this — saved to [board name] on [date]. Save again?")
- Two actions: "Save Anyway" (proceeds normally) and "Go to Existing" (navigates to the existing item's board and closes the share sheet)
- Track deduplicated saves as a `clip_deduplicated` PostHog event

### D3 — Pull-to-Refresh on Inbox and Boards
**Status**: `[x]` Done  
**Why**: iOS users instinctively pull-to-refresh. Without it the app feels static and un-native.  
**Files to change**: `app/page.tsx` (home / map), `app/boards/page.tsx`, the inbox view  
**What to do**:
- Add a pull-down gesture on the scrollable content areas
- On pull: re-run the retry queue for failed enrichments (call `processRetryQueue()` from `lib/retryQueue.ts` if it exists, or trigger `useSavedItems` refresh)
- Show a subtle spinner animation at the top during refresh (matches iOS design language — indigo spinner, fades in)
- Use `react-pull-to-refresh` or implement with Framer Motion drag constraints; keep it simple (no library if 20 lines of code suffice)

### D4 — Natural-Language Plan Refinement
**Status**: `[x]` Done  
**Why**: After generating a plan, users want to adjust it conversationally — "more free time", "fewer stops", "budget-conscious version". Currently regeneration means starting over.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`  
**What to do**:
- Add a text input below the plan: "Refine this plan..." placeholder
- On submit, POST to `/api/plan` with the existing plan JSON as `existingPlan` plus a `refinement` string
- In the API route: if `refinement` is present, include the existing plan in the system prompt and ask Claude to modify it per the instruction rather than generating fresh
- The refined plan is saved as a new version (not overwriting), named after the refinement text (truncated to 30 chars)
- Show a "Refining..." streaming state (reuse the existing agent-step UI)

### D5 — Board Wisdom Tab (Substance Library)
**Status**: `[x]` Done  
**Why**: The substance extraction moat is invisible beyond individual clip detail cards. A board-level Wisdom view — all tips/warnings/opinions from all clips in one browsable list — is the killer feature for users with 20+ saves.  
**Files to change**: `app/boards/[id]/page.tsx`  
**What to do**:
- Add a two-tab toggle at the top of the board content area: "Places" (current grid) and "Wisdom"
- Wisdom tab: aggregate all `substance` items from all `boardItems`, grouped by type
- Order: warnings ⚠️ first (safety-critical), then tips 💡, recommendations ⭐, wisdom 🧠, opinions 💬, context 🌍
- Each substance item shows its content, the clip it came from (small pill chip: "📍 Senso-ji Temple clip"), and optionally the `source_quote` in italic
- Filter pills at the top: "All · Tips · Warnings · Wisdom" — tap to filter
- Empty state: "No wisdom extracted yet. Add more clips to unlock insights."

### D6 — Offline Plan Cache
**Status**: `[x]` Done  
**Why**: Plans are generated online but should be readable offline — essential for in-destination use.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`  
**What to do**:
- Plans are already stored in IndexedDB via the `trips` store — they ARE offline-capable. The gap is that the page requires JS bundle, not data.
- Add a `next-pwa` precache rule for the `/plan/` route group (check `next.config.js` for existing PWA config)
- Add an offline indicator to the plan page header: small "● Offline" badge (red dot) that appears when `navigator.onLine === false`; hide when online
- Add `useEffect` that listens to `window.addEventListener('online'/'offline')` and shows a toast: "You're back online — pull down to refresh plan"
- In `lib/db.ts`, ensure `getTripsByBoardId` is called with fallback so it never throws when IndexedDB is unavailable

---

## PHASE E — Native iOS Feel

### E1 — Haptic Feedback on Key Interactions
**Status**: `[ ]` Not started  
**Why**: Haptic feedback is the single biggest signal that an app is "native-quality" on iOS. Without it the app feels like a website.  
**Files to change**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/InboxCard.tsx`, `app/boards/[id]/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with a `vibrate(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error')` function
  - Use `navigator.vibrate()` with appropriate ms patterns: light=10, medium=20, heavy=40, success=[10,50,10], error=[20,100,20]
  - No-op silently if `navigator.vibrate` is not supported
- Add haptic feedback to: clip saved (success), card deleted (medium), board created (light), plan generated (success), share triggered (light)
- In the Capacitor context, also call `Haptics.impact()` from `@capacitor/haptics` if available (dynamic import, no-op if not installed)

### E2 — Dark Mode Support
**Status**: `[ ]` Not started  
**Why**: iOS users expect dark mode. Without it the app looks unpolished in system dark mode.  
**Files to change**: `app/globals.css`, `app/layout.tsx`, multiple component files  
**What to do**:
- Add `darkMode: 'media'` to `tailwind.config.js` (or `darkMode: 'class'` if a toggle is desired — prefer `'media'` for automatic system sync)
- Audit all components and add `dark:` variants for:
  - `bg-white` → `dark:bg-gray-900`
  - `bg-gray-50` → `dark:bg-gray-950`
  - `text-gray-800/700/600` → `dark:text-gray-100/200/300`
  - `border-gray-200` → `dark:border-gray-700`
  - `bg-indigo-50` → `dark:bg-indigo-950`
  - Map overlay cards: `bg-white/90` → `dark:bg-gray-900/90`
- The map tiles stay the same (MapLibre OpenFreeMap doesn't have a dark style — acceptable)
- Test: NavBar, BoardCard, InboxCard, LocationDetailCard, PlanVersionBar, header bars

### E3 — Smooth Page Transitions
**Status**: `[ ]` Not started  
**Why**: Page transitions are abrupt. On iOS, views slide in/out with directional motion. This is the most visible signal that an app is native-quality.  
**Files to change**: `app/layout.tsx`, new `components/PageTransition.tsx`  
**What to do**:
- Create `components/PageTransition.tsx` — a Framer Motion wrapper with `initial={{ x: '100%', opacity: 0 }}`, `animate={{ x: 0, opacity: 1 }}`, `exit={{ x: '-30%', opacity: 0 }}` with `duration: 0.25, ease: 'easeInOut'`
- Wrap each page's root `<div>` with `<PageTransition>` for the key page-level layouts
- Use `AnimatePresence` in `app/layout.tsx` with `mode="wait"` and `key={pathname}` from `usePathname()`
- Specifically wire: Home ↔ Boards ↔ Settings, and push-style (board list → board detail → plan)
- Keep transitions fast (<250ms) — slow transitions are worse than none

### E4 — Item Reordering in Boards (Drag-to-Reorder)
**Status**: `[ ]` Not started  
**Why**: The order of items in a board matters for trip planning. Currently items are in insertion order with no way to reorder.  
**Files to change**: `app/boards/[id]/page.tsx`, `hooks/useBoards.ts`, `lib/db.ts`  
**What to do**:
- Use `@dnd-kit/core` + `@dnd-kit/sortable` (already likely in lockfile; check `package.json`)
- If not installed: add `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Wrap the board items grid in `<SortableContext>` with a grid strategy
- Each `InboxCard` wrapped in `<SortableItem>` — long-press to activate drag handle (or show a drag handle icon on the card)
- On drop, call `updateBoardItemOrder(boardId, newItemIds)` — add this to `useBoards` and `lib/db.ts` as a simple `patchBoard({ itemIds: newItemIds })`
- Persist the new order to IndexedDB

### E5 — Smart Auto-Board Assignment
**Status**: `[ ]` Not started  
**Why**: Users shouldn't have to manually pick a board for every clip. The AI already extracts location and tags — use them to suggest (or automatically assign) the right board.  
**Files to change**: `app/share/page.tsx`, new `lib/autoAssign.ts`  
**What to do**:
- After enrichment completes (in `share/page.tsx` after `enrichItem` resolves), call `autoAssignBoard(item, boards)` from a new `lib/autoAssign.ts`
- `autoAssignBoard` logic (no API call — pure heuristic):
  1. If only 1 board exists, assign to it
  2. Match by location overlap: if item's `locations[0].name` or `tags` contain words in board.name → score +2 per match
  3. Match by tag overlap: item tags vs. board name keywords
  4. If top match score ≥ 2, auto-assign (move item to that board's `itemIds`)
  5. If confidence is low (score < 2 and 2+ boards exist), show a one-tap suggestion banner: "Move to [BoardName]?" with Accept/Dismiss
- Track `clip_auto_assigned` and `clip_auto_assign_suggested` PostHog events

### E6 — Clip Notes (Personal Annotations)
**Status**: `[ ]` Not started  
**Why**: Users want to add their own notes to clips — "go with Mom", "need to book in advance", "check this in cherry blossom season". Currently `notes` field exists in the type but is never surfaced in UI.  
**Files to change**: `components/LocationDetailCard.tsx`, `hooks/useSavedItems.ts`, `lib/db.ts`  
**What to do**:
- In `LocationDetailCard`, add a "Notes" section below the substance list
- Show existing `item.notes` as editable text (tap to edit inline — `contentEditable` div or a simple `<textarea>`)
- On blur / "Done" tap: call `updateItem(id, { notes: value })` — add this to `useSavedItems` and `lib/db.ts` (`patchItem` or `updateItem`)
- Show a subtle note icon on InboxCards that have notes (bottom-right corner, gray pencil icon, only if `item.notes` is non-empty)
- Empty state in the notes section: "Add a personal note..." placeholder in gray italic

---

## PHASE F — Engagement & Retention Features

### F1 — Board Cover Photos
**Status**: `[ ]` Not started  
**Why**: Boards with cover photos feel like curated collections, not database entries. This directly supports the "editorial curation" identity emotional promise.  
**Files to change**: `components/BoardCard.tsx`, `hooks/useBoards.ts`, `lib/db.ts`  
**What to do**:
- Auto-select `board.coverThumbnail`: set it to the thumbnail of the first `done` item in the board's `itemIds` (update when items are added)
- In `BoardCard.tsx`: if `board.coverThumbnail` is set, render it as a background image behind the board info (with a dark gradient overlay for text readability)
- Update cover when board items change: in `useBoards`, after `addItemToBoard`, update the board's `coverThumbnail` to the new item's thumbnail if the board had none
- Allow manual override: long-press a board card → "Set as Cover" context option (pick from the board's items with thumbnails)

### F2 — Trip Count & Streak on Home Screen
**Status**: `[ ]` Not started  
**Why**: Gamification light — showing users their clipping streak and total count makes clipping feel like a habit, not a chore. Directly affects North Star metric (weekly clips per active user).  
**Files to change**: `app/page.tsx` (home header)  
**What to do**:
- In the floating top bar on the home map, replace the plain `{items.length} places saved` count with:
  - Total clip count: animated counter (framer-motion `useSpring` number animation)
  - Weekly streak: calculate from `items[].savedAt` how many consecutive weeks have ≥1 new clip. Display as "🔥 4-week streak" if streak ≥2
  - Only show the streak if ≥2 weeks. Don't show it the first week.
- Store last-computed streak in localStorage (recompute on mount from items, cache result)
- Tap the stat area → slide up a tiny stats sheet: total clips, this week, this month, longest streak

### F3 — Enrichment Quality Indicator
**Status**: `[ ]` Not started  
**Why**: Users don't know when a clip was well-extracted vs. poorly extracted. A quality signal builds trust in the extraction layer.  
**Files to change**: `components/InboxCard.tsx`, `lib/types.ts`  
**What to do**:
- Compute an extraction quality score on each `done` item (no API call — local heuristic):
  - `+1` for has locations
  - `+1` for `locations[0].lat` is non-zero
  - `+1` for title length > 10 chars
  - `+1` for description length > 30 chars
  - `+1` for tags.length > 0
  - `+1` for substance.length > 0
  - Max score: 6. Show as: 0–2 = low (gray), 3–4 = medium (amber), 5–6 = high (green)
- Display as a tiny colored dot in the bottom-right corner of InboxCard (only visible on done items)
- In LocationDetailCard: show "Extraction quality: Good / Fair / Poor" with a help tooltip: "Based on how much information was extracted from this clip"
- Low-quality items get a "Retry extraction" button that re-calls enrichItem

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*

### Phase A — Bug-Free MVP ✅
- A1: Substance Extraction (2-layer clip schema)
- A2: Enrichment Retry Queue
- A3: Error Tracking (PostHog)
- A4: AI Cost Guard
- A5: In-App Resource Request Notifications
- A6: Pin Clustering at Low Zoom
- A7: Full-Text Search on Clips
- A8: Onboarding Seed Boards
- A9: Plan Export (PDF + Calendar)
- A10: Multi-Version Plan Support
- A11: Surface Substance in Clip Detail (Wisdom view)
- A12: Thread Substance into Trip Plans (sourced itineraries)

### Phase B — Cloud Sync + Native Capture ✅ (partial)
- B1: Supabase Setup (scaffolded, dormant until keys)
- B2: Browser Extension
- B3: Xiaohongshu Fix (Claude Vision)
- B4: Embedding/Vibe Search (BLOCKED — needs Supabase pgvector)
- B5: Cloud Backup Export

### Phase C — On-Trip Mode ✅
- C1: On-Trip GPS Mode
- C2: Post-Trip Timeline
- C3: Shared Boards v1
- C4: Proactive Resurfacing
