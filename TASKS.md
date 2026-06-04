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

### C2 — Post-Trip Timeline
**Status**: `[x]` Done

### C3 — Shared Boards v1
**Status**: `[x]` Done

### C4 — Proactive Resurfacing
**Status**: `[x]` Done

---

## PHASE D — iOS Polish + Product Completion (New Sprint, 2026-06-04)

> **Goal**: Elevate TravelPanel from a working MVP to a beautiful, polished iOS app
> that users instinctively trust and return to. Every task here directly addresses
> a gap between "it works" and "it feels great."
>
> **Priority**: D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → D9 → D10

### D1 — Dark Mode Support
**Status**: `[x]` Done  
**Why**: Most iOS users enable system dark mode. The current app is all-white — jarring at night. This is a basic quality bar for any modern iOS app.  
**Files to change**: `app/globals.css`, `tailwind.config.js`, every component that uses hard-coded `bg-white`, `text-gray-X`, `bg-gray-50`  
**What to do**:
- Add `darkMode: 'class'` to `tailwind.config.js`
- Add a `ThemeProvider` in `app/layout.tsx` that reads `prefers-color-scheme` and sets a `dark` class on `<html>`
- Audit all pages and components: replace `bg-white` → `bg-white dark:bg-gray-900`, `text-gray-900` → `dark:text-white`, etc.
- Map tiles: MapLibre supports dark style — switch to `demotiles.net` dark tile when in dark mode
- Key pages: home, inbox, boards, plan, share, settings — all need dark variants
- Test in iOS Safari dark mode

### D2 — Pull-to-Refresh in Inbox & Boards
**Status**: `[ ]` Not started  
**Why**: Standard iOS pattern. Without it the app feels web-like. Triggers re-enrichment of any failed/pending items.  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, new `components/PullToRefresh.tsx`  
**What to do**:
- Create `PullToRefresh.tsx` using touch events (`touchstart`/`touchmove`/`touchend`) on the scroll container
- Show a spinner animation when pulled > 60px
- On release: call the supplied `onRefresh` callback (re-query DB + trigger retry queue)
- Include spring-back animation using Framer Motion
- Capacitor `@capacitor/push-notifications` style haptic on trigger (`Haptics.impact`)
- Wire into inbox and boards list views

### D3 — Swipe-to-Delete on Cards
**Status**: `[ ]` Not started  
**Why**: iOS users expect swipe-left to reveal delete. Tap-and-hold is not discoverable. This reduces friction for library curation.  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add touch swipe detection: if user swipes left > 60px, reveal a red "Delete" button
- Use Framer Motion `drag` with `dragConstraints` for smooth feel
- Snap to open (showing delete) or closed on release based on velocity
- Tapping the red button calls `onDelete`
- Swipe right or tap elsewhere to close
- Works alongside the existing tap-to-view behaviour

### D4 — Personal Notes on Clips
**Status**: `[ ]` Not started  
**Why**: Users discover things from a clip ("bring cash", "visit on Tuesday") that aren't in the extracted substance. They need somewhere to put personal annotations.  
**Files**: `lib/types.ts` (notes field already exists on SavedItem), `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- `SavedItem.notes?: string` already exists in the type — wire it up
- In `LocationDetailCard`, add a "Notes" section below substance
- Tapping the section opens an inline text area (expandable, auto-saves on blur)
- `updateItemNotes(id, notes)` DB helper writes the note to IndexedDB
- Show a small 📝 indicator on InboxCard when a note exists
- Include notes in JSON export (already included by default)

### D5 — Tag Management (Add / Remove Tags on Clips)
**Status**: `[ ]` Not started  
**Why**: AI-extracted tags aren't always right. Users should be able to add "honeymoon" or remove "shopping" from a food clip. Custom tags power future filtering and search.  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- In the detail card, make tag chips tappable/removable (× button on each)
- Add an "+ Add tag" chip that opens an inline text input (Enter to confirm)
- `updateItemTags(id, tags)` DB helper
- Show a pencil icon next to the tags section to signal editability
- Limit tags to 20 chars each, max 10 tags per item

### D6 — Create Board from Trip Plan
**Status**: `[ ]` Not started  
**Why**: After generating a plan, users often want to collect the recommended spots as a board for future clipping. This bridges the planner → clipper loop.  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`  
**What to do**:
- In the trip plan COMPLETE state, add a "Save spots as new board" button
- Collects all unique `location` objects from the plan's activities
- Creates new `SavedItem` records for each spot (status: done, no URL, source: 'plan')
- Creates a new `Board` with those items
- Updates `lib/types.ts` if needed: add `source?: 'clip' | 'plan'` to SavedItem
- Navigate to the new board on completion
- Show a toast: "New board created with X spots from your plan"

### D7 — Offline Thumbnail Caching
**Status**: `[ ]` Not started  
**Why**: Thumbnails currently load from the original CDN URL every time. On poor connectivity (in-flight, rural), cards show broken images. Critical for a travel app used on-the-go.  
**Files**: `public/sw.js`, `components/InboxCard.tsx`, new `lib/imageCache.ts`  
**What to do**:
- In the service worker (`public/sw.js`), add a cache-first strategy for image requests that match thumbnail URLs
- In `lib/imageCache.ts`, on save of a new item, `fetch(thumbnail)` and store in a `Cache.open('thumbnails')` cache entry keyed by item ID
- `InboxCard` and `LocationDetailCard`: use a `useCachedImage(url)` hook that checks Cache API first, then network
- Include a "cache size" display in Settings (nice-to-have)
- Automatically evict thumbnails for deleted items

### D8 — iOS "Add to Home Screen" Prompt
**Status**: `[ ]` Not started  
**Why**: Without Capacitor native install, Safari users run the web app. "Add to Home Screen" is the only way to get app-quality on web. We never prompt for it.  
**Files**: new `components/A2HSBanner.tsx`, `app/layout.tsx` or `app/page.tsx`  
**What to do**:
- Detect if running in Safari on iOS (`navigator.userAgent` includes `Safari`, `!navigator.standalone`)
- Show a bottom banner on 3rd app open (track count in localStorage): "Add TravelPanel to your home screen for the full experience"
- Include an animated arrow pointing to the Share button at the bottom of Safari
- "Remind me later" / "Got it!" dismiss options
- Don't show if already installed as PWA (`window.navigator.standalone === true`) or on native Capacitor app

### D9 — First-Run Onboarding Tutorial
**Status**: `[ ]` Not started  
**Why**: New users land on an empty map with no guidance. Seed boards help (A8) but don't explain the core clip → plan flow. Churn at session 1 is the biggest retention risk.  
**Files**: new `components/OnboardingOverlay.tsx`, `app/page.tsx`  
**What to do**:
- On first launch (no items, `hasCompletedOnboarding` not in localStorage), show a 3-step overlay:
  - Step 1: "Clip inspiration" — highlight the + FAB, show a demo of saving a URL
  - Step 2: "AI extracts spots + wisdom" — animated card showing extraction
  - Step 3: "Plan your trip" — show the plan button and AI planner
- Each step has a "Got it" tap or auto-advance after 4s
- Skip button always visible
- On completion, set `hasCompletedOnboarding = true` and dismiss
- Use Framer Motion for transitions; must look stunning

### D10 — iOS App Icon + Splash Screen
**Status**: `[ ]` Not started  
**Why**: The current Capacitor placeholder icon (generic blue square) looks unfinished. The app icon is the first thing users see on their home screen. Essential for TestFlight/App Store submission.  
**Files**: `ios/App/App/Assets.xcassets/`, `ios/App/App/Assets.xcassets/Splash.imageset/`  
**What to do**:
- Design a map-pin-based icon: indigo background (#6366f1), white pin with a subtle travel motif
- Generate all required iOS icon sizes (1024×1024 master → all @1x/@2x/@3x variants)
- Can be done with a Node script using `sharp` (npm package) to resize from a 1024px master SVG
- Create a `scripts/generate-icons.ts` script that reads `public/icon-master.svg` and outputs all sizes to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Splash screen: indigo background, centered white pin icon, fade in/out
- Update `Contents.json` files in the xcassets to reference the new images
- Also update the web app manifest (`public/manifest.json`) with the new icons

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
