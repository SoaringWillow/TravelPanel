# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ✅ Completed Phases (A → C)

All Phase A (Bug-Free MVP), Phase B (Cloud Sync + Browser Extension), and Phase C (On-Trip Mode) tasks are complete as of 2026-06-09. See git history for implementation details.

**Phase B4** (Embedding/Vibe Search) remains dormant — needs Supabase pgvector + keys.
**Phase B1** (Supabase Cloud Sync) is scaffolded — activates when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided.

---

## ⭐ Recommended Execution Order (Phase D onward)

Goal: **beautiful, fully-functional native iOS app** that wins on capture ease + substance depth.

`D1 → D2 → D3 → D4 → D5 → E1 → E2 → E3 → F1 → F2 → F3`

---

## PHASE D — iOS Native Polish & Visual Excellence

### D1 — Skeleton Loading States + Pull-to-Refresh
**Status**: `[x]` Done  
**Why**: The clip grid currently shows empty space while loading. Skeletons feel instant and premium. Pull-to-refresh is the standard iOS refresh pattern.  
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/[id]/page.tsx`  
**What to do**:
- Create a `SkeletonCard.tsx` that matches InboxCard dimensions — animated shimmer (CSS `@keyframes shimmer` from-gray-100 to-gray-200 via white)
- Show 6 skeleton cards during the first load of the inbox and board detail pages
- Add `usePullToRefresh` hook: listens for touch-start/move/end, shows a spinner at the top when pulled >60px, calls `refetch()` on release
- Wire pull-to-refresh to `useSavedItems` to re-read IndexedDB (mostly instant but reassures user)

### D2 — Dark Mode Support
**Status**: `[ ]` Not started  
**Why**: iOS users expect dark mode. Currently the app is hardcoded light-only.  
**Files to change**: `app/layout.tsx`, `app/globals.css`, most components  
**What to do**:
- Add `class="dark"` support via Tailwind's `darkMode: 'class'` (already the default)
- Add `useEffect` in `app/layout.tsx` that reads `prefers-color-scheme` and sets `document.documentElement.classList.toggle('dark', isDark)`
- Audit all hard-coded white/gray backgrounds in components and replace with Tailwind dark: variants:
  - `bg-white` → `bg-white dark:bg-gray-900`
  - `bg-gray-50` → `bg-gray-50 dark:bg-gray-950`
  - `text-gray-900` → `text-gray-900 dark:text-gray-100`
  - etc.
- Add a dark-mode toggle to the Settings page (Light / Dark / Auto)
- Persist preference in localStorage

### D3 — Haptic Feedback on Key Interactions
**Status**: `[ ]` Not started  
**Why**: Haptics are the signature of premium iOS apps. Every key action should have the right feedback.  
**Files to change**: `app/share/page.tsx`, `components/InboxCard.tsx`, `components/NearMeSheet.tsx`  
**What to do**:
- Create `lib/haptics.ts` with a wrapper: `impact(style: 'light'|'medium'|'heavy')` and `notification(type: 'success'|'warning'|'error')` — uses `Capacitor.Plugins.Haptics` when in native context, no-ops in browser
- Import `@capacitor/haptics` (`npm install @capacitor/haptics`)
- Trigger `impact('medium')` on: saving a clip, adding to a board
- Trigger `notification('success')` on: share page done state
- Trigger `impact('light')` on: opening a clip detail card, tapping a map pin
- Trigger `notification('error')` on: enrichment failed state

### D4 — Offline Mode Banner + Graceful Degradation
**Status**: `[ ]` Not started  
**Why**: The app stores data locally (IndexedDB) but silently fails API calls offline. Users don't know if their clip is being processed.  
**Files to change**: `app/layout.tsx`, new `components/OfflineBanner.tsx`, `app/share/page.tsx`  
**What to do**:
- Create `hooks/useOnlineStatus.ts`: listens to `navigator.onLine` and window `online`/`offline` events
- Create `components/OfflineBanner.tsx`: a slim yellow bar at the top ("No internet — clips save locally and enrich when reconnected")
- Show the banner in `app/layout.tsx` when offline
- In `app/share/page.tsx`: if offline when user tries to save, still create the item (with `enrichmentStatus: 'pending'`) and show "Saved! Will extract details when online." — don't fail
- In `lib/enrichItem.ts`: check online status before calling API; queue for retry if offline (write a `retryEnrichment()` that fires on the `online` event)

### D5 — Duplicate URL Detection
**Status**: `[ ]` Not started  
**Why**: Users forget they already saved a URL. The share flow should detect duplicates and offer to view the existing clip.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- Add a `getItemByUrl(url: string)` function to `lib/db.ts` that queries the `items` store for matching URL
- In `app/share/page.tsx`: on mount (after loading boards), call `getItemByUrl(rawUrl)`. If match found, show a "You've already saved this" state with the existing clip title and a "View existing" button that navigates to the clip's board
- If user clicks "Save anyway" (edge case: want a second copy), proceed normally
- Edge case: normalize URLs before comparison (strip trailing slash, lowercase scheme+host)

---

## PHASE E — Capture UX Excellence

### E1 — Rich Clip Notes (User Annotations)
**Status**: `[ ]` Not started  
**Why**: Users often want to add personal notes to a clip ("my friend said the best dish is X", "going here in March"). Currently there's a `notes` field on `SavedItem` but nothing renders or edits it.  
**Files to change**: `components/LocationDetailCard.tsx`, `lib/db.ts`, `lib/types.ts`  
**What to do**:
- Add a "Notes" section at the bottom of `LocationDetailCard.tsx` with a tappable "Add a note…" placeholder
- Tap to reveal a `<textarea>` with auto-focus and auto-resize
- Debounced save (500ms) to IndexedDB via `saveItem()`
- Show saved notes in a soft yellow background block with a pencil icon
- Character limit: 500 chars with a counter shown at 400+

### E2 — Quick-Clip Widget (iOS Shortcut + Share Extension Polish)
**Status**: `[ ]` Not started  
**Why**: The share flow has a 2-tap board picker. Most clips should go to Inbox in 1 tap. The Shortcut integration lets users say "Hey Siri, save this to TravelPanel."  
**Files to change**: `ios/App/ShareExtension/ShareViewController.swift`, `ios/App/ShareExtension/Info.plist`  
**What to do**:
- Add a "Save to Inbox (Quick)" action as the default in the Share Extension — saves immediately without opening the board picker
- The Share Extension shows a brief success animation (green checkmark overlay) before dismissing, so users see confirmation without switching apps
- Update `Info.plist` to declare an `NSUserActivity` type so the extension appears as a Shortcut action
- Add `Intents.intentdefinition` with a `ClipURLIntent` (URL input, optional board name) for Siri Shortcuts

### E3 — Batch Import (Multiple URLs at Once)
**Status**: `[ ]` Not started  
**Why**: Power users often have a list of saved URLs (browser bookmarks, Notion page, notes). Currently only one URL can be imported at a time.  
**Files to change**: `components/ImportSheet.tsx`, `app/api/import/route.ts`, `lib/enrichItem.ts`  
**What to do**:
- In `ImportSheet.tsx`, detect if the pasted text contains multiple URLs (newline or space-separated, minimum 2)
- Show a "Import X links" confirmation with a checklist of the URLs found
- Process them sequentially (to avoid overwhelming the API), showing progress ("2 of 5 done")
- Each URL gets its own `SavedItem`; all go to the same board
- Maximum 10 URLs per batch import (anti-abuse)

---

## PHASE F — Trip Intelligence

### F1 — Smart Trip Pre-fill from Board Content
**Status**: `[ ]` Not started  
**Why**: The trip planner asks users to type their preferences from scratch. The system already knows the trip's character from the board's substance — budget level, travel style, activity preferences — but doesn't use it.  
**Files to change**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Before showing the preferences textarea, analyze the board's substance items and tags to pre-fill smart defaults:
  - Count tag frequencies → detect dominant travel style (beach, culture, food, adventure)
  - Look for budget signals in substance (e.g. "cash only", "affordable", "splurge-worthy")
  - Look for logistics substance (e.g. "requires car", "best by public transport")
- Pre-fill the preferences field with: "I'm interested in [top 3 tags]. [1-sentence vibe from substance analysis]."
- User can edit before generating — it's just a smart starting point
- The analysis runs client-side using the stored substance items (no API call)

### F2 — Day-by-Day Route on Map
**Status**: `[ ]` Not started  
**Why**: The trip planner generates a great day-by-day plan but the map in the plan view doesn't show the route between stops. Users can't visualize their actual movement.  
**Files to change**: `components/RouteMapView.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Update `RouteMapView.tsx` to draw a polyline connecting each day's locations in order
- Day 1 route is one color (indigo), Day 2 another (emerald), etc. — max 7 colors cycling
- Add start/end markers (A→B style) for each day's route
- Each waypoint marker shows the activity name on hover/tap
- Use MapLibre's `addSource`/`addLayer` with GeoJSON LineString for the route
- The route animates in progressively as each day loads (framer-motion staggered)

### F3 — Inline Trip Editing
**Status**: `[ ]` Not started  
**Why**: Generated plans are read-only. If Claude suggests a restaurant you hate, you can't remove it without regenerating the whole plan.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `lib/types.ts`, `lib/db.ts`  
**What to do**:
- Add an "Edit" toggle to the plan view that reveals inline editing controls
- Activity cards get: up/down arrows (reorder within day), × to remove, + to add a blank activity
- Edited plans are saved as a new version ("Edited" variant) via the multi-version system (A10)
- Add a `notes` field to `Activity` type; show as editable textarea in edit mode
- "Reset to original" button restores the Claude-generated version

---

## PHASE G — Performance & Scale

### G1 — Virtualized Clip List
**Status**: `[ ]` Not started  
**Needs**: `react-window` or `@tanstack/react-virtual` (choose the lighter one)  
**Why**: At 200+ clips, the Inbox grid renders every card at once, causing scroll jank on older devices.  
**Files to change**: `app/inbox/page.tsx`  
**What to do**:
- Install `@tanstack/react-virtual` (lighter than react-window, no peer deps)
- Replace the `grid` div with a virtual grid using `useVirtualizer`
- Row height: estimated 200px per card row (2 columns = row every 2 items)
- Overscan: 3 rows above and below viewport
- Keep the existing `SearchBar` filtering — virtualizer renders the filtered results

### G2 — Image Optimization + Blur Placeholder
**Status**: `[ ]` Not started  
**Why**: External thumbnails from Instagram/YouTube load slowly and cause layout shift.  
**Files to change**: `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Replace `<img>` tags with lazy-loading images using `loading="lazy"` and `decoding="async"`
- Add a CSS blur-up animation: show a `bg-gray-200 animate-pulse` placeholder while the image loads, then cross-fade to the loaded image
- Limit image render size to 2x the display size via `sizes` attribute
- Cache external thumbnails via a simple `/api/proxy-image?url=` route to avoid CORS errors on Capacitor

---

## Completed Tasks (Phases A–C)

All Phase A–C tasks marked `[x]` — see git history for implementation details.
Phase B4 (Embedding Search) pending Supabase pgvector setup.
Phase B1 (Cloud Sync) scaffolded, pending Supabase credentials.
