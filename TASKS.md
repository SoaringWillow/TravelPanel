# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Status as of 2026-06-04

Phases A–C complete. B4 (Embedding/Vibe Search) blocked on Supabase pgvector keys.
This queue focuses on iOS quality, polish, and App Store readiness.

---

## PHASE D — iOS Quality & Polish (Current Sprint)

### D1 — Notes on Clips
**Status**: `[x]` Complete  
**Why**: The single most common user request for a save-later app. Users need to annotate clips with personal context ("this was the one my friend recommended") and planning notes ("need to book 2 weeks in advance"). Without this, the app feels read-only.  
**Files to change**: `lib/types.ts` (already has `notes?: string` on `SavedItem`), `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- In `LocationDetailCard`, add an editable notes section at the bottom
- A tappable "Add a note…" placeholder that expands to a textarea
- Auto-save on blur (debounced 800ms) via `updateItemField(id, { notes })` in db.ts
- Show a small notes preview (first 60 chars) in `InboxCard` when notes exist
- Style with a subtle yellow/amber accent to distinguish from AI-extracted content

### D2 — Tags Filter in Inbox
**Status**: `[x]` Complete  
**Why**: Users with 50+ clips can't navigate by theme. Tags (food, nature, culture, etc.) are already extracted by Claude but not surfaced as filters. This unlocks the clip library.  
**Files to change**: `app/inbox/page.tsx`, `components/TagFilterBar.tsx` (new)  
**What to do**:
- Build `TagFilterBar`: a horizontally scrollable pill row showing all unique tags across inbox items
- Tags sorted by frequency (most common first), max 15 tags shown
- Active tag highlighted in indigo, clicking again deselects
- Filter items to those whose `tags` array includes the selected tag
- Tag filter and platform filter should compose (AND logic)
- Show tag counts: "food (12)"

### D3 — Clip Editing (title + thumbnail)
**Status**: `[x]` Complete  
**Why**: Claude sometimes extracts a wrong or awkward title. Users need to correct it. Also, some clips have no thumbnail — users should be able to set one from the source URL.  
**Files to change**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- In `LocationDetailCard`, make the title tappable/editable (inline edit with a pencil icon)
- Save on blur or Enter key via `updateItemField(id, { title })`
- Add a `updateItemField(id, fields)` helper to `lib/db.ts` for partial updates
- Show "Re-extract" button that re-runs `/api/import` and merges new data (keeps user edits to title/notes)

### D4 — Haptic Feedback (iOS native feel)
**Status**: `[x]` Complete  
**Why**: Every iOS user expects haptic feedback. Without it the app feels like a web page rather than a native app. Capacitor has a haptics plugin that's already listed in the project.  
**Files to change**: new `lib/haptics.ts`, `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `tapLight()`, `tapMedium()`, `tapSuccess()`, `tapWarning()` wrappers around `@capacitor/haptics` that no-op on web
- Add haptics to key interactions:
  - Light tap: selecting a board chip, toggling a preference chip
  - Medium tap: clip saved ("Saved to Inbox!")
  - Success notification: plan generation complete, trip stop marked as visited
  - Warning: rate limit hit, enrichment failed

### D5 — Loading Skeletons
**Status**: `[x]` Complete  
**Why**: Spinning circles feel unpolished. Skeleton loaders communicate structure and make waits feel shorter. Essential for App Store-quality feel.  
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/timeline/page.tsx`  
**What to do**:
- Build a `Skeleton` base component (animated shimmer gradient) in `components/ui/skeleton.tsx` (may already exist from shadcn — check first)
- Build `InboxCardSkeleton`: mimics the card shape with shimmer title, thumbnail area, tag pills
- Replace all spinner divs in inbox, boards list, and timeline with skeleton grids
- Keep spinners only for async actions (plan generation, enrichment)

### D6 — Improved Onboarding Flow
**Status**: `[x]` Complete  
**Why**: New users see an empty map with a FAB and no context. The seed boards help but there's no narrative. App Store reviewers + first-time users need a clear first-run experience.  
**Files to change**: new `components/OnboardingOverlay.tsx`, `app/page.tsx`  
**What to do**:
- On first launch (check `localStorage.getItem('onboardingComplete')`), show a full-screen overlay
- 3 slides with forward/back navigation:
  1. "Save travel inspiration" — show the Share icon, explain the iOS share sheet
  2. "AI extracts the wisdom" — show a clip card with substance items highlighted
  3. "Plan your trip" — show the planner generating a route
- Each slide has a large visual (emoji illustration), title, 1-sentence body text
- Final slide: "Let's go!" CTA that sets `onboardingComplete` and dismisses
- Slide progress dots at the bottom
- Skip link in the top-right corner

### D7 — Dark Mode Support
**Status**: `[x]` Complete  
**Why**: iOS users expect dark mode. Without it the app burns white in bed. The tailwind config must enable `class` strategy, and key components need `dark:` variants.  
**Files to change**: `tailwind.config.ts`, `app/globals.css`, major components  
**What to do**:
- Enable `darkMode: 'class'` in tailwind config
- Add dark mode CSS variables to `globals.css` (shadcn dark theme variables)
- Add a `useTheme` hook that reads `prefers-color-scheme` and `localStorage` preference
- Add `dark:` variants to: NavBar, InboxCard, LocationDetailCard, MapView overlay, Settings page
- In `CapacitorBridge`: call `StatusBar.setStyle({ style: Style.Dark })` when dark mode active
- Settings page: add a theme toggle (System / Light / Dark)

### D8 — Drag-to-Reorder Clips in Boards
**Status**: `[ ]` Not started  
**Why**: Users organize boards deliberately. Being able to reorder clips within a board is expected functionality for a collection app.  
**Files to change**: `app/boards/[id]/page.tsx`, `lib/db.ts`  
**What to do**:
- Install `@dnd-kit/core` and `@dnd-kit/sortable`
- Replace the static grid in board detail with a `SortableContext` grid
- Each card becomes a draggable item with `useSortable`
- On drag end, update `board.itemIds` array order in IndexedDB
- Add a `reorderBoardItems(boardId, newItemIds)` function to `lib/db.ts`
- Use touch sensors for iOS compatibility (longpress to activate drag)

### D9 — Nearby Clips Discovery
**Status**: `[ ]` Not started  
**Why**: When users are physically traveling, the app should surface clips near their current location. This closes the loop between saving inspiration and acting on it.  
**Files to change**: `app/page.tsx`, `components/NearbyBanner.tsx` (new)  
**What to do**:
- On the main map page, add a "Nearby" button in the floating top bar
- When tapped, request GPS permission and fly the map to current location
- Highlight pins within 10km in a distinct color/size
- Show a bottom drawer with a list of nearby clips sorted by distance
- Use `haversineKm` from `lib/distance.ts` for distance calculation
- Show distance badge on each nearby clip card ("0.8 km away")

### D10 — Trip Budget Tracker
**Status**: `[ ]` Not started  
**Why**: Users planning trips need cost estimation. Adding budget tracking to the planner makes it a complete trip planning tool.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `lib/types.ts`, `app/api/plan/route.ts`  
**What to do**:
- Add `estimatedCost?: { amount: number; currency: string }` to `Activity` type
- Update the planner prompt to estimate cost per activity (low/medium/high bracket with a number)
- In the plan view, show a budget summary card: total estimated cost, per-day breakdown
- Allow users to set a "trip budget" input before generating
- Activities that exceed daily budget average are flagged with a "💸" warning
- Simple currency: default USD, user can type their currency code

---

## PHASE E — Performance, Scale & Distribution

### E1 — Virtualized Clip List (200+ clips)
**Status**: `[ ]` Not started  
**Why**: At 200+ clips, the DOM becomes too heavy. Must paginate or virtualize.  
**What to do**: Use `@tanstack/react-virtual` to virtualize the inbox grid; keep scroll position on re-renders.

### E2 — Offline Thumbnail Caching
**Status**: `[ ]` Not started  
**Why**: Thumbnails from og:image URLs disappear offline. Cache them in IndexedDB as data URIs for offline use.  
**What to do**: After enrichment, fetch the thumbnail URL and store it as a base64 data URI on the `SavedItem`.

### E3 — Web Push Notifications
**Status**: `[ ]` Not started  
**Why**: "Your 5 Tokyo clips are ready to plan" is the core re-engagement hook.  
**What to do**: Register a service worker push subscription; send notifications via the surfacing logic when the user has 3+ clips in a location cluster for more than 7 days.

### E4 — Supabase Full Activation
**Status**: `[ ]` Blocked on keys  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**What to do**: Activate the existing `lib/supabase.ts` + `lib/cloudSync.ts` scaffold. Add sign-in UI (magic link). Wire `syncNow()` on auth-state change and app focus.

### E5 — Embedding/Vibe Search
**Status**: `[ ]` Blocked on E4  
**Needs**: Supabase pgvector  
**What to do**: Embed clip descriptions + substance text on save; semantic search via pgvector similarity.

### E6 — iOS App Icon Generation Guide
**Status**: `[ ]` Not started  
**What to do**: Create `ios/App/App/Assets.xcassets/AppIcon.appiconset/generate.js` that generates all required iOS icon sizes (20×20 to 1024×1024) from the SVG source in `browser-extension/icons/`. Write a one-command setup guide in `ios/App/ShareExtension/XCODE_SETUP.md`.

---

## PHASE F — Monetisation Readiness

### F1 — Pro Tier Gate (Paywall Scaffold)
**Status**: `[ ]` Not started  
**What to do**: Add a `isPro` flag to local storage. Gate plan generation beyond 3 plans/day and unlimited enrichments. Show a "TravelPanel Pro" upgrade sheet (no payment integration yet — just the scaffold).

### F2 — Revenue Cat / StoreKit Integration
**Status**: `[ ]` Not started  
**Needs**: Apple Developer account + Capacitor Purchase plugin  
**What to do**: Wire `@capgo/capacitor-purchases` (RevenueCat SDK) for in-app subscriptions. Activate the Pro gate from F1.

---

## Completed Tasks

### Phase A — Bug-Free MVP
- A1 ✅ Substance extraction (2-layer clip schema)
- A2 ✅ Enrichment retry queue
- A3 ✅ PostHog analytics
- A4 ✅ AI cost guard
- A5 ✅ In-app resource request notifications
- A6 ✅ Pin clustering at low zoom
- A7 ✅ Full-text search on clips
- A8 ✅ Onboarding seed boards
- A9 ✅ Plan export (PDF + Calendar)
- A10 ✅ Multi-version plan support
- A11 ✅ Substance wisdom view in clip detail
- A12 ✅ Substance threaded into trip plans

### Phase B — Cloud Sync + Auth
- B1 ✅ Supabase scaffolded (dormant until keys)
- B2 ✅ Browser extension (Chrome/Safari clipper)
- B3 ✅ Xiaohongshu fix (Claude Vision for image payloads)
- B4 ⏸ Embedding/Vibe Search (blocked, moved to E5)
- B5 ✅ Cloud backup export + settings page

### Phase C — On-Trip Mode
- C1 ✅ On-trip GPS mode with live location tracking
- C2 ✅ Post-trip journal / timeline page
- C3 ✅ Shared boards v1 (shareable links + one-tap import)
- C4 ✅ Proactive resurfacing ("For You" nudge bar)
