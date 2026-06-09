# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-09)

All Phase A–C tasks are done. The app has a complete feature set. The goal now is
**a beautiful, fully functional iOS app ready for App Store submission and real users.**

`D1 → D4 → D5 → D7 → G1 → G3 → D2 → D3 → E1 → E5 → E6 → F2 → F3 → G4 → D6 → D8 → E2 → E3 → E4 → F1 → F4 → H1 → H2 → B4`

Phase D makes it feel like a real iOS app. G1+G3 unblocks App Store submission. Phase E
makes it delightful. Phase F makes it production-grade. Phase H makes it intelligent.

---

## PHASE D — iOS Native Polish (Current Sprint)

### D1 — Safe Area Insets (Notch / Dynamic Island / Home Indicator)
**Status**: `[x]` Done
**Why**: Every page uses hardcoded `pt-12` for the status bar and assumes a fixed bottom
inset. On iPhone 14/15 Pro (Dynamic Island) and iPhone SE (small notch) this looks wrong.
The NavBar bottom also needs room for the home indicator bar. This is the first thing
reviewers and real users notice.
**Files to change**: `app/layout.tsx`, `app/page.tsx`, `app/inbox/page.tsx`,
`app/boards/page.tsx`, `app/boards/[id]/page.tsx`, `app/plan/[boardId]/page.tsx`,
`app/settings/page.tsx`, `components/NavBar.tsx`
**What to do**:
- Add `viewport-fit=cover` to the viewport meta tag in `app/layout.tsx`
- Add `env(safe-area-inset-top)` CSS variable support: in `app/globals.css` add a
  `.pt-safe` utility: `padding-top: env(safe-area-inset-top, 48px)` and
  `.pb-safe` for `padding-bottom: env(safe-area-inset-bottom, 24px)`
- Replace every hardcoded `pt-12` in page headers with `pt-safe` (using inline style
  `paddingTop: 'env(safe-area-inset-top, 48px)'` since Tailwind arbitrary env() is limited)
- In `NavBar.tsx`, add `paddingBottom: 'env(safe-area-inset-bottom, 0px)'` to the nav element
- In `app/page.tsx` (map page), the top floating bar needs the same safe-area padding
- Test mentally: iPhone 15 Pro has ~59px Dynamic Island; iPhone SE has ~20px status bar

### D2 — Swipe-to-Delete on Inbox Cards
**Status**: `[ ]` Not started
**Why**: Swipe left to delete is a universal iOS gesture. Users expect it on every list item.
Without it, the delete button buried in the card footer is hard to discover.
**Files to change**: new `components/SwipeableCard.tsx`, `app/inbox/page.tsx`,
`app/boards/[id]/page.tsx`
**What to do**:
- Create `components/SwipeableCard.tsx` — a wrapper using Framer Motion `drag="x"` with
  `dragConstraints={{ left: -80, right: 0 }}` and `dragElastic={0.1}`
- When dragged left >60px, reveal a red delete zone (full-width red background with a
  white Trash2 icon) behind the card
- When released past the snap threshold (>60px), trigger the `onDelete` callback and
  animate the card out with `height: 0` via Framer Motion layout animation
- When released before threshold, snap back with spring animation
- Wrap each `InboxCard` in `SwipeableCard` in `app/inbox/page.tsx`
- Wrap each `InboxCard` in `app/boards/[id]/page.tsx` similarly
- Don't use swipeable on the 2-column grid layout — only on a future list view; for now,
  make the grid cards have a long-press-to-show-delete-button as a simpler alternative:
  use `useState<string | null>` for `longPressId`; on `onTouchStart` start a 500ms timer;
  if it fires, show an overlay delete button on that card

### D3 — Haptic Feedback on Key Actions
**Status**: `[x]` Done
**Why**: Native iOS apps use haptics to confirm actions. Without them the app feels like
a website. Haptics are free — no UI needed, pure feel improvement.
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `app/inbox/page.tsx`,
`app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `lib/haptics.ts`:
  ```typescript
  export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
    } catch { /* no-op if Capacitor not available */ }
  }
  export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
      await Haptics.notification({ type: map[type] });
    } catch {}
  }
  ```
- Install `@capacitor/haptics`: add it to `package.json` (it's a Capacitor core plugin,
  already likely in `ios/App/Podfile` — check first)
- Wire `hapticImpact('medium')` to: clip saved (share page), board created
- Wire `hapticImpact('light')` to: delete button tap, move to board
- Wire `hapticNotification('success')` to: plan generation complete
- Wire `hapticNotification('error')` to: plan limit hit, enrichment failed after 3 retries

### D4 — Duplicate Detection on Save
**Status**: `[x]` Done
**Why**: Users frequently share the same URL twice (saw it again on Instagram, forgot
they already saved it). Without duplicate detection the inbox fills with duplicates silently.
**Files**: `components/ImportSheet.tsx`, `app/share/page.tsx`, `lib/db.ts`
**What to do**:
- Add `findItemByUrl(url: string): Promise<SavedItem | null>` to `lib/db.ts` — does a
  `getAll('items')` and returns the first match (index is worth adding: `items.createIndex('url', 'url')` in the DB schema upgrade at version bump)
- In `components/ImportSheet.tsx`, before starting enrichment: call `findItemByUrl(url)`;
  if a match is found, show a bottom sheet: "Already saved — [item title]. Add to a
  different board or skip?" with buttons: "Open existing", "Save again anyway", "Cancel"
- Same check in `app/share/page.tsx` before calling `enrichItem`
- "Open existing" navigates to `/?itemId=<id>&flyTo=<lat>,<lng>` if it has locations,
  or to `/inbox` otherwise

### D5 — Clip Editing (Title, Notes, Tags)
**Status**: `[x]` Done
**Why**: After saving a clip, users may want to rename it, add personal notes, or fix
wrong tags. There is currently no edit flow — it's save-only.
**Files**: new `components/EditClipSheet.tsx`, `components/LocationDetailCard.tsx`,
`components/InboxCard.tsx`, `lib/db.ts`
**What to do**:
- Create `components/EditClipSheet.tsx` — a bottom sheet (same spring animation pattern
  as existing sheets) with:
  - Text input for `title` (pre-filled, maxLength=120)
  - Textarea for `notes` (pre-filled, 3 rows, maxLength=500)
  - Tag chips: show existing tags, each tappable to remove; a small text input to add new ones
  - "Save changes" button → calls `saveItem({ ...item, title, notes, tags })` then closes
  - "Cancel" button
- In `components/LocationDetailCard.tsx`: add a pencil (Edit2) icon button in the top-right
  area (near the X close button); tapping it opens `EditClipSheet` for that item
- Pass an `onUpdated?: (item: SavedItem) => void` callback up so parent pages can refresh
  the item in local state without a full reload

### D6 — Pull-to-Refresh on Inbox and Boards
**Status**: `[ ]` Not started
**Why**: Standard iOS gesture. Users pull down to trigger a refresh — checking for failed
enrichments, re-running retries, re-syncing from cloud when B1 is active.
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`
**What to do**:
- Implement a custom pull-to-refresh using Framer Motion `drag="y"` on the scroll container:
  track `dragY`; when pulled >60px and released, show a spinner briefly and call
  `router.refresh()` + retry any failed enrichments
- Alternatively use a simple `<div onTouchStart onTouchMove onTouchEnd>` approach that
  listens for a pull gesture of >60px displacement from the top of a scrolled-to-top list
- Show a circular progress indicator at the top (indigo spinner) while refreshing
- Snap back automatically after the refresh resolves (max 2s)

### D7 — Offline Banner
**Status**: `[x]` Done
**Why**: When offline (airplane mode, bad signal), API calls fail silently. Users don't
know why enrichment isn't working or why Plan generation fails. A simple banner removes
the mystery and sets correct expectations.
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx`
**What to do**:
- Create `components/OfflineBanner.tsx`:
  - Use `useEffect` to add `window.addEventListener('online' | 'offline')` listeners
  - When offline: render a fixed banner at the top of the screen (below safe area):
    `bg-gray-800 text-white text-xs text-center py-2` with "No internet connection —
    saved clips are still available"
  - Animate in/out with Framer Motion y-slide (height: 0 → auto)
  - Check `navigator.onLine` on mount for initial state
- Add `<OfflineBanner />` to `app/layout.tsx` above the children

### D8 — Dark Mode Support
**Status**: `[ ]` Not started
**Why**: iOS users expect dark mode to be respected. Half of iPhone users use dark mode.
Without it the app is harsh at night and looks unfinished.
**Files**: `app/globals.css`, `app/layout.tsx`, `components/NavBar.tsx`,
`components/InboxCard.tsx`, `components/LocationDetailCard.tsx`, `app/inbox/page.tsx`,
`app/boards/page.tsx`, `app/settings/page.tsx`
**What to do**:
- Add `darkMode: 'media'` to `tailwind.config.ts` (uses `prefers-color-scheme`)
- Update `app/globals.css`: add `@media (prefers-color-scheme: dark)` block with
  `--background: #111827` (gray-900), `--card: #1f2937` (gray-800), `--text: #f9fafb`
- Add `dark:` variants to core components:
  - `NavBar`: `dark:bg-gray-900/95 dark:text-gray-300`
  - `InboxCard` background: `dark:bg-gray-800 dark:border-gray-700`
  - `LocationDetailCard` panel: `dark:bg-gray-800`
  - Page backgrounds: `dark:bg-gray-900`
  - Header bars: `dark:bg-gray-900 dark:shadow-gray-800`
  - Text colors: `text-gray-800` → `dark:text-gray-100`, `text-gray-500` → `dark:text-gray-400`
- MapView: MapLibre supports a dark style; switch to the dark OpenFreeMap style when
  `prefers-color-scheme: dark`: use `useDarkMode()` hook and set map style URL to
  `https://tiles.openfreemap.org/styles/dark` when dark

---

## PHASE E — UX Deepening

### E1 — Auto-Board Suggestion on Save
**Status**: `[ ]` Not started
**Why**: When users save a clip, they have to manually choose a board from a list. The app
should infer the right board from the content and offer a single-tap confirm.
**Files**: new `lib/boardSuggestion.ts`, `app/share/page.tsx`
**What to do**:
- Create `lib/boardSuggestion.ts`:
  ```typescript
  export function suggestBoard(item: SavedItem, boards: Board[]): Board | null
  ```
  Algorithm: for each board, score by:
  1. Location name match: if any `item.locations[0].name` contains a word from `board.name` (case-insensitive, min 4 chars), +3 points
  2. Tag overlap: count matching tags between item.tags and the last 5 items in that board
  3. Return the board with highest score if score > 1, else null
- In `app/share/page.tsx` in the "done" stage (after enrichment completes), if `suggestBoard`
  returns a board, show a suggestion chip: "Add to [emoji] [Board Name]? Tap to confirm"
  with a checkmark button and an X to dismiss. Confirming calls `addItemToBoard`.

### E2 — Board Reordering via Drag
**Status**: `[ ]` Not started
**Why**: Boards are listed in creation order. Users want their most-used boards at the top.
**Files**: `app/boards/page.tsx`, `lib/db.ts`
**What to do**:
- Add a `sortOrder: number` field to the `Board` type in `lib/types.ts`
- In `lib/db.ts` `updateBoard`: support updating `sortOrder`; add a new function
  `reorderBoards(orderedIds: string[])` that updates all boards' `sortOrder` in one
  transaction
- Install `@dnd-kit/core` and `@dnd-kit/sortable`
- In `app/boards/page.tsx`, wrap the board grid with `DndContext` and `SortableContext`
- Each `BoardCard` gets `useSortable` — shows a drag handle (GripVertical icon) on the
  card, visible on long press on mobile or always on desktop
- On drag end, call `reorderBoards` with the new order and update local state optimistically

### E3 — Richer Plan Streaming (Visible Reasoning)
**Status**: `[x]` Done
**Why**: 圆周旅记's biggest UX win is streaming agent reasoning that makes users feel like
an intelligent friend is thinking for them. Our plan generation emits generic step types
but the messages are terse. Richer, context-specific messages build trust.
**Files**: `app/api/plan/route.ts`, `components/PlannerAgent.tsx`
**What to do**:
- In `app/api/plan/route.ts`, emit descriptive step messages that reference the actual
  content being processed. Examples:
  - `searching`: "Reading your ${boardItems.length} saved clips in ${board.name}…"
  - `clustering`: "Grouping ${locationCount} locations by proximity — found ${clusterCount} neighborhood clusters"
  - `routing`: "Optimizing the route across ${days} days — minimizing daily travel time"
  - `validating`: "Weaving in ${substanceCount} tips and warnings from your saves"
- In `components/PlannerAgent.tsx`, add a typing animation to the latest step message:
  render character by character using a `useEffect` that builds up the string over 400ms
  (just CSS animation is fine: animate the text appearing with a blinking cursor `|`)
- Each step should show the elapsed time since generation started (show "3s" etc)

### E4 — Natural Language Plan Refinement
**Status**: `[ ]` Not started
**Why**: After generating a plan, users want to say "more relaxed pace" or "remove the
museums" rather than regenerating from scratch. This is the highest-value post-generation
interaction, and it's what separates a planning tool from a one-shot generator.
**Files**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`
**What to do**:
- In `app/plan/[boardId]/page.tsx`, below the complete plan add a text field:
  placeholder "Refine this plan…" with a Send icon button
- When submitted, POST to `/api/plan` with the same board items BUT also include:
  `refinementNote: string` and `existingPlan: TripPlan` in the body
- In `app/api/plan/route.ts`, if `refinementNote` is present, prepend to the planner
  prompt: "REFINEMENT REQUEST: The user wants to modify this existing plan with the
  following instruction: '[refinementNote]'. Existing plan: [JSON]. Preserve the overall
  structure but apply the requested changes."
- Show the existing plan while the new one generates (don't blank it out)
- The new plan saves as a new version (name auto-set to the refinement text truncated to
  30 chars), using the existing multi-version support from A10

### E5 — Real-World Enrichment Signals (Festivals + Weather)
**Status**: `[x]` Done
**Why**: The strategic moat over all AI travel chatbots is that we can say "Golden Week
overlaps with YOUR specific saves." A static dataset covers 80% of cases in 1–2h of work.
**Files**: new `lib/enrichmentSignals.ts`, `app/api/plan/route.ts`
**What to do**:
- Create `lib/enrichmentSignals.ts` with a static array of ~60 major annual events:
  ```typescript
  interface AnnualEvent {
    name: string;
    destinations: string[]; // city/country names (lowercase, for fuzzy match)
    monthRange: [number, number]; // 1–12, inclusive
    priceImpact: 'high' | 'medium' | 'low';
    crowdLevel: 'high' | 'medium';
    warning: string; // human-readable warning to inject
  }
  ```
  Include: Cherry Blossom Japan (3–4), Golden Week Japan (4–5), Obon Japan (8),
  Songkran Thailand (4), Diwali India (10–11), Carnival Brazil (2–3), Oktoberfest Germany (9–10),
  Christmas markets Europe (11–12), Coachella California (4), Chinese New Year (1–2),
  Dragon Boat Festival China (6), Mid-Autumn Festival China/Asia (9), Eid travel surge (varies),
  Ramadan travel impact (varies), European summer peak (7–8), SE Asia monsoon (5–10),
  Bali Nyepi (3), Holi India (3), etc.
- In `app/api/plan/route.ts`, extract destination names from `boardItems[].locations[].name`;
  fuzzy-match against `AnnualEvent.destinations` (simple `.includes()` check); if a match
  is found during the user's travel window (derive from `days` count + today's month as
  approximate proxy, or just always flag year-round events), inject matched warnings into
  the planner system prompt: "ENRICHMENT WARNINGS: [warning text]. Surface these as inline
  ⚠️ advisories in the itinerary."
- Add an optional `enrichmentWarnings?: string[]` field to `TripPlan` type so the plan
  view can render a collapsible "Heads-up" section at the top

### E6 — Inline Note from Detail Card
**Status**: `[x]` Done
**Why**: Users think of a note while looking at a clip detail ("check if cash-only first").
Having to go through an edit flow to add a note is friction. Inline note editing removes
one step from a common action.
**Files**: `components/LocationDetailCard.tsx`
**What to do**:
- In `LocationDetailCard.tsx`, the Notes section currently shows read-only text
- Change it to: if `item.notes` is empty, show a "+ Add note" button (dashed border
  rounded-xl, text-sm text-gray-400)
- If `item.notes` has content, show the note text with a small Edit2 icon button
- Tapping either activates an inline `<textarea>` with auto-focus in place of the note
  display (no modal, no sheet — just in-place editing)
- Show "Save" and "Cancel" buttons below the textarea
- On Save: call `saveItem({ ...item, notes: newNote })` and update parent via `onUpdated` callback
- The textarea should auto-resize (CSS `resize: none; height: auto` with JS height recalc)

---

## PHASE F — Performance & Quality

### F1 — Virtual Scrolling for Inbox (200+ items)
**Status**: `[ ]` Not started
**Why**: At 200+ clips the 2-column grid renders all DOM nodes at once. On older iPhones
this causes visible jank on scroll. Virtual scrolling renders only visible items.
**Files**: `app/inbox/page.tsx`
**What to do**:
- Install `@tanstack/react-virtual`
- Convert the `grid grid-cols-2 gap-3` in `app/inbox/page.tsx` to a virtualized
  implementation:
  - Use `useVirtualizer` from `@tanstack/react-virtual` with `count: Math.ceil(filtered.length / 2)`
    (one "row" = 2 items)
  - Each virtual row renders 2 `InboxCard` components side by side
  - Estimate row height at 280px (card height); set `overscan: 3`
  - The virtualizer requires a fixed-height scroll container — use the existing
    `flex-1 overflow-y-auto` div as the scroll container with `ref`

### F2 — Error Boundaries
**Status**: `[x]` Done
**Why**: Uncaught React render errors produce a blank white screen with no way out.
A good error boundary shows a user-friendly recovery screen.
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `components/ErrorBoundary.tsx` (must be a class component for React error boundary):
  ```typescript
  class ErrorBoundary extends React.Component<{children, fallback?}> {
    state = { hasError: false, error: null }
    static getDerivedStateFromError(error) { return { hasError: true, error } }
    componentDidCatch(error, info) { track('js_error', { message: error.message }) }
    render() {
      if (!this.state.hasError) return this.props.children;
      return <fallback UI with "Something went wrong" + Retry button that reloads>;
    }
  }
  ```
- The fallback UI: center-screen card with a 😵 emoji, "Something went wrong" h2,
  the error message in a small gray `<code>` block, and a "Reload app" button
  (`window.location.reload()`)
- Wrap `app/layout.tsx` children with `<ErrorBoundary>`
- Also wrap the plan generation section in `app/plan/[boardId]/page.tsx` with a
  local error boundary that shows "Plan generation failed — tap to retry" instead
  of crashing the whole page

### F3 — Optimistic Delete in Inbox
**Status**: `[x]` Done
**Why**: Currently tapping delete waits for the IndexedDB write before the card disappears.
On slow devices there's a ~100ms lag that makes the app feel sluggish.
**Files**: `hooks/useSavedItems.ts`, `app/inbox/page.tsx`
**What to do**:
- In `hooks/useSavedItems.ts`, update `removeItem` to:
  1. Immediately remove the item from local `items` state
  2. Call `deleteItem(id)` in the background
  3. On failure, restore the item to state (reverse the optimistic update) and show a
     toast: "Delete failed — tap to retry"
- The existing `AnimatePresence` exit animation in `app/inbox/page.tsx` already handles
  the visual removal — this change just makes the state update immediate

### F4 — Lazy Thumbnail Loading
**Status**: `[x]` Done
**Why**: All `<img>` tags in InboxCard and BoardCard load thumbnails eagerly. On slow
connections the inbox stalls on image loading instead of showing cards.
**Files**: `components/InboxCard.tsx`, `components/BoardCard.tsx`
**What to do**:
- Add `loading="lazy"` to all `<img>` elements in both components
- Add `decoding="async"` as well
- In `InboxCard`, while the image is loading show the gray placeholder `<div>` (which
  already exists as the fallback) — currently `onError` hides the img; also add
  `onLoad` to swap from placeholder to actual image with a fade transition:
  - Keep the placeholder visible until image loads; on `onLoad` fade in the actual image
  - Use a `useState<boolean>` for `imgLoaded` + CSS `opacity: 0 → 1` transition

---

## PHASE G — App Store Preparation

### G1 — iOS App Icon (All Required Sizes)
**Status**: `[ ]` Not started
**Why**: The current app icon is the default Capacitor/Ionic icon. This is the first thing
App Store reviewers and users see. A beautiful icon is not optional for launch.
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json` and all PNG files,
new `scripts/generate-icons.js`
**What to do**:
- Design the icon as SVG: indigo gradient background (`#4338ca` to `#6366f1`), centered
  white compass/globe shape. Simplest design: a circle outline (globe) with a centered
  dot and 4 radiating lines forming a compass rose — clean, recognizable at small sizes
- Create `scripts/generate-icons.js` using `sharp`:
  ```javascript
  // Reads src/icon-1024.png (or renders the SVG), outputs all sizes to
  // ios/App/App/Assets.xcassets/AppIcon.appiconset/
  const sizes = [20,29,40,58,60,76,80,87,120,152,167,180,1024];
  ```
- Create the source SVG at `public/app-icon.svg` with the design above
- Update `Contents.json` with the correct filename references
- Also generate `public/icon-192.png` and `public/icon-512.png` for the PWA manifest

### G2 — Launch Screen (Splash Screen)
**Status**: `[ ]` Not started
**Why**: The current Capacitor splash screen is the default. On launch, iOS shows the
launch screen for ~300ms. A branded splash screen makes the first impression premium.
**Files**: `ios/App/App/Base.lproj/LaunchScreen.storyboard`,
`ios/App/App/Assets.xcassets/Splash.imageset/`
**What to do**:
- Create a simple splash: indigo solid background (`#4f46e5`) with the white app icon
  centered (~120×120 pts)
- Create the splash PNG at 1× (375×812), 2× (750×1624), 3× (1125×2436) sizes
- Update `LaunchScreen.storyboard` to show the splash image centered on an indigo
  background view (backgroundColor `#4f46e5`); keep it simple — no text, just the icon
- Update `ios/App/App/Assets.xcassets/Splash.imageset/Contents.json` with the file refs
- In `capacitor.config.ts`, set `SplashScreen.backgroundColor: '#4f46e5'` and
  `SplashScreen.showSpinner: false`

### G3 — Privacy Policy Page
**Status**: `[x]` Done
**Why**: Apple requires a privacy policy URL for App Store submission. Apps without one
are rejected. The policy must accurately describe what data is collected.
**Files**: new `app/privacy/page.tsx`, `app/settings/page.tsx`
**What to do**:
- Create `app/privacy/page.tsx` with a scrollable text page covering:
  - **Data storage**: All your travel clips, boards, and plans are stored locally on your
    device using IndexedDB. We do not have access to your data and do not store it on our servers.
  - **AI processing**: When you save a URL, the URL and page content are sent to Anthropic's
    Claude API to extract location and travel information. This data is processed under
    Anthropic's privacy policy and is not stored by TravelPanel.
  - **Analytics**: If PostHog is configured, anonymized usage events (clip count, plan count)
    are sent to PostHog. No personally identifiable information is included.
  - **No advertising**: We do not use advertising SDKs or sell data to advertisers.
  - **Contact**: jiangnan027@gmail.com
  - Last updated: June 2026
- Add "Privacy Policy" link in `app/settings/page.tsx` that navigates to `/privacy`
- Style as a clean document page with the app header and back navigation

### G4 — TestFlight Distribution Guide + Build Script
**Status**: `[x]` Done
**Why**: Without a documented build+distribute process, deploying updates to TestFlight
requires remembering a multi-step manual process every time. A script reduces this to
one command.
**Files**: new `scripts/build-ios.sh`, new `ios/App/TESTFLIGHT.md`
**What to do**:
- Create `scripts/build-ios.sh`:
  ```bash
  #!/bin/bash
  set -e
  echo "Building Next.js..."
  npm run build
  echo "Syncing Capacitor..."
  npx cap sync ios
  echo "Opening Xcode for archive..."
  open ios/App/App.xcworkspace
  echo "In Xcode: Product → Archive → Distribute App → App Store Connect → Upload"
  ```
  Mark executable with `chmod +x`
- Create `ios/App/TESTFLIGHT.md` with detailed step-by-step:
  1. Prerequisites: Xcode 15+, Apple Developer account, bundle ID `com.travelpanel.app`
  2. First-time setup: signing certificates, provisioning profile, App Store Connect app record
  3. Build process: run `npm run build:ios` (add this to `package.json` scripts as the
     build script above)
  4. Archive: Product → Archive in Xcode
  5. Distribute: Window → Organizer → Distribute App → App Store Connect → Upload
  6. TestFlight: in App Store Connect, select the build for TestFlight, add testers
  7. Screenshots required: 6.7" and 5.5" at minimum (iPhone 15 Pro Max and iPhone 8 Plus)
- Add `"build:ios": "bash scripts/build-ios.sh"` to `package.json` scripts

---

## PHASE H — Enrichment & Intelligence

### H1 — On-Device TF-IDF Search Improvement
**Status**: `[ ]` Not started
**Why**: The current `searchItems` function does simple substring matching. At 200+ clips
it misses plural/singular variations, returns noisy results, and has no relevance ranking.
TF-IDF with stemming produces dramatically better results without any server calls.
**Files**: `lib/searchItems.ts`
**What to do**:
- Rewrite `lib/searchItems.ts` with a proper relevance scoring approach:
  - Tokenize query into words, strip stop words ("the", "a", "in", "at", "to", etc.)
  - For each item, compute a score:
    - Title exact match: +10 per matched word
    - Title partial match: +5 per matched word
    - Description/substance content match: +3 per matched word
    - Tags match: +4 per matched tag
    - Location name match: +6 per matched location
  - Sort results by score descending; items with score 0 are excluded
  - Handle plural/singular: "cafes" should match "cafe" — simple `-s` and `-es` stripping
  - Highlight matched portions: return `{ item, highlights: string[] }` where highlights
    are the matched fragments for the query terms (used in search result display)
- Update `app/inbox/page.tsx` and `app/boards/[id]/page.tsx` to use the new scored results

### H2 — Enrichment Signals: Festival & Weather Dataset
**Status**: `[ ]` Not started
**Why**: This is the strategic differentiator over all AI travel chatbots per PRODUCT_STRATEGY.md.
A static dataset covers 80% of real trips in ~200 lines of data.
**Files**: new `lib/enrichmentData.ts`, `app/api/plan/route.ts`, `lib/types.ts`
**What to do**:
- Create `lib/enrichmentData.ts` with two exported arrays:
  1. `ANNUAL_EVENTS: AnnualEvent[]` — 60+ major events (see E5 for format and examples)
     including: Cherry Blossom Japan (Mar–Apr), Golden Week Japan (late Apr–early May),
     Obon Japan (Aug 13–16), Songkran Thailand (Apr 13–15), Diwali India (Oct–Nov),
     Carnival Brazil (Feb–Mar), Mardi Gras New Orleans (Feb–Mar), Oktoberfest Germany
     (late Sep–early Oct), Christmas markets Europe (Nov 27–Dec 24), Chinese New Year
     (Jan–Feb), Dragon Boat China (Jun), Eid Al-Fitr travel surge (varies), Ramadan
     (varies, note travel demand drops), Coachella Palm Springs (Apr), SXSW Austin (Mar),
     Glastonbury UK (Jun), Edinburgh Fringe (Aug), Holi India (Mar), Bali Nyepi (Mar),
     Hanami Tokyo (Mar–Apr), Fuji Rock Japan (Jul), Hong Kong Rugby Sevens (Apr),
     Singapore Formula 1 (Sep), Monaco Grand Prix (May), Thai Full Moon Party (monthly),
     Notting Hill Carnival London (Aug), La Tomatina Spain (Aug), Running of the Bulls
     Pamplona (Jul), Sapporo Snow Festival (Feb), Seoul Fashion Week (Mar/Oct),
     SE Asia monsoon warning (May–Oct for Vietnam/Thailand coast), typhoon season warning
     Japan/Taiwan (Aug–Oct), hurricane season Caribbean (Jun–Nov)
  2. `WEATHER_WINDOWS: WeatherWindow[]` — 30+ destinations with best/avoid months:
     format `{ destination: string, bestMonths: number[], avoidMonths: number[], reason: string }`
     including: Tokyo, Kyoto, Osaka, Bali, Bangkok, Singapore, Rome, Paris, Barcelona,
     Amsterdam, London, New York, LA, Maui, Sydney, Cape Town, etc.
- In `app/api/plan/route.ts`:
  - Extract destination names from boardItems
  - Match against events and weather windows using case-insensitive substring matching
  - If matches found, inject into the planner prompt as warnings
  - Add `enrichmentWarnings?: string[]` to `TripPlan` in `lib/types.ts`
  - In the plan output, render a "Heads-up" card at the top of the plan view when
    `plan.enrichmentWarnings` is non-empty

### H3 — B4 Vibe Search (Embedding Search via Supabase pgvector)
**Status**: `[ ]` Not started
**Needs**: Supabase pgvector from B1 (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
**Why**: "Minimalist cafe Tokyo with natural light" — the user can't find a saved clip
by title. Only semantic search across substance content can surface the right clip.
**Files**: new `lib/embeddings.ts`, `lib/searchItems.ts`, `lib/db.ts`, `lib/cloudSync.ts`
**What to do**:
- When B1 Supabase keys exist:
  - Add an `embedding` column to the `items` table in `supabase/schema.sql`: `embedding vector(1536)`
  - Create `lib/embeddings.ts`:
    ```typescript
    export async function embedText(text: string): Promise<number[]>
    // Calls POST /api/embed with the text; the route calls OpenAI text-embedding-3-small
    // (1536 dims, $0.002/1M tokens) or Anthropic if they add embeddings in future
    ```
  - Create `app/api/embed/route.ts` using OpenAI's embedding API (add `openai` to deps)
  - On clip save (in `app/share/page.tsx` after enrichment), generate embedding from
    `[title, description, substance.map(s => s.content).join(' ')].join(' ')` and push
    to Supabase
  - In `lib/searchItems.ts`, if query returns <3 keyword hits, fall back to a Supabase
    RPC call: `match_items(query_embedding, match_threshold: 0.7, match_count: 10)`
  - Add the `match_items` Postgres function to `supabase/schema.sql`

---

## PHASE I — Pro Features & Monetization

### I1 — Pro Tier Paywall (RevenueCat)
**Status**: `[ ]` Not started
**Needs**: RevenueCat account + Apple developer account for in-app purchases
**Why**: The product needs revenue. Usage data from TestFlight will inform which features
to gate. Placeholder: unlimited plan generations (currently capped at 5/day), unlimited
boards (soft cap), and cloud sync.
**Files**: new `lib/purchases.ts`, `app/settings/page.tsx`, relevant limit-check files
**What to do**:
- Install `@revenuecat/purchases-capacitor`
- Create `lib/purchases.ts` with `isPro(): Promise<boolean>`, `purchasePro()`,
  `restorePurchases()` wrappers
- In `app/api/plan/route.ts`, if `isPro()` is true, bypass the 5/day rate limit
- In `app/settings/page.tsx`, add a "TravelPanel Pro" section with: current status badge,
  "Upgrade" button (opens RevenueCat paywall), "Restore Purchases" button
- Pro features to gate: unlimited plan generations, unlimited boards (>10), cloud sync,
  plan export to PDF

### I2 — Push Notifications (On-Trip Reminders)
**Status**: `[ ]` Not started
**Needs**: `@capacitor/push-notifications`, backend notification service
**Why**: On-trip mode has no way to alert users when they're near a saved location.
Push notifications transform the app from passive to active.
**Files**: new `lib/notifications.ts`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Request push permission via `@capacitor/push-notifications` when user generates a plan
- On the morning of each planned day (based on the trip start date the user sets),
  send a local notification: "Day 2 of your [Board Name] trip — 5 activities planned"
- Use `@capacitor/local-notifications` for on-device scheduling (no backend needed)
- Add a "Trip start date" date picker to the plan view setup so notifications can be
  scheduled relative to actual travel dates

---

## Completed Tasks (Phases A–C)

*(All Phase A, B (except B4), and C tasks are complete. See git history.)*

### Phase A (all done)
- A1 Substance Extraction, A2 Enrichment Retry Queue, A3 PostHog Analytics,
  A4 AI Cost Guard, A5 Resource Request Notifications, A6 Pin Clustering,
  A7 Full-Text Search, A8 Onboarding Seed Boards, A9 Plan Export,
  A10 Multi-Version Plan Support, A11 Surface Substance (Wisdom view),
  A12 Thread Substance into Plans

### Phase B (B4 blocked, rest done)
- B1 Supabase Setup (scaffolded/dormant), B2 Browser Extension, B3 Xiaohongshu Fix,
  B5 Cloud Backup Export
- B4 Embedding Search — blocked on B1 keys (moved to H3)

### Phase C (all done)
- C1 On-Trip GPS Mode, C2 Post-Trip Timeline, C3 Shared Boards v1, C4 Proactive Resurfacing
