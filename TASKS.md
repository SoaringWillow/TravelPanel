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
**Why**: "Own the on-trip execution moment" — no competitor has touched this. When the user is actually traveling, the app should activate and guide them.  
**Files**: `hooks/useLiveLocation.ts` (new), `lib/geo.ts` (new), `components/TripModePanel.tsx` (new), `components/RouteMapView.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add a "Start Trip" button to the completed plan view
- `useLiveLocation`: React hook wrapping `navigator.geolocation.watchPosition`; returns `{ position, error, isTracking, start, stop }`
- `lib/geo.ts`: Haversine distance, `formatDistance`, `walkingMinutes(km)` helpers
- `TripModePanel`: bottom panel showing live GPS dot, nearest activity (with walk distance), and relevant substance tips from nearby clips. Stop button dismisses.
- `RouteMapView`: accept optional `userPosition` prop and render a pulsing blue "you are here" marker
- Plan page: wire `useLiveLocation` to `TripModePanel`, pass position to `RouteMapView`, auto-advance `activeDayIndex` to the day containing the nearest activity

### C2 — Post-Trip Timeline
**Status**: `[x]` Done  
**Why**: After a trip, users want to see what they actually did vs. what they planned. Creates reflection + habit reinforcement.  
**Files**: new `app/trips/[id]/timeline/page.tsx`, `lib/db.ts` (add `visitedAt` to Activity)  
**What to do**:
- "Mark as visited" button on each activity during Trip Mode (C1)
- Post-trip Timeline page shows a vertical timeline of visited activities with timestamps
- Show the substance tips that were cited for each activity

### C3 — Shared Boards v1
**Status**: `[ ]` Not started  
**Why**: Collaborative trip planning and social proof. Blocked by cloud auth (B1).  
**Needs**: Supabase auth from B1  
**What to do**: Generate a read-only share link for a board; recipient sees a read-only map + clip list

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started  
**Why**: "You're near a saved spot" push notifications when the user is physically near a clipped location  
**Needs**: iOS push notification entitlement, Supabase for user targeting  
**What to do**: Background location check on app foreground; if within 500m of a saved location, show a banner with the clip's substance tips

---

## PHASE D — iOS Polish & App-Store Readiness

### D1 — Offline Banner
**Status**: `[x]` Done  
**Why**: The app is local-first but gives no feedback when offline. Users who lose signal mid-plan think the app is broken.  
**Files**: `components/OfflineBanner.tsx` (new), `app/layout.tsx`  
**What to do**:
- Hook into `navigator.onLine` + `online`/`offline` events
- Show a subtle banner at the top when offline: "No internet — your clips are still available"
- Animate in/out smoothly; dismiss automatically when reconnected

### D2 — Haptic Feedback (iOS)
**Status**: `[x]` Done  
**Why**: Native iOS apps feel distinctly different due to haptics on key taps. This single feature makes the app feel "real" on device.  
**Files**: `lib/haptics.ts` (new), then call on save, mark-visited, board-create, delete  
**What to do**:
- Create `lib/haptics.ts` with `triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error')` using `@capacitor/haptics` if available, no-op in browser
- Add haptic feedback on: clip saved (success), mark visited (success), delete (heavy), button taps on primary actions (light)

### D3 — Pull-to-Refresh on Inbox
**Status**: `[x]` Done  
**Why**: iOS users expect pull-to-refresh to trigger data reload. Without it, stale enrichment status isn't visible.  
**Files**: `app/inbox/page.tsx`, `hooks/useSavedItems.ts`  
**What to do**:
- Add `@capacitor/push-notifications`-independent pull-to-refresh gesture using touch events
- On pull: trigger retry of all `failed`/`pending` enrichments, update item list

### D4 — App Icon & Launch Screen Assets
**Status**: `[x]` Done  
**Why**: Required for App Store submission. The current icon is a generic Capacitor placeholder.  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `ios/App/App/Assets.xcassets/LaunchScreen.storyboard`  
**What to do**:
- Generate a full set of iOS app icons (20px–1024px) from the TravelPanel teal/pin design
- All sizes: 20x20@2x, 20x20@3x, 29x29@2x, 29x29@3x, 40x40@2x, 40x40@3x, 60x60@2x, 60x60@3x, 1024x1024@1x
- Use the same green-teal (#0D9488) + white pin design as the browser extension icon
- Create a simple launch screen with centered logo on white background

### D5 — Virtualized Inbox for Large Collections
**Status**: `[x]` Done  
**Why**: At 100+ clips the inbox scrolls slowly on older iPhones because all cards render at once.  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Replace flat list with windowed rendering: render only visible + 2-page buffer
- Use `IntersectionObserver` to load more clips as user scrolls
- Show a "Loading more…" skeleton at bottom while batch loads

### D6 — Share Extension: Improved UI
**Status**: `[x]` Done  
**Why**: The current share page is functional but not beautiful. It should look premium to convert first-time share actions.  
**Files**: `app/share/page.tsx`  
**What to do**:
- Add a hero thumbnail (OG image) preview above the board picker
- Show a subtle skeleton/shimmer while enrichment runs instead of the plain spinner text
- Add subtle spring animations on board chip selection

---

## PHASE E — iOS Beauty & UX Excellence (New Sprint)

> Goal: ship an App Store-quality experience. Every task here is self-contained and unblocked.

### E1 — Swipe-to-Delete / Swipe-to-Move on Inbox Cards
**Status**: `[x]` Done  
**Why**: iOS users expect swipe gestures on list items. The current always-visible button row wastes card real estate and feels un-native.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Add horizontal swipe gesture to InboxCard using touch events (touchstart/touchmove/touchend)
- Swipe left >60px: reveal a red Delete button and an indigo Move button on the right edge
- Swipe right >60px: reveal a teal "View on Map" shortcut on the left edge
- Spring-snap back if released below threshold; commit reveal if past threshold
- Tap revealed button to execute action; tap anywhere else to dismiss
- Remove or collapse the bottom action row (save space) — keep the actions accessible but behind gesture

### E2 — Inline Clip Editing
**Status**: `[x]` Done  
**Why**: There is currently no way to edit a saved clip's title, description, or tags. A simple typo in the extracted title is stuck forever.  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add an "Edit" button (pencil icon) to LocationDetailCard header
- In edit mode: title and description become `<textarea>` inputs; tags show a remove (×) chip per tag plus a small text input to add new tags
- "Save" persists via `saveItem()` to IndexedDB and refreshes the parent item list
- "Cancel" discards changes
- Keep edit mode within the existing bottom sheet — no separate page needed

### E3 — Dark Mode (System-Aware)
**Status**: `[ ]` Not started  
**Why**: iOS users expect dark mode. The entire UI is light-only, making night use uncomfortable.  
**Files**: `app/layout.tsx`, `tailwind.config.ts`, all major components  
**What to do**:
- Enable Tailwind `darkMode: 'class'` and install `next-themes`
- Add `ThemeProvider` in `app/layout.tsx` with `attribute="class" defaultTheme="system"`
- Add `dark:` variants to all major components: NavBar, InboxCard, LocationDetailCard, BoardCard, MapView overlay, plan page, settings page
- Dark palette: bg-gray-950 body, bg-gray-900 cards, bg-gray-800 inputs, white text
- Keep the teal/indigo accent colors — they work on both light and dark
- The map itself already works dark (MapLibre tiles are unchanged)

### E4 — Clipboard URL Quick-Import
**Status**: `[ ]` Not started  
**Why**: Power users often copy a link in another app, then switch to TravelPanel. Detecting and offering the clipboard URL turns a 5-tap flow into 1 tap.  
**Files**: `app/page.tsx`, `components/ClipboardBanner.tsx` (new), `lib/haptics.ts`  
**What to do**:
- On app focus (Capacitor App `appStateChange` with isActive=true), read clipboard via `navigator.clipboard.readText()`
- If clipboard contains a recognisable travel URL (instagram, youtube, tiktok, xiaohongshu, maps, etc.), show a dismissible amber banner at the top: "Clip from clipboard? [platform] link detected → Import"
- Tapping "Import" opens ImportSheet with the URL pre-filled
- Dismiss stores the URL in sessionStorage so the same URL doesn't prompt twice
- Falls back gracefully if clipboard permission is denied (no banner shown)

### E5 — Board Cover Art from Clip Thumbnails
**Status**: `[ ]` Not started  
**Why**: Board cards are currently identified only by emoji + name. A visual cover image (from a saved clip) makes the boards page scannable at a glance.  
**Files**: `components/BoardCard.tsx`, `app/boards/page.tsx`, `lib/db.ts`, `lib/types.ts`  
**What to do**:
- Add `coverThumbnail?: string` to the `Board` type and store it in IndexedDB
- Auto-set on board creation: use the thumbnail of the first clipped item that has one
- When items are added to a board: if coverThumbnail is unset and the new item has a thumbnail, set it
- BoardCard: show the thumbnail as a full-bleed background image behind the emoji+name; use a dark-to-transparent gradient overlay so the text remains legible
- If no thumbnail: keep the current solid-colored gradient card

### E6 — Keyboard Avoidance on iOS
**Status**: `[ ]` Not started  
**Why**: On iOS, the virtual keyboard overlaps bottom-anchored input fields. Plan notes, new-board input, and search bars become inaccessible when the keyboard opens.  
**Files**: `hooks/useKeyboardHeight.ts` (new), `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `hooks/useKeyboardHeight.ts`: uses `window.visualViewport` resize event to detect keyboard height, returns `keyboardHeight` number
- In `app/share/page.tsx`: apply `paddingBottom: keyboardHeight` to the bottom-pinned button when keyboard is open
- In plan page notes textarea: scroll the textarea into view on focus using `element.scrollIntoView({ behavior: 'smooth' })`
- On the board chip bottom sheet in inbox/share: shift it up by `keyboardHeight` when the new-board name input is focused

### E7 — App Review Prompt (Post-Save)
**Status**: `[ ]` Not started  
**Why**: App Store rating drives organic downloads. Prompt users after they've proven value — 5+ successful clip saves is the right moment.  
**Files**: `app/share/page.tsx`, `lib/analytics.ts`  
**What to do**:
- After a successful clip save, check `localStorage.getItem('clipSaveCount')` and increment
- When count hits 5 (and once only — set `reviewPrompted: true` in localStorage), try `window.plugins?.StoreReview?.requestReview()` (Capacitor community plugin)
- If the plugin is unavailable (browser), skip silently
- Track `review_prompt_shown` event via analytics

### E8 — Smart Inbox Sorting
**Status**: `[ ]` Not started  
**Why**: The inbox currently shows clips in save-order with no ability to sort or group. At 50+ clips this is overwhelming.  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Add a sort control below the search bar (icon button that opens a popover): "Newest first" (default), "Oldest first", "By platform", "Unprocessed first"
- Add a "Group by platform" toggle that inserts sticky section headers
- Persist the user's sort preference to `localStorage`
- The sort/group applies client-side on top of the existing filter+search pipeline

### E9 — Plan Day Drag-to-Reorder Activities
**Status**: `[ ]` Not started  
**Why**: The AI-generated day order is often imperfect. Users want to move activities between days or reorder within a day without regenerating the whole plan.  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`  
**What to do**:
- Add drag handles (⠿ gripper icon) to each activity row in DayStripCard
- Use `@dnd-kit/sortable` for drag-and-drop within a day
- Support cross-day drag: dragging an activity off the bottom of a day inserts it at the top of the next
- After reorder, update the in-memory plan state and the saved Trip in IndexedDB
- Show a subtle "Plan edited" badge to indicate the plan has diverged from the AI version

### E10 — Performance: Memoize Card Components
**Status**: `[ ]` Not started  
**Why**: InboxCard and BoardCard re-render on every parent state change (e.g., search query updates). With 100+ clips, this causes noticeable scroll jank.  
**Files**: `components/InboxCard.tsx`, `components/BoardCard.tsx`, `components/DayStripCard.tsx`  
**What to do**:
- Wrap InboxCard, BoardCard, and DayStripCard in `React.memo` with a proper equality comparison
- `useCallback` all handler closures passed as props in `app/inbox/page.tsx` and `app/boards/page.tsx`
- Verify with React DevTools Profiler that re-renders are eliminated (add a comment with the finding)
- No visual changes — this is a silent perf win

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
