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
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[x]` Done

---

## PHASE D — Visual Polish & iOS Delight (Current Sprint)

*Goal: make the app feel beautiful and native, not just functional.*

### D1 — Haptic Feedback on Key Actions
**Status**: `[x]` Done  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `app/boards/[id]/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with a `haptic(style: 'light'|'medium'|'heavy'|'success'|'error')` wrapper
- On iOS (Capacitor), use `@capacitor/haptics` (`Haptics.impact`, `Haptics.notification`); on web, fall back to `navigator.vibrate()` (short patterns)
- Fire on: clip saved (success), board created (light), plan generation started (light), plan done (heavy success), delete item (medium)
- Import `@capacitor/haptics` dynamically to keep bundle clean

### D2 — Clip Card Redesign (InboxCard polish)
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add a platform-color accent strip (3px left border) matching `PLATFORM_COLORS`
- Show 1–2 substance items inline below the title (truncated to 1 line each) when `enrichmentStatus === 'done'`
- Replace plain thumbnail `<img>` with a rounded container + graceful skeleton while loading
- Tags: show up to 3 pills; overflow as `+N more`
- Substance count badge: show as a pill with icon (💡 `N tips`) only when substance.length > 0

### D3 — Beautiful Boards Grid (boards listing polish)
**Status**: `[ ]` Not started  
**Files**: `app/boards/page.tsx`  
**What to do**:
- Board cards: show a 2×2 mosaic of item thumbnails (or the emoji on a gradient bg if no thumbnails)
- Add item count badge in the top-right of each card
- Animated press state (scale-down on tap)
- Empty boards page: illustration + "Create your first board" CTA (use emoji + Tailwind, no external images)
- Board card shows `updatedAt` relative date ("Updated 2d ago")

### D4 — Home Screen Welcome State
**Status**: `[ ]` Not started  
**Files**: `app/page.tsx`, new `components/EmptyMapState.tsx`  
**What to do**:
- When `items.length === 0` and not loading: show a centered overlay (not full page replacement) with:
  - Large emoji 🗺 + "Your travel map starts here"
  - Two CTAs: "Clip from Safari" (opens share flow with a demo URL) + "Try demo boards" (imports seed data)
  - Subtle animated pulse on the map background
- Once items are added, the overlay fades out (AnimatePresence)
- On iOS, also show a "Share any travel post to add it" hint

### D5 — Plan UI Polish (DayStripCard)
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx` (or wherever plan UI lives)  
**What to do**:
- Read the plan page first; understand the current DayStripCard / activity card structure
- Add sourced tip chips: when an activity has `sourcedTips`, show them as subtle `💡 from: <title>` chips
- Day header: show total distance + estimated time for the day
- Activity card: show a small location map thumbnail (static pin emoji + location name)
- Add a "Copy day" button to copy the day's schedule as plain text (for sending via WhatsApp etc.)

### D6 — Dark Mode Support
**Status**: `[ ]` Not started  
**Files**: `app/globals.css`, `tailwind.config.js`, various components  
**What to do**:
- Add `darkMode: 'class'` to `tailwind.config.js`
- Create a `useDarkMode` hook that reads `prefers-color-scheme` and stores override in localStorage
- Add dark variants to: NavBar, home top bar, boards page, inbox page, settings page
- Map style: switch to a dark MapLibre style when dark mode is active (`https://tiles.openfreemap.org/styles/dark` or similar)
- Add a dark mode toggle to the Settings page

---

## PHASE E — Feature Completeness

### E1 — Clip Notes (User Annotations)
**Status**: `[ ]` Not started  
**Files**: `lib/types.ts`, `lib/db.ts`, `components/LocationDetailCard.tsx`  
**What to do**:
- Add `notes?: string` to `SavedItem` type
- In `LocationDetailCard`: add an inline text area below substance items; auto-save on blur (debounced 500ms)
- Show a "My note" icon on InboxCard when `notes` is non-empty
- Include `notes` in the JSON data export (already passes through with the full item)

### E2 — Visit Tracking (Mark as Visited)
**Status**: `[ ]` Not started  
**Files**: `lib/types.ts`, `lib/db.ts`, `components/LocationDetailCard.tsx`, `components/MapView.tsx`  
**What to do**:
- Add `visitedAt?: number` to `SavedItem`
- "Mark as visited" button in LocationDetailCard; records `visitedAt: Date.now()`
- Map: visited pins render as a lighter/outlined version (50% opacity or a checkmark overlay)
- Settings page: show "X places visited" stat alongside clips/boards/trips

### E3 — Platform & Tag Filter on Map/Inbox
**Status**: `[ ]` Not started  
**Files**: `app/page.tsx`, `components/MapView.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Filter bar on the inbox page: horizontal chip row for platforms + tags (toggle chips)
- Active filters reduce the visible items list
- Persist active filters in sessionStorage so they survive page nav within a session
- Map: expose the active filter to MapView so only filtered items appear as pins

### E4 — Supabase Cloud Sync Activation
**Status**: `[ ]` Blocked until `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided  
**What to do** (once keys exist):
- Wire `syncNow()` on auth-state-change and app focus (Capacitor `appStateChange`)
- Add a sign-in surface: magic link email input in the Settings page (beneath the export section)
- Show sync status indicator (syncing / synced / offline) in the Settings page
- Run `supabase/schema.sql` in the Supabase dashboard to create tables

### E5 — Embedding/Vibe Search (B4)
**Status**: `[ ]` Blocked until E4 (Supabase + pgvector)  
**What to do**: Embed clip descriptions + substance text via Claude Embeddings API; store in Supabase pgvector; add semantic search input to inbox ("minimalist cafe Tokyo")

### E6 — Shared Boards (C3)
**Status**: `[ ]` Blocked until E4  
**What to do**: Share a board via a read-only link; viewer sees items + map; collaborator mode (join board) in a future update

---

## PHASE F — App Store & Production Readiness

### F1 — Capacitor Local Notifications
**Status**: `[ ]` Not started  
**Needs**: `@capacitor/local-notifications` (add to package.json)  
**What to do**:
- On trip plan generation: schedule a local notification for the first day of the trip ("Your Tokyo trip starts today! Tap to open your itinerary")
- On boarding the app with unplanned boards: schedule a weekly "You have unvisited boards" reminder
- Use `@capacitor/local-notifications` — no server required

### F2 — App Icon & Splash Screen
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `public/icon-192.png`, `public/icon-512.png`  
**What to do**:
- Create a proper app icon: indigo background (#6366F1) + white map pin SVG, exported to all required iOS sizes (20, 29, 40, 60, 76, 83.5, 1024 @1x/2x/3x)
- Replace the placeholder icon in the iOS Xcode project
- Update `public/icon-192.png` + `public/icon-512.png` for the PWA manifest
- Provide a script `scripts/generate-icons.sh` using ImageMagick (or Rsvg) for reproducibility

### F3 — Performance Audit
**Status**: `[ ]` Not started  
**What to do**:
- Audit Lighthouse mobile score; target ≥90 Performance
- Optimize OG:image thumbnails: on enrichment, fetch + store a 400px WebP data URI instead of the full-res URL
- Defer non-critical map CSS
- Add `next/image` for any `<img>` tags that use external URLs (thumbnails from OG tags)

### F4 — Accessibility Pass
**Status**: `[ ]` Not started  
**What to do**:
- Add `aria-label` to all icon-only buttons (FAB, close buttons, map controls)
- Ensure all interactive elements meet 44×44pt minimum tap target
- Run Axe (or browser DevTools accessibility audit) and fix all critical/serious findings
- Add `role="status"` and `aria-live="polite"` to enrichment loading states

### F5 — Error Resilience & Offline UX
**Status**: `[ ]` Not started  
**Files**: `app/layout.tsx`, new `components/ErrorBoundary.tsx`  
**What to do**:
- Add a React error boundary in layout.tsx that catches unhandled JS errors and shows a graceful "Something went wrong. Tap to reload." screen
- Offline indicator: listen to `navigator.onLine` + `window.offline` event; show a subtle banner "No connection — using saved data"
- When `/api/import` or `/api/plan` returns an error, show an actionable message (not just "Failed")
- Add a retry button to every error state

---

## Completed Tasks

*(Phases A–C completed; see task entries above for implementation details)*
