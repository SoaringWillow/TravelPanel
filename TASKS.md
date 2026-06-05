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
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- Before saving, check IndexedDB for an existing item with the same URL
- If found: show "You already saved this" with the existing clip's title + board name
- Options: "View clip" (navigate to board) or "Save again anyway" (proceeds normally)

### E3 — Smart board suggestions on save
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`  
**What to do**:
- After Claude extracts locations: if a location matches city/country tags in an existing board, surface that board first in the picker (above recently-updated boards)
- "Best match: 🗼 Tokyo board (3 Tokyo clips)" — one-tap to select
- Fallback: existing recent-boards order unchanged

### E4 — Best time to visit signal in plans
**Status**: `[x]` Done  
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

## PHASE G — Polish & Core UX Gaps

> Phases D+E complete. Phase G fills remaining UX gaps that make the app feel truly native and polished, with no Supabase dependency.

### G1 — Fix TypeScript `mimeType` error in import route
**Status**: `[x]` Done  
**Files**: `app/api/import/route.ts`  
**What to do**: AI SDK v6 renamed `mimeType` → `mediaType` on `ImagePart`. Fix the property name so the project compiles without errors.

### G2 — Home page bottom drawer (recently clipped panel)
**Status**: `[x]` Done  
**Files**: `app/page.tsx`  
**What to do**:
- Add a sliding bottom drawer on the home/map page showing the 5 most-recently clipped items
- Each item: thumbnail + title + platform chip + "Open" button
- Drawer handle: pulls up from NavBar, collapses back with swipe-down
- First-run empty state: "Pull up to see your clips. Tap + to add your first."
- The map still fills full screen; drawer overlays it at the bottom

### G3 — Global search on home map
**Status**: `[x]` Done  
**Files**: `app/page.tsx`  
**What to do**:
- Tapping the magnifying-glass icon in the top bar opens a full-screen search sheet
- Real-time filtering across all items (title, tags, location names, substance)
- Results list: tapping an item flies the map to that pin and closes the search
- Escape / tap outside dismisses search

### G4 — Error boundaries for all pages
**Status**: `[x]` Done  
**Files**: `components/ErrorBoundary.tsx` (new), all page files  
**What to do**:
- Create a React `ErrorBoundary` class component with a friendly fallback UI ("Something went wrong — tap to retry")
- Wrap each top-level page component in the boundary
- Log errors to `track('js_error', { message, stack })` for analytics

### G5 — Clipboard import in share sheet
**Status**: `[x]` Done  
**Files**: `components/ImportSheet.tsx`  
**What to do**:
- Add a "Paste URL" button below the URL input in ImportSheet
- On tap: read from clipboard using `navigator.clipboard.readText()`, fill the URL field
- If clipboard has nothing URL-like, show "No URL in clipboard" toast

### G6 — Plan: copy day plan to clipboard
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`  
**What to do**:
- Add a "Copy" icon button on each day strip card in the plan
- On tap: copies that day's activities as plain text to clipboard
- Show a brief "Copied!" toast (2s auto-dismiss)

### G7 — Settings: show build info, feedback link, rate limits
**Status**: `[x]` Done  
**Files**: `app/settings/page.tsx`  
**What to do**:
- Add "App info" section: version string from `package.json`, link to GitHub issues for feedback
- Add "Usage limits" section: shows enrichment calls used today (from rateLimits), plan generations used, resets-at time
- Uses `checkEnrichmentLimit()` and `checkPlanLimit()` from `lib/rateLimits.ts`

### G8 — Long press on map pin to preview substance
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Long-press (or long-tap) on a map pin shows a quick-peek tooltip with the item's top 2 substance items
- Tap anywhere else to dismiss
- Regular tap still opens the full detail card

---

## PHASE H — App Store Submission Prep

> All Phase A–G implementable tasks are complete. Phase H targets the gaps blocking App Store submission: legal pages, accessibility, first-run onboarding, and iOS compliance. No Supabase required.

### H1 — Privacy Policy and Terms of Service pages
**Status**: `[x]` Done  
**Files**: `app/privacy/page.tsx` (new), `app/terms/page.tsx` (new), `components/NavBar.tsx`  
**What to do**:
- Create `app/privacy/page.tsx` — static page with a clear privacy policy covering: data storage (on-device IndexedDB), AI processing (URLs sent to Anthropic API), analytics (PostHog, opt-out available), no account required, no data sold, user can delete all data via Settings
- Create `app/terms/page.tsx` — static terms page covering: app purpose, acceptable use (no spam, no illegal content), IP (user owns their clips), disclaimer (AI extracts may be inaccurate)
- Add a "Privacy & Terms" row to `app/settings/page.tsx` About section, linking both pages
- Pages should be accessible without authentication and share the app's visual design

### H2 — Accessibility audit: aria-labels on all interactive elements
**Status**: `[x]` Done  
**Files**: `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/boards/[id]/page.tsx`, `app/plan/[boardId]/page.tsx`, `components/NavBar.tsx`, `components/ImportSheet.tsx`, `components/InboxCard.tsx`, `components/MapView.tsx`  
**What to do**:
- Add `aria-label` to every icon-only button (search, close, back, settings, add, copy, export, etc.)
- Add `role="dialog"` and `aria-modal="true"` to all drawers/modals (ImportSheet drawer, search sheet, detail panels)
- Add `aria-busy="true"` on loading containers during skeleton/spinner states
- Add `aria-live="polite"` on toast/snackbar elements so screen readers announce them
- Add `alt=""` (empty alt) on decorative thumbnail images; non-empty `alt` on meaningful images
- Verify all form inputs have associated `<label>` or `aria-label`
- Test with VoiceOver on iOS: every interactive element should be reachable and announce sensibly

### H3 — Enrichment rate-limit banner in Inbox
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `lib/rateLimits.ts`  
**What to do**:
- When the Inbox page loads and pull-to-refresh is triggered, check `checkEnrichmentLimit()` before re-enriching
- If limit is already hit (`remaining === 0`), show a dismissible amber banner at the top: "Enrichment limit reached — resets in Xh Ym. Pull to refresh when it resets."
- If mid-batch enrichment hits the limit, stop the loop and show the banner with remaining count
- Reuse the same `formatResetsIn()` pattern from the Settings page
- This mirrors the plan rate-limit UX that was already built for the plan view (D3)

### H4 — First-launch onboarding walkthrough
**Status**: `[ ]` Not started  
**Files**: `components/OnboardingSheet.tsx` (new), `app/page.tsx`  
**What to do**:
- On first launch (detect via `localStorage.getItem('hasSeenOnboarding')`), show a full-screen onboarding sheet
- 3 steps (swipeable cards):
  1. "Save inspiration" — show iOS Share Sheet icon + short description of clipping from WeChat/Red Book/Douyin
  2. "Discover places" — show a map pin icon + "AI extracts locations and travel wisdom from every clip"
  3. "Plan your trip" — show itinerary icon + "Generate a personalised day-by-day plan citing your saved clips"
- CTA button on step 3: "Start exploring" — dismisses the sheet and sets `hasSeenOnboarding = true`
- Skip button on step 1 and 2 to allow power users to bypass
- Re-accessible from Settings → "See app intro"
- If seed demo boards are present (A8), onboarding seeds them before dismissal

### H5 — Share Extension completion UI
**Status**: `[ ]` Not started  
**Files**: `ios/App/ShareExtension/ShareViewController.swift`  
**What to do**:
- After the extension writes the URL/image to App Group storage and calls `openApp()`, show a brief in-extension confirmation:
  - Success: green checkmark + "Saved to TravelPanel!" for 1 second, then close the extension
  - Error (no valid URL found, no app group access): amber warning + "Couldn't save — open TravelPanel and paste the URL manually" with a "Close" button
- Currently the extension closes immediately with no feedback — users don't know if the clip was saved
- The confirmation should display in the `UIViewController` already shown by the extension before it calls `extensionContext.completeRequest()`

### H6 — Map layer toggle (street / satellite)
**Status**: `[ ]` Not started  
**Files**: `components/MapView.tsx`  
**What to do**:
- Add a small toggle button in the map's top-right corner (below the zoom buttons): a layers icon
- Two modes: "Street" (current OpenFreeMap liberty style) and "Satellite" (switch to a satellite tile URL — use `https://tiles.openfreemap.org/styles/positron` as a cleaner alternative, or any public satellite tile source)
- Persist the chosen style in `localStorage` so the user's preference is remembered
- Animate the style transition: fade the map to opacity 0 briefly on switch, then back to 1

### H7 — Clip tag filter chips on Inbox
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Below the "Inbox" header, add a horizontal scrollable row of tag filter chips
- Tags are derived from all items in the inbox — collect unique tags and show them
- Tapping a chip filters the visible items to only those with that tag
- Multiple chips can be selected (AND logic: items must match all selected tags)
- "All" chip (always first) clears the filter
- Active chip: filled indigo background; inactive: light gray border
- Empty state when filter has no results: "No clips tagged '${tag}'"

### H8 — Clip sort order selector
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Add a sort button to the Inbox header (small "↕ Sort" label or a sort icon)
- Sort options (bottom sheet picker):
  1. "Newest first" (default, by `savedAt` desc)
  2. "Oldest first" (by `savedAt` asc)
  3. "Most places" (by `locations.length` desc — surfaces clips with most extracted pins)
  4. "Platform" (grouped by platform: WeChat, Red Book, Douyin, Bilibili, Other)
- Persist the chosen sort in `localStorage`
- When "Platform" is selected, show platform group headers in the list

---

## PHASE I — Power User Features

> Phase I adds features that make TravelPanel indispensable for frequent travellers: inline editing, multi-select batch actions, and plan-to-image sharing.

### I1 — Inline notes editing on saved clips
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `lib/db.ts`  
**What to do**:
- On the InboxCard (done/enriched state), add a small pencil icon in the card footer area
- Tapping it expands an inline textarea (animated height from 0 to ~80px) for editing the clip's `notes` field
- Auto-saves after 1.5s of typing inactivity (debounced `updateItem(item.id, { notes })`)
- Show a subtle "Saved" micro-toast or check-icon confirmation
- Tapping away collapses the textarea with the same animation

### I2 — Multi-select and batch board assignment
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Long-press on an InboxCard enters "select mode" — a checkbox appears on each card with a selection ring
- The header changes to "X selected" with "Cancel" and "Move to board" buttons
- "Move to board" opens the board picker; moves all selected items to the chosen board
- After move: show undo snackbar (same pattern as single-swipe undo)
- Regular tap while in select mode toggles the item's selection
- Tap outside any card or "Cancel" exits select mode

### I3 — Trip plan share as image
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/shareImage.ts` (new)  
**What to do**:
- Add a "Share" button (share icon) in the plan view header
- On tap: generates a summary card as a canvas image (using `html2canvas` or `@vercel/og` client-side):
  - Card shows: board name, trip duration, day themes, top 3 locations
  - Branded with "TravelPanel" + subtle map pin watermark
  - Dark indigo background with white text
- On iOS: triggers native iOS share sheet via `navigator.share({ files: [imageFile] })` — shares as a PNG image
- On desktop: downloads the image file
- Falls back gracefully if canvas capture fails (just copies the text summary instead)

### I4 — Substance filter in board detail
**Status**: `[ ]` Not started  
**Files**: `app/boards/[id]/page.tsx`  
**What to do**:
- In the board's clip list view (below the map), add a substance filter row: "All" | "💡 Tips" | "⚠️ Warnings" | "🧠 Wisdom"
- When a filter is active, show only clips that have at least one substance item of that type
- Inside each clip card, highlight the matching substance items (show them inline under the clip title)
- This makes the "wisdom layer" discoverable from the board — users can quickly scan all tips for a destination

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
