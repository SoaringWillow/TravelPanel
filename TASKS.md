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
**Status**: `[~]` Scaffolded — dormant until `OPENAI_API_KEY` + Supabase pgvector  
**Needs**: Supabase pgvector (from B1)  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")  
**Done**: `app/api/embed/route.ts` (no-ops without `OPENAI_API_KEY`), `lib/semanticSearch.ts` (cosine similarity client-side, falls back to text search if no embeddings), Settings page surfaces "soon" badge.

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page

---

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[x]` Done — useUserLocation hook (watchPosition), blue dot + accuracy ring on map, follow mode, "X spots nearby" chip, GPS toggle button on home screen

### C2 — Post-Trip Timeline
**Status**: `[x]` Done — /timeline page, chronological groups by month, stats header, "Journey" NavBar tab

### C3 — Shared Boards v1
**Status**: `[x]` Done — Share button on board detail page; uses Web Share API (files) on iOS, falls back to JSON download; recipient imports via Settings → Import backup

### C4 — Proactive Resurfacing
**Status**: `[x]` Done — NearbyAlert component; when GPS mode is active and a saved location is within 300 m, a slide-up alert shows location name, distance, and source clip title; dismissible per item

---

## PHASE D — iOS Polish & UX Excellence

**Goal**: Every interaction should feel native-iOS. This phase turns the functional app into a *beautiful* app that users love to open.

### D1 — Edit & Delete Clips 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: Users have no way to fix a mis-saved clip title, delete old clips, or add personal notes. This is a basic CRUD gap that erodes trust.  
**Files**: `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Swipe-to-delete gesture on InboxCard (CSS touch + `transform` reveal with red delete zone)
- Confirmation bottom sheet before delete ("Delete this clip?")
- Edit mode in LocationDetailCard: tap title to edit inline, tap a tag to remove it, "+ Add note" textarea
- `updateItem(id, patch)` function in `lib/db.ts`
- Track `clip_edited` and `clip_deleted` events via analytics

### D2 — Haptic Feedback
**Status**: `[x]` Done  
**Why**: iOS users expect physical feedback. Without it the app feels like a website.  
**Files**: new `lib/haptics.ts`, call sites throughout the app  
**What to do**:
- Create `lib/haptics.ts` wrapping `@capacitor/haptics` with a no-op fallback for web
- Light impact: save, select, toggle
- Medium impact: board create, plan generate start
- Heavy + notification success: clip saved to board (the "moat moment")
- Error: enrichment failed

### D3 — Pull-to-Refresh
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/timeline/page.tsx`  
**What to do**:
- Add pull-to-refresh (PTR) to the three list views using CSS `overscroll-behavior` + touch events
- On refresh: re-fetch all items from IndexedDB and re-run enrichment retry queue
- Show a subtle spinner at the top while refreshing

### D4 — Dark Mode
**Status**: `[x]` Done  
**Files**: `app/globals.css`, all pages and components (Tailwind `dark:` variants)  
**What to do**:
- Enable `darkMode: 'media'` in `tailwind.config.js`
- Audit every hardcoded `bg-white`, `text-gray-800` etc. and add `dark:` counterparts
- Update NavBar, cards, modals, map controls for dark backgrounds
- Map style: switch to a dark MapLibre style when in dark mode
- Test on iOS with Dark Mode enabled in system settings

### D5 — Board Cover Art & Visual Refresh
**Status**: `[x]` Done  
**Files**: `components/BoardCard.tsx`, `hooks/useBoards.ts`  
**What to do**:
- Use the first clip's thumbnail as the board's cover image (stored as `coverThumbnail` on the `Board` type)
- Auto-update `coverThumbnail` when new items with thumbnails are added
- Animated gradient fallback (use board emoji + platform color palette) when no thumbnail
- Update `BoardCard` to show a tall cover image with the board name overlaid

### D6 — Clip Reorder + Board Sort
**Status**: `[x]` Done  
**Files**: `app/boards/[id]/page.tsx`, `lib/db.ts`  
**What to do**:
- Long-press a clip to enter drag-reorder mode
- Drag to reorder clips within a board
- Persist new `itemIds` order to IndexedDB

### D7 — Map Filter Chips
**Status**: `[x]` Done  
**Files**: `app/page.tsx`, `components/MapView.tsx`  
**What to do**:
- Horizontal chip row above the FAB: All / 🍜 Food / 🏖 Beach / 🏔 Mountain / 🌿 Nature / 🏛 Culture
- Filtering hides non-matching pins on the map (client-side, instant)
- Active chip gets indigo background; "All" always shows full map

### D8 — Better Onboarding Flow
**Status**: `[ ]` Not started  
**Files**: `components/OnboardingSeed.tsx`, `app/page.tsx`  
**What to do**:
- Replace the current banner with a full-screen first-launch welcome (3 swipeable cards):
  1. "Clip anything" — tap the + button to save from any URL
  2. "Extract the wisdom" — show a substance card example
  3. "Plan your trip" — show a plan preview
- "Get started" CTA dismisses and creates a seed board
- Show only once (persisted in localStorage)

---

## PHASE E — App Store Launch Readiness

**Goal**: Everything required to submit to the iOS App Store with a professional first impression.

### E1 — App Icon & Splash Screen Polish
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/`, `capacitor.config.ts`  
**What to do**:
- Design a proper app icon: indigo (#6366f1) background, white map-pin SVG, rounded corners per iOS spec
- Generate all required iOS icon sizes (1024, 512, 256, etc.) using a script
- Update the Capacitor SplashScreen config for a clean branded launch screen
- Remove the generic Capacitor default icon/splash

### E2 — Privacy Manifest (iOS 17+)
**Status**: `[ ]` Not started  
**Files**: new `ios/App/App/PrivacyInfo.xcprivacy`  
**What to do**:
- Create `PrivacyInfo.xcprivacy` documenting API usage:
  - `NSPrivacyAccessedAPICategoryLocation` — GPS for on-trip mode
  - `NSPrivacyAccessedAPICategoryUserDefaults` — App Group share handoff
- List collected data categories in the manifest
- Required for App Store submission since iOS 17

### E3 — Share Extension Native Board Picker
**Status**: `[ ]` Not started  
**Files**: `ios/App/ShareExtension/ShareViewController.swift`  
**What to do**:
- Show a minimal board-picker UI directly in the Share Extension (no app launch needed)
- Fetch board names from App Group UserDefaults
- User picks a board, saves URL + boardId to App Group; main app syncs on next open
- Falls back to current "open main app" flow if no boards exist

### E4 — Performance: Virtualised Inbox List
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- The current grid renders every card in the DOM — slow at 200+ clips
- Implement windowed rendering: only render cards in/near the viewport
- Use `IntersectionObserver` for lazy image loading on thumbnails

### E5 — App Store Screenshots & Metadata
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Info.plist`, new `marketing/` directory  
**What to do**:
- Write App Store description (300 words, highlights substance extraction moat)
- Keywords: travel planner, trip planner, travel inspiration, xiaohongshu, travel clips
- Plan 6 iPhone screenshots at 1290×2796 px:
  1. Map view with pins
  2. Clip save flow (Share Sheet)
  3. Substance/wisdom card
  4. Trip planner output
  5. Timeline/Journey view
  6. Board with clips

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
