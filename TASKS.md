# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Status: All Phase A–C tasks complete as of 2026-06-04

The core feature set is built. The app can clip, enrich, plan, export, search (keyword + vibe), track GPS, share boards, and resurface relevant content. The next sprint focuses on **making it feel like a native iOS app** — polish, smoothness, and filling the remaining functional gaps.

---

## ⭐ Recommended Execution Order (Phase D)

`D1 → D2 → D3 → D5 → D6 → D7 → D8 → D4 → D9 → D10 → D11 → D12 → D13 → D14 → D15`

---

## PHASE D — Beautiful & Native iOS (Polish Sprint)

### D1 — Skeleton Screen Loading Cards 🔴 HIGHEST IMPACT
**Status**: `[x]` Complete  
**Why**: The app shows bare spinners while data loads. Skeleton screens make it feel instant and premium — this is the #1 visual polish change.  
**Files to change**: `components/InboxCard.tsx`, `components/BoardCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create a `SkeletonCard` component that mirrors the InboxCard shape with animated pulse shimmer (Tailwind `animate-pulse` on gray rectangles)
- Render 6 skeleton cards in a 2-col grid while `loading === true` in the inbox and boards pages
- Do NOT use a spinner — replace all list-view spinners with skeletons
- Keep the detail-view spinner for the plan/trip pages (skeleton is harder there)

### D2 — Swipe-to-Delete on Inbox Cards 🔴 HIGH PRIORITY
**Status**: `[x]` Complete  
**Why**: The current delete flow requires opening a menu. Swipe-to-delete is a core iOS pattern and makes clip management feel native.  
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Wrap each InboxCard in a swipeable container using `framer-motion` drag gesture (dragConstraints, dragDirectionLock)
- Swipe left > 80px: reveal a red "Delete" action strip under the card
- Swipe left > 160px (full): auto-confirm delete (with a brief shake animation)
- Swipe right: reveal "Move to Board" action (blue)
- Provide a spring-back animation if the user doesn't commit the swipe
- Keep existing tap behavior (open detail) intact

### D3 — Pull-to-Refresh on Lists
**Status**: `[x]` Complete  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add pull-to-refresh using touch events (overscroll detection) on the scrollable list containers
- On pull release: call the existing `refresh()` hook, show a small spinning indicator at top of list
- On iOS (Capacitor), disable the native overscroll bounce when pull-to-refresh is active to avoid double-bounce
- Trigger enrichment retry for any `pending`/`failed` items during refresh

### D4 — Dark Mode Support
**Status**: `[ ]` Not started  
**Files to change**: `app/globals.css`, `app/layout.tsx`, multiple component files  
**What to do**:
- Enable Tailwind's `dark:` variant (set `darkMode: 'media'` in tailwind config or `class` for manual toggle)
- Add dark variants to all major components: backgrounds (`dark:bg-gray-900`), text (`dark:text-gray-100`), borders (`dark:border-gray-700`), cards (`dark:bg-gray-800`)
- Map header and NavBar should get dark backgrounds
- Test: map tiles from OpenFreeMap are already dark-neutral
- Add a dark mode toggle button to the settings page

### D5 — Edit Clip Metadata (Title + Notes + Tags)
**Status**: `[x]` Complete  
**Why**: Currently clips can only be deleted. Users need to correct titles, add personal notes, and adjust tags.  
**Files to change**: `components/LocationDetailCard.tsx`, `lib/db.ts`, `lib/types.ts`  
**What to do**:
- Add a `notes?: string` field to `SavedItem` in `lib/types.ts` (update DB migration to v3)
- Add an "Edit" button (pencil icon) to `LocationDetailCard` that opens an inline edit mode
- In edit mode: editable title field, multi-line notes textarea, tag chips with add/remove
- Save button writes back to IndexedDB via `saveItem()`
- Cancel discards changes without confirmation
- Keep edit mode state local to the component (no extra prop drilling)

### D6 — Duplicate URL Detection
**Status**: `[x]` Complete  
**Why**: Users accidentally save the same URL multiple times. Each duplicate wastes an API call and clutters the library.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- Before saving a new item, check if any existing item has the same `url` (case-insensitive, strip trailing slash)
- Add `getItemByUrl(url: string)` to `lib/db.ts` (scan the items store)
- If a duplicate is found: show a warning banner "You already saved this!" with a link to the existing clip
- User can still force-save if they want (e.g., to assign to a different board)
- Skip duplicate check for `isDemo` items

### D7 — Board Cover Photo Editor
**Status**: `[x]` Complete  
**Files to change**: `app/boards/[id]/page.tsx`, `lib/db.ts`  
**What to do**:
- Show the board cover thumbnail at the top of the board detail page (full-width banner, ~180px tall, object-cover)
- If no cover thumbnail: show the board emoji on a gradient background (use the indigo/violet gradient)
- Add a "Change cover" button (camera icon) that opens a grid picker of thumbnails from the board's clips
- Selecting a thumbnail updates `board.coverThumbnail` via `saveBoard()`

### D8 — Tag Filter Chips on Map
**Status**: `[ ]` Not started  
**Files to change**: `app/page.tsx`, `components/MapView.tsx`  
**What to do**:
- Add a horizontally scrollable row of tag filter chips below the top bar on the map (appears only when clips have tags)
- Chips: "All", then unique tags from all clips (sorted by frequency)
- When a tag is active: MapView only renders pins for items that include that tag
- Active chip has indigo background, inactive is white/gray
- "All" chip deselects current filter
- Position the chip row between the top bar and map (floating, with backdrop blur)

### D9 — Haptic Feedback (iOS)
**Status**: `[ ]` Not started  
**Files to change**: `app/share/page.tsx`, `components/InboxCard.tsx`, `app/page.tsx`  
**What to do**:
- Create a `lib/haptics.ts` wrapper around `@capacitor/haptics` that no-ops on web/desktop
- Trigger light impact on: saving a clip, selecting a board chip, tapping a map pin
- Trigger medium impact on: successful plan generation, completing export
- Trigger notification (success) on: enrichment done
- Guard all calls with `Capacitor.isNativePlatform()` to avoid errors on web

### D10 — Improved Empty States with Illustrations
**Status**: `[ ]` Not started  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Replace the "📥 Your inbox is empty." text with a richer empty state:
  - Large inline SVG illustration (abstract travel-themed: map, pins, compass)
  - Bold headline + 2-line sub-copy
  - A primary CTA button ("Save your first clip" → opens share flow)
- Boards empty state: "Create your first collection" with a + New Board CTA
- Plan empty state: "No locations to plan" with instructions to add clips with locations

### D11 — "When to Visit" Insight Card
**Status**: `[ ]` Not started  
**Files to change**: `components/LocationDetailCard.tsx`, `lib/types.ts`  
**What to do**:
- Parse the `substance` array for season/timing wisdom (look for context items with "best time", "avoid", "peak season")
- Extract and display a "Best time to visit" summary in the detail card (below the substance list)
- Format: a small row of month indicators (Jan–Dec) colored to show peak (green), avoid (red), OK (gray) based on substance content
- Use a simple regex/keyword approach: don't call Claude for this

### D12 — Budget Tier Tag
**Status**: `[ ]` Not started  
**Files to change**: `app/api/import/route.ts`, `lib/types.ts`, `components/InboxCard.tsx`  
**What to do**:
- Extend the import schema with `budgetTier: 'budget' | 'mid-range' | 'splurge' | null`
- Claude infers this from substance items mentioning prices, "expensive", "affordable", "michelin", "cash only" etc.
- Show a small $ / $$ / $$$ badge on InboxCard and LocationDetailCard
- Add budget filter to the inbox filter chips (alongside platform filters)

### D13 — Nearby Clips Suggestion in Detail Card
**Status**: `[ ]` Not started  
**Files to change**: `components/LocationDetailCard.tsx`  
**What to do**:
- At the bottom of LocationDetailCard, show up to 3 "Also nearby" clips (other saved items with a location within 5km)
- Use haversine distance from `hooks/useGeolocation.ts` to compute
- Show as a small horizontal scroll of mini-cards (thumbnail + name + distance)
- Tapping a nearby card opens that item's detail card

### D14 — Virtual Scroll for Large Lists (>100 items)
**Status**: `[ ]` Not started  
**Why**: Loading all items at once causes jank when a user has 200+ clips.  
**Files to change**: `app/inbox/page.tsx`  
**What to do**:
- Implement windowed rendering: only render items that are within 2x viewport height of the scroll position
- Use `IntersectionObserver` or a simple offset-based approach (avoid external lib unless already in deps)
- Maintain scroll position on re-filter (don't jump to top if filter doesn't change the visible window)
- Show a "Load more" button or auto-load when scrolled to 80% of rendered list

### D15 — App Review Prompt (iOS)
**Status**: `[ ]` Not started  
**Files to change**: `lib/db.ts` or new `lib/appReview.ts`, `app/share/page.tsx`  
**What to do**:
- After a user successfully saves their 10th clip (non-demo), prompt for an App Store review
- Use `@capacitor-community/app-review` plugin (check if available) or a custom modal
- Only show once per app lifetime (store flag in IndexedDB or localStorage)
- Timing: show 1.5 seconds after the save success screen, before auto-dismiss
- On web/non-native: no-op

---

## PHASE E — Cloud & Social (Requires Supabase)

### E1 — Activate Supabase Sync (B1 completion)
**Status**: `[ ]` Not started  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**What to do**: Create Supabase project, run `supabase/schema.sql`, add sign-in UI, wire `syncNow()` on auth

### E2 — Google OAuth Sign-In
**Status**: `[ ]` Not started  
**Needs**: Supabase (E1 done) + Google OAuth app in Supabase dashboard  
**What to do**: Add sign-in with Google button to settings page, wire Supabase auth session

### E3 — Real-Time Shared Boards (upgrade C3)
**Status**: `[ ]` Not started  
**Needs**: Supabase (E2 done)  
**What to do**: Replace snapshot-sharing (C3) with Supabase RLS-gated real-time shared boards

### E4 — pgvector Semantic Search (upgrade B4)
**Status**: `[ ]` Not started  
**Needs**: Supabase with pgvector extension  
**What to do**: Replace Claude query expansion (B4) with true embedding search using Supabase pgvector

### E5 — Push Notifications (upgrade C4)
**Status**: `[ ]` Not started  
**Needs**: Supabase + `@capacitor/push-notifications`  
**What to do**: Replace in-app resurfacing (C4) with daily push notification digest

---

## Completed Tasks (Phases A–C)

All Phase A (A1–A12), Phase B (B1–B5), and Phase C (C1–C4) tasks are complete.
See git log for implementation details.
