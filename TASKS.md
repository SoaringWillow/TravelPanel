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

## PHASE D — iOS Polish & App Store Readiness

> Goal: Ship a beautiful, crash-free iOS app that passes App Store review. These tasks transform the functional MVP into a polished, native-feeling product.

### D1 — Haptic Feedback
**Status**: `[x]` Done  
**Files**: New `lib/haptics.ts`, `app/share/page.tsx`, `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Create `lib/haptics.ts` wrapping `@capacitor/haptics` (already a Capacitor plugin): `feedback(style: 'light'|'medium'|'heavy'|'success'|'warning'|'error')` that no-ops on web
- On clip save success → `success` haptic
- On pin tap on map → `light` haptic
- On board select in share page → `light` haptic
- On enrichment failure → `warning` haptic
- On delete item → `medium` haptic

### D2 — Skeleton Loading States
**Status**: `[x]` Done  
**Files**: New `components/SkeletonCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/boards/[id]/page.tsx`  
**What to do**:
- Create `SkeletonCard.tsx` with a pulsing shimmer animation (3-line placeholder matching InboxCard proportions)
- Replace the spinner in InboxPage, BoardsPage, and BoardDetailPage with 6 skeleton cards during loading
- Implement shimmer via CSS animation (already have `@keyframes` in globals.css — add `shimmer-pulse`)
- SkeletonCard should match the exact height/layout of InboxCard so content pop-in is seamless

### D3 — PWA / Offline Mode
**Status**: `[x]` Done  
**Files**: `next.config.js`, new `public/sw.js` or use `next-pwa`  
**What to do**:
- Install `next-pwa` and configure in `next.config.js`
- Cache all static assets + the Next.js app shell
- Cache the last-fetched MapLibre tiles for offline map browsing
- Show an "Offline" banner when network is unavailable (`navigator.onLine` + `online`/`offline` events)
- The share page should queue failed enrichments to retry when back online (already handled by retry queue)
- Add `public/manifest.json` with proper PWA metadata, icons, theme color (#4f46e5)

### D4 — Privacy Policy + Terms of Service
**Status**: `[x]` Done  
**Files**: New `app/legal/privacy/page.tsx`, new `app/legal/terms/page.tsx`, `app/settings/page.tsx`  
**What to do**:
- Create `/legal/privacy` page with a well-formatted privacy policy covering: data stored locally (IndexedDB), data sent to Anthropic API (URLs + page text), PostHog analytics (anonymous), no account required, no data sold
- Create `/legal/terms` page with short, friendly ToS
- Add links to both from the Settings page (About section)
- These pages must exist for App Store review — Apple requires a privacy policy URL

### D5 — Error Boundaries + Crash Recovery
**Status**: `[x]` Done  
**Files**: New `components/ErrorBoundary.tsx`, `app/layout.tsx`  
**What to do**:
- Create a React ErrorBoundary class component that catches render errors
- Show a friendly recovery UI: "Something went wrong" + "Restart app" button that calls `window.location.reload()`
- Wrap the main layout in the error boundary
- Log errors to PostHog (`track('app_crash', { error: err.message })`)
- Add a `resetKeys` prop that resets the boundary when route changes

### D6 — Swipe Gestures on Clip Cards (iOS native feel)
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add swipe-to-delete gesture on InboxCard using `framer-motion` drag constraints
- Swipe left reveals a red delete zone (trash icon) — release past 60% reveals the delete action
- Swipe right reveals a "Move to board" action (use existing move-to-board logic)
- Add a subtle haptic on swipe threshold cross (via D1 haptics lib)
- Matches iOS Mail/Reminders-style interaction pattern

### D7 — App Icon Polish + Launch Screen
**Status**: `[x]` Done  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `ios/App/App/Assets.xcassets/Splash.imageset/`  
**What to do**:
- Design the app icon: the indigo 📍 pin logo on a white/gradient background — at minimum generate a production-quality SVG specification that can be rendered at all required iOS sizes (20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt)
- Create a `public/icon-spec.svg` with the definitive icon vector (so it can be rasterized by any tool)
- Update the Xcode project's `AppIcon.appiconset/Contents.json` to reference the correct files
- Specify the launch screen: solid indigo #4f46e5 background + centered white 📍 icon

---

## PHASE E — Authentication & Cloud Activation

> Goal: Activate Supabase to enable cross-device sync, account-based features, and the collaborative roadmap. Blocked on `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### E1 — Activate Supabase B1 (Pending Keys)
**Status**: `[ ]` Blocked on Supabase keys  
**Prerequisite**: User provides `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**What to do** (once keys exist):
- Create Supabase project at supabase.com → Settings → API → copy keys
- Run `supabase/schema.sql` in the Supabase SQL editor
- Add keys to Vercel environment variables
- Enable Google provider in Supabase Auth dashboard
- Uncomment/activate the auth UI surface (sign-in button in Settings page)
- Wire `cloudSync.syncNow()` on: auth state change, app focus event, after item save
- Test: save a clip on one device, verify it appears on another after sign-in

### E2 — Sign In with Apple
**Status**: `[ ]` Not started  
**Prerequisite**: E1 activated  
**Files**: `app/settings/page.tsx`, `lib/supabase.ts`, `capacitor.config.ts`  
**What to do**:
- Install `@capacitor-community/apple-sign-in` Capacitor plugin
- Add Apple Sign In capability in Xcode (Signing & Capabilities)
- Add Apple as auth provider in Supabase dashboard
- In the Settings page, add "Sign in with Apple" button that calls the native Apple Sign In → exchanges token with Supabase → activates cloud sync
- Required by App Store guidelines if any social sign-in is offered

### E3 — Push Notifications for Resurfacing
**Status**: `[ ]` Not started  
**Prerequisite**: E1 activated, native iOS build  
**Files**: `components/CapacitorBridge.tsx`, new `app/api/push/route.ts`, `ios/App/App/AppDelegate.swift`  
**What to do**:
- Install `@capacitor/push-notifications`
- Request notification permission on first meaningful engagement (not on launch)
- Register device token with Supabase (store in user profile)
- Server-side: schedule daily push using Supabase Edge Functions triggered by pg_cron:
  - "You have 3 saved spots in Tokyo — it's cherry blossom season 🌸"
  - Uses the C4 seasonal logic but as a server-side push
- Deep link: push notification opens the app and opens the relevant item

### E4 — Embedding / Vibe Search (B4 — Needs Supabase pgvector)
**Status**: `[ ]` Blocked on E1  
**What to do**: 
- Enable pgvector extension in Supabase
- On clip save, generate embeddings for: title + substance items combined text
- Store embedding vector in Supabase `items` table
- Add a "Vibe Search" mode to SearchBar: "minimalist cafe Tokyo", "hidden beach", "budget street food"
- Use Supabase's vector similarity search (`<=>` operator) to find matching clips
- Show vibe search results in a separate "AI Search" section below keyword results

---

## PHASE F — Growth, Monetization & Scale

> Goal: Make TravelPanel a business. These tasks unlock distribution, revenue, and viral loops.

### F1 — App Store Connect Setup
**Status**: `[x]` Done  
**What to do**:
- Create app listing in App Store Connect
- Write app store metadata: name "TravelPanel", subtitle "AI Travel Inspiration", description (highlight: substance over spots, Share Extension, AI planning), keywords
- Prepare 6.7" and 6.1" iPhone screenshots (5 required): Map view, Clip flow, Substance wisdom view, Trip plan, Shared board
- App Store category: Travel (primary), Reference (secondary)
- Age rating: 4+ (no objectionable content)
- Privacy policy URL: `https://your-app.vercel.app/legal/privacy`
- Prepare TestFlight build for internal testing

### F2 — Pro Tier Gating (Soft Paywall)
**Status**: `[x]` Done  
**Files**: New `lib/pro.ts`, `app/api/plan/route.ts`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `lib/pro.ts` with `isPro(): boolean` that checks a Supabase subscription flag (initially always false — builds the infrastructure)
- Gate: unlimited plan generation (free = 3/month), Vision extraction (free = 5/month), shared board imports (free = 10/month)
- When limit hit: "You've reached the free limit. TravelPanel Pro — coming soon" interstitial with email capture
- Capture interested emails in a Supabase `waitlist` table
- This builds a waitlist before the paywall goes live

### F3 — Referral Loop from Shared Boards
**Status**: `[x]` Done  
**Files**: `lib/shareBoard.ts`, `app/import-board/page.tsx`  
**What to do**:
- Add `referrer` field to the shared board URL (user's anonymous ID from PostHog)
- On import, track `board_imported` event with referrer to PostHog
- Show "Made with TravelPanel — Get it free" banner at the bottom of the import-board page
- Link to the App Store (or web app) with UTM tracking
- Measure: board_shared → board_imported conversion rate in PostHog

### F4 — Smart Auto-Collections
**Status**: `[x]` Done  
**Files**: New `lib/autoCollect.ts`, `app/boards/page.tsx`  
**What to do**:
- Analyze all clips on app open and automatically group them into smart collections:
  - By region: cluster location coordinates into geographic groups (Tokyo, Kyoto, Bali, etc.)
  - By cuisine tag: clips tagged "food" grouped by region
  - By substance type: all clips with "warning" substance → "Avoid These Mistakes" collection
- Show auto-collections in a new "Discover" section at the top of the Boards page (distinct from user-created boards, non-destructive — just views)
- Auto-collections update when new clips are saved

---

## PHASE G — iOS Polish & Production Readiness

> Goal: Ship a genuinely beautiful, complete iOS app. Each task targets a specific gap between the current state and App Store quality.

### G1 — Onboarding Flow (First-Launch Experience)
**Status**: `[x]` Done  
**Files**: New `app/onboarding/page.tsx`, `components/OnboardingSlide.tsx`, `lib/hasSeenOnboarding.ts`  
**What to do**:
- Create a 4-slide onboarding carousel shown only on first launch (check `localStorage`)
- Slide 1: "Save from any travel app" — Share Extension illustration
- Slide 2: "AI extracts the wisdom, not just the pins" — substance emphasis
- Slide 3: "Plan trips from your saved clips" — planner preview
- Slide 4: "All yours, no account needed" — privacy first
- Each slide: full-screen, illustration area (emoji or SVG), title, subtitle
- "Get Started" on final slide sets `tp_onboarded=true` in localStorage and pushes to `/`
- `lib/hasSeenOnboarding.ts`: `hasOnboarded(): boolean`, `markOnboarded(): void`
- Check on root `/` — if `!hasOnboarded()`, redirect to `/onboarding`

### G2 — Deep Link Clip Preview
**Status**: `[ ]` Not started  
**Files**: `app/share/page.tsx`, `components/ClipPreviewCard.tsx`  
**What to do**:
- Before saving, show a rich preview of what will be extracted: platform badge, title, first 2 extracted locations (as pills), first substance tip
- "Save this clip" confirmation button — not auto-save on arrival
- "Edit before saving" lets user remove individual locations or substance items
- This addresses the pattern where users share a URL, the clip saves immediately, and they have no idea what was extracted
- Show extraction result as an expandable preview with tabs: Spots | Tips | Details

### G3 — Clip Full-Screen Detail View
**Status**: `[x]` Done  
**Files**: New `app/clips/[id]/page.tsx`  
**What to do**:
- Full-screen view for a single saved clip
- Header: thumbnail (full width, aspect 16:9), title, platform badge, save date
- Sections: Locations (list with lat/lng chips + "View on map" per location), Substance (full SubstanceList with type icons), Tags, Source URL
- Edit mode: inline editable title + description fields, save changes to IndexedDB
- Delete from this view
- Share this clip as a standalone share (not board-level)
- Route: `/clips/[id]` — link from InboxCard (tap anywhere on card body navigates here)

### G4 — Map Clustering
**Status**: `[ ]` Not started  
**Files**: `components/MapView.tsx`, `lib/clusterPoints.ts`  
**What to do**:
- When 10+ clips are in view, cluster nearby pins into a single circle showing the count
- Tap a cluster → zooms in to reveal individual pins
- Use a simple radius-based clustering algorithm (no external lib needed — just group pins within N degrees)
- Cluster marker: indigo circle with white count number, scales with cluster size
- This prevents the map from becoming unusable with 50+ clips

### G5 — Haptic Choreography Audit
**Status**: `[ ]` Not started  
**Files**: `app/share/page.tsx`, `app/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Audit all primary interactions and ensure every meaningful action has a haptic:
  - Share Extension clip saved: `feedback('success')` — green flash + haptic
  - Board created: `feedback('medium')`
  - Plan generated (complete): `feedback('success')`
  - Delete confirmed: `feedback('warning')`  
  - Swipe threshold cross: `feedback('light')` (already done in D6)
  - GPS acquired: `feedback('light')`
  - Pro gate shown: `feedback('warning')`
- Add a "Haptics" toggle in Settings that sets `tp_haptics=false` to disable all
- Update `feedback()` in `lib/haptics.ts` to check this flag

### G6 — Trip Plan PDF Export
**Status**: `[ ]` Not started  
**Files**: `lib/exportPlan.ts`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- The `exportPlanToPDF` function exists but needs a proper layout
- Generate HTML string → `window.print()` with print-specific CSS that:
  - Hides the map, nav buttons, and control UI
  - Shows: board name, dates, each day's activities with addresses and tips
  - Inline source citations: "per [clip title]"
  - Footer: "Generated by TravelPanel on [date]"
- Also improve the ICS export: add location field (use first location's address if available)

### G7 — Search Across Clips
**Status**: `[x]` Done  
**Files**: New `app/search/page.tsx`, new `lib/search.ts`  
**What to do**:
- Fuzzy text search across: title, description, location names, tags, substance content
- Ranked results: exact title match > location name > tag > substance keyword
- Search page (`/search`): full-screen search bar at top, results list below
- Highlight matching terms in results
- Add search icon to the main map header and boards header
- Debounce input (300ms) — search is entirely local/in-memory (no server)
- `lib/search.ts`: `searchItems(query, items): SearchResult[]`

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
