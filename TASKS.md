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
**Implemented**: `browser-extension/` — Manifest V3 extension with popup UI (platform detection, travel content hint), settings page, canvas-generated icon, keyboard shortcut (⌘⇧S). Opens TravelPanel `/share` page in a new tab. Load unpacked from `chrome://extensions`.

### B3 — Xiaohongshu Fix (Claude Vision)
**Status**: `[x]` Done  
**What to do**: Accept image payload from iOS Share Sheet, use Claude Vision to extract metadata + substance  
**Implemented**: `ShareViewController.swift` captures image attachments, resizes to 800px, writes base64 JPEG to App Group as `pendingShareImage`. `app/share/page.tsx` reads it from `@capacitor/preferences` on mount. `lib/enrichItem.ts` forwards `imageBase64` to the API. `app/api/import/route.ts` uses Claude Vision (`messages` with `image` content) when `imageBase64` is present; skips page fetch for anti-scraping platforms (小红书, WeChat) when an image is available.

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Not started  
**Needs**: Supabase pgvector (from B1)  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page  
**Implemented**: `app/settings/page.tsx` — new Settings page with clip/board/location stats, "Export all data" button (downloads `travelpanel-backup-<date>.json` with all items, boards, trips), configuration status panel (PostHog, Supabase), and a danger-zone clear-all-data button. Added Settings tab to `components/NavBar.tsx`.

---

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Not started

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started

---

## PHASE D — iOS UI Polish (Beautiful App Sprint)

> Goal: every screen feels native, animated, and complete. No spinner-only loading states, no broken empty states, no jagged transitions. This phase transforms the working MVP into an app you'd be proud to show on the App Store.

### D1 — Boards page entrance animations
**Status**: `[x]` Done  
**Files**: `app/boards/page.tsx`  
**What to do**:
- Add framer-motion stagger to board grid: boards fade+slide-up with 60ms delay between each
- Animate new board creation: card expands from bottom with spring physics
- Board deletion: card collapses with exit animation before grid reflows
- Replace static loading spinner with 3 pulse-skeleton board cards

### D2 — Board detail: adaptive map + plan button polish
**Status**: `[x]` Done  
**Files**: `app/boards/[id]/page.tsx`  
**What to do**:
- Replace hardcoded `min(240px, 35vh)` map height with `clamp(200px, 40vh, 320px)` and add a reveal animation when the map first loads (fade + scale from 0.98)
- Add a "no locations yet" overlay on the map when all clips are still enriching (spinner + "Extracting locations…" message)
- Disabled "Plan this trip" button: add a proper tooltip popover explaining why it's disabled (no enriched locations yet), not just `title=`

### D3 — Trip planner loading state & rate-limit UX
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- During plan generation, show a content-shaped skeleton (day strips as shimmer cards) instead of just agent steps text
- Agent step list: animate each new step in with a slide-down entrance (no layout jump)
- Rate-limit error: show a dismissible banner card (not just text) with the reset time countdown and a "Set a reminder" action
- Once a plan exists, animate the day strips appearing sequentially (stagger 80ms)

### D4 — iOS haptic feedback
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `components/InboxCard.tsx`, `lib/haptics.ts` (new)  
**What to do**:
- Create `lib/haptics.ts` wrapper: `impact(style)`, `notification(type)`, `selection()` — no-ops outside Capacitor native context
- `impact('medium')` when clip is saved (share page → stage: done)
- `notification('success')` when enrichment completes and location count appears
- `notification('error')` when enrichment fails
- `selection()` on board picker item tap
- `impact('light')` on substance item tap in detail card

### D5 — PWA manifest & app icons
**Status**: `[x]` Done  
**Files**: `public/manifest.json` (or `app/manifest.ts`), `public/icons/`  
**What to do**:
- Audit `next.config.js` PWA configuration — ensure `display: standalone`, `orientation: portrait`, correct `start_url`
- Add `screenshots` array to manifest (2 phone screenshots for App Store–style install prompt)
- Add `categories: ["travel", "lifestyle"]` and `description` to manifest
- Ensure all icon sizes exist: 72, 96, 128, 144, 152, 192, 384, 512 (maskable + regular variants)
- Add `apple-mobile-web-app-capable` and `apple-touch-icon` meta tags in `app/layout.tsx`

### D6 — Pull-to-refresh on Inbox and Boards
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `hooks/usePullToRefresh.ts` (new)  
**What to do**:
- Create `hooks/usePullToRefresh.ts`: detects touch overscroll on iOS, triggers a callback, shows a spinner indicator at top
- On Inbox: pull-to-refresh triggers re-enrichment of all `pending`/`failed` items (calls `enrichItem` for each, up to rate limit)
- On Boards: pull-to-refresh reloads board list from IndexedDB
- Visual: top-of-screen spinner appears at 60px pull threshold, haptic feedback at trigger point

### D7 — Offline indicator
**Status**: `[x]` Done  
**Files**: `components/NavBar.tsx`, new `hooks/useNetworkStatus.ts`  
**What to do**:
- Create `hooks/useNetworkStatus.ts` using `navigator.onLine` + `online`/`offline` events
- When offline: show a subtle amber dot on the NavBar + a snackbar "You're offline — clips will enrich when reconnected"
- When back online: snackbar "Back online — catching up…" and trigger retry queue

### D8 — Clip card thumbnail improvements
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add a fixed 16:9 aspect-ratio container for thumbnails (prevents layout shift during image load)
- For Xiaohongshu/WeChat clips with no thumbnail: show a gradient placeholder with the platform color + platform name centered
- Add `loading="lazy"` and `decoding="async"` to thumbnail `<img>` tags
- On image load error: fall back to a clean icon placeholder (not broken-image browser default)

### D9 — Safe area & dynamic island audit
**Status**: `[x]` Done  
**Files**: `app/layout.tsx`, all page files  
**What to do**:
- Verify `safe-top` / `safe-bottom` classes are applied to all pages (share, plan, settings, boards, inbox, home)
- On iPhone 14 Pro / 15: test that no UI is obscured by the Dynamic Island
- `app/plan/[boardId]/page.tsx` map view: ensure its container extends behind the home indicator area
- Floating action buttons: must be above `safe-bottom` height (env(safe-area-inset-bottom))

### D10 — Swipe-to-move on Inbox cards
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add drag gesture on `InboxCard`: swipe right > 80px = assign to most-recent board (with undo snackbar)
- Swipe left > 80px = delete with confirmation
- Show colour-coded reveal layer under the card (green for board, red for delete) as the card is dragged
- Snap back with spring physics if drag is cancelled

---

## PHASE E — Smart Features

### E1 — Batch re-enrich from board
**Status**: `[x]` Done  
**Files**: `app/boards/[id]/page.tsx`  
**What to do**:
- "Re-extract all" button in board detail header (appears when ≥1 clip has failed/pending enrichment)
- Processes clips sequentially with 500ms gap (respects rate limit), shows progress `3/7 extracted`
- After batch: board locations count updates, "Plan trip" button unlocks if locations found

### E2 — Duplicate URL detection
**Status**: `[ ]` Not started  
**Files**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- Before saving, check IndexedDB for an existing item with the same URL
- If found: show "You already saved this" with the existing clip's title + board name
- Options: "View clip" (navigate to board) or "Save again anyway" (proceeds normally)

### E3 — Smart board suggestions on save
**Status**: `[ ]` Not started  
**Files**: `app/share/page.tsx`  
**What to do**:
- After Claude extracts locations: if a location matches city/country tags in an existing board, surface that board first in the picker (above recently-updated boards)
- "Best match: 🗼 Tokyo board (3 Tokyo clips)" — one-tap to select
- Fallback: existing recent-boards order unchanged

### E4 — Best time to visit signal in plans
**Status**: `[ ]` Not started  
**Files**: `app/api/plan/route.ts`  
**What to do**:
- Extract `wisdom`-type substance items that contain seasonal keywords ("spring", "rainy season", "typhoon", "peak season", "avoid August")
- Pass them to the itinerary planner as a `seasonalWarnings` field
- The planner prompt includes: "Note these seasonal warnings from saved clips when recommending trip timing"
- Surface in the plan overview section as "Best time to go: …"

---

## PHASE F — Social & Sharing

### F1 — Shareable board page (read-only)
**Status**: `[ ]` Not started  
**What to do**: Generate a public read-only URL for a board (e.g. `/b/abc123`) that shows pins + substance items. Requires Supabase (B1) to be activated for persistence.

### F2 — Import shared board
**Status**: `[ ]` Not started  
**What to do**: Parse a `/b/<id>` share URL, fetch the board data, let user "Save to my TravelPanel" — forks the board into their IndexedDB.

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
