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
**Status**: `[ ]` Blocked — needs Supabase cloud sync (B1 keys required)

### C4 — Proactive Resurfacing
**Status**: `[x]` Done

---

## PHASE D — iOS Polish & App Store Readiness

> Goal: ship a beautiful, native-feeling iOS app that passes App Store review.
> All Phase A–C tasks (except B4/C3 which need Supabase) are done.
> Phase D focuses on quality, visual polish, and iOS-specific requirements.

### D1 — Privacy Usage Strings
**Status**: `[x]` Done  
**Files**: `ios/App/App/Info.plist`  
**What was done**: Added `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription` — required by iOS before any permissions can be requested. Without these, GPS and photo-library features silently fail.

### D2 — Dark Mode Support
**Status**: `[x]` Done  
**Files**: `app/globals.css`, `tailwind.config.js`, key components  
**What to do**:
- Add `dark:` Tailwind variants to all major components (MapView overlay, InboxCard, NavBar, share page, plan view)
- Set `color-scheme: light dark` meta tag in `app/layout.tsx`
- Update `ios/App/App/Info.plist` to respect `UIUserInterfaceStyle: Automatic`
- Use CSS variables for core colors so one toggle flips the whole app

### D3 — Haptic Feedback on Key iOS Actions
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `components/InboxCard.tsx`, `hooks/useHaptic.ts` (new)  
**What to do**:
- Create `useHaptic` hook wrapping `@capacitor/haptics` (already available via Capacitor)
- Fire `ImpactStyle.Medium` on: clip saved, board created, plan generated
- Fire `NotificationType.Success` on: enrichment complete
- Fire `NotificationType.Error` on: enrichment failed after 3 retries
- No-op gracefully in web context

### D4 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Wrap InboxCard in a swipeable container using `framer-motion` drag gesture
- Swipe left > 40% of card width → show red delete background + trash icon
- Release past threshold → delete with spring-out animation
- Should feel like native iOS Mail / Reminders swipe-to-delete

### D5 — Plan View Visual Polish
**Status**: `[x]` Done  
**Files**: `components/DayStripCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Redesign DayStripCard to use a vertical timeline layout (similar to C2 board timeline) with activity cards that surface sourced tips
- Add day thumbnail collage: 3 location thumbnails stitched into a cover strip per day
- Improve the plan generation progress UI: show each agent step with a bouncing indicator
- Add a "Share plan" button that generates a clean screenshot-able summary card

### D6 — Illustrated Empty States
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create SVG illustrations for: empty inbox, empty board, no plan generated yet
- Each empty state has a large illustration, a headline, a 1-line explanation, and a CTA button
- Inbox empty: "Your inspiration board is empty — share from Instagram, Xiaohongshu, or YouTube"
- Boards empty: "No collections yet — create one to organize your clips"
- Plan empty: "Plan your trip — AI will build a day-by-day itinerary from your saved places"

### D7 — iOS App Icon Set
**Status**: `[x]` Done  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`  
**What to do**:
- Design a single 1024×1024 master icon: dark indigo rounded background + white travel pin (SVG-first)
- Generate all required iOS sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024 (all @1x and @2x)
- Update `Contents.json` in the AppIcon appiconset to reference all generated files
- Tip: use the same icon geometry as the browser extension (`extension/generate-icons.js`) scaled up

### D8 — Clip Editing (title + notes)
**Status**: `[x]` Done  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add an "Edit" button to the LocationDetailCard that opens an inline edit form
- Editable fields: title, notes (free text, multi-line), tags (chip selector)
- Save persists to IndexedDB; update the item in the `items` store
- "Notes" field is already in the SavedItem type (optional string) but never shown or editable

### D9 — App Store Metadata & Screenshots
**Status**: `[x]` Done  
**Files**: New `appstore/` directory  
**What to do**:
- Write `appstore/description.txt` — App Store long description (4000 chars max)
  - Lead with "Save travel inspiration from any app in 2 taps"
  - Bullet the substance moat: "extracts tips, warnings, and hidden wisdom — not just map pins"
  - Mention plan generation, offline-first, export
- Write `appstore/keywords.txt` — 100 char keyword string
- Create `appstore/SCREENSHOTS.md` — screenshot shot list for Simulator
  - 5 required iPhone 6.7" and 6.9" screenshots
  - Shot 1: Map with clustered pins + nearby banner
  - Shot 2: Inbox grid with substance count badges
  - Shot 3: Share sheet board picker (mid-save from Instagram)
  - Shot 4: Trip plan with sourced tips inline
  - Shot 5: Board timeline view

### D10 — PWA Manifest & Meta Tags
**Status**: `[x]` Done  
**Files**: `public/manifest.json`, `app/layout.tsx`  
**What to do**:
- Create `public/manifest.json` with name, short_name, icons, theme_color (#6366f1), display: standalone
- Add `<link rel="manifest">`, `<meta name="theme-color">`, and `<meta name="apple-mobile-web-app-capable">` to layout.tsx
- Add `apple-touch-icon` links (180×180 and 152×152) — reference the icons from D7
- Ensure the web app installs cleanly to iPhone home screen from Safari as a fallback to the native Capacitor app

---

## PHASE E — Power User Features (Post-Launch)

> These features are unlocked after 1,000 active users. Don't build early.

### E1 — Global Search Across All Boards
**Status**: `[x]` Done  
**What to do**: Extend the existing `searchItems` utility to search across board-assigned items too. Add a "Global" toggle to the search bar that searches everything, not just Inbox.

### E2 — Board Cover Customization
**Status**: `[x]` Done  
**What to do**: Let users pick a clip thumbnail as the board cover. Store as `coverThumbnail` on the Board object (field already exists). Show in board list as a full-bleed card rather than emoji.

### E3 — Trip Itinerary Polish: Drag-Reorder Days
**Status**: `[x]` Done  
**What to do**: Allow dragging day cards to reorder the generated itinerary. Persist the reordered plan to IndexedDB. Use framer-motion's drag-to-reorder pattern.

### E4 — iOS Home Screen Widget
**Status**: `[ ]` Not started  
**Needs**: WidgetKit (Swift native — not web/Capacitor)  
**What to do**: Small widget showing the next location from an active trip plan. Medium widget showing "3 places saved near you". Blocked on native Swift implementation.

### E5 — Siri Shortcuts Integration
**Status**: `[ ]` Not started  
**Needs**: AppIntents (Swift native)  
**What to do**: "Hey Siri, clip this" opens TravelPanel Share Extension. "Hey Siri, what's near me on TravelPanel" opens Near Me inbox view.

### E6 — Enrichment Cost Dashboard (Admin)
**Status**: `[x]` Done  
**What to do**: A hidden `/admin` route (password-gated) showing: total enrichments this month, average tokens per enrichment, total API cost estimate, top-clipped domains, daily active users estimate from analytics.

---

## PHASE F — App Store Readiness & Quality Hardening

> Goal: ship to TestFlight. Fix every crash path, polish every visible screen, make enrichment bulletproof.

### F1 — Enrichment Retry Queue (Background)
**Status**: `[x]` Done  
**Files**: `lib/enrichItem.ts`, `hooks/useEnrichmentRetry.ts`, service worker or `useEffect` on mount  
**What to do**:
- On app mount, scan all items with `enrichmentStatus === 'failed'` and `retryCount < 3`
- Re-enrich them automatically (exponential backoff: 30s, 2min, 10min based on retryCount)
- Show a subtle "Retrying X clips…" status in the inbox header while retries are in flight
- Fire `hapticNotification('success')` per item when enrichment succeeds after retry

### F2 — Crash-Free Enrichment (Error Boundaries)
**Status**: `[x]` Done  
**Files**: `app/layout.tsx`, `components/ErrorBoundary.tsx` (new)  
**What to do**:
- Create a React ErrorBoundary component that catches render errors
- Wrap the root layout with it; show a graceful "Something went wrong" screen with a "Reload" button
- Prevent blank white screens on unhandled promise rejections in Safari/iOS WebView
- Add `window.addEventListener('unhandledrejection', ...)` logger to the CapacitorBridge

### F3 — Onboarding Flow (First Launch)
**Status**: `[x]` Done  
**Files**: `app/onboarding/page.tsx` (new), `lib/db.ts`  
**What to do**:
- 3-screen swipeable onboarding shown only on first launch (store flag in localStorage)
- Screen 1: "Clip from any app" — animated Share Sheet illustration
- Screen 2: "AI extracts the wisdom" — substance vs. spots side-by-side
- Screen 3: "Plan your trip" — map with route illustration
- CTA: "Get started" → creates a demo board, drops user on map
- Skip button always visible

### F4 — Substance Detail View
**Status**: `[x]` Done  
**Files**: `components/SubstanceList.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Currently SubstanceList just shows a list of tips. Add visual hierarchy:
  - Type badges (🟡 Tip / 🔴 Warning / 💬 Opinion / 🌸 Wisdom) with colour coding
  - `applies_to` shown as a small grey pill under the content
  - `source_quote` shown in a subtle blockquote style (italic, left border)
- Expand/collapse if more than 4 items (show "See all X tips" button)
- This surfaces the substance moat directly in the detail view

### F5 — Location Detail: Open in Maps
**Status**: `[x]` Done  
**Files**: `components/LocationDetailCard.tsx`  
**What to do**:
- Add "Open in Maps" button to each location in the LocationDetailCard
- On iOS: opens `maps://` URL with lat/lng; on Android: `geo:` URL; on web: Google Maps URL
- Use `Capacitor.getPlatform()` to pick the right URL scheme
- Small icon button, placed inline with each location row

### F6 — Import Sheet Polish (URL Preview)
**Status**: `[x]` Done  
**Files**: `components/ImportSheet.tsx`  
**What to do**:
- When a URL is pasted into the import field, immediately show a platform chip + domain preview
- Add a "Paste from clipboard" button that reads `navigator.clipboard.readText()`
- Show a subtle shimmer loading state while Claude is processing (not just a spinner)
- After save: show a mini success card with location count before the sheet closes

### F7 — Map Cluster Labels
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`  
**What to do**:
- Currently pins are individual dots; at high zoom-out, 50+ pins become unreadable
- Implement simple client-side clustering: group pins within 50px of each other at current zoom
- Show cluster markers with count badge (`+12`) in indigo
- Tapping a cluster zooms into the cluster bounds
- Use MapLibre's built-in cluster layer (GeoJSON source with `cluster: true`)

### F8 — Substance Search Filter
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `lib/searchItems.ts`  
**What to do**:
- Add "Has tips" filter chip to the inbox filter row (alongside platform chips)
- When active: filters to only items with `substance.length > 0`
- Show tip count badge on matching items in the grid
- This surfaces the wisdom layer as a first-class filter, not just a badge

### F9 — Plan Share Card (Screenshot)
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, new `components/PlanShareCard.tsx`  
**What to do**:
- "Share plan" button in the complete state generates a screenshot-able summary card
- Card shows: board emoji + name, day count, top 5 locations, Claude badge
- Use `html2canvas` or `dom-to-image` to capture the card as a PNG
- On iOS: share via `navigator.share({ files: [blob] })`; on web: download PNG
- Design: white card, indigo header strip, clean minimal layout

### F10 — Offline Map Tiles Cache
**Status**: `[x]` Done  
**Files**: `public/sw.js` (service worker), `components/MapView.tsx`  
**What to do**:
- Register a service worker that caches OpenFreeMap tile responses
- Cache strategy: stale-while-revalidate for map tiles (up to 200MB)
- Show "Offline" badge on the map when navigator.onLine is false
- Tiles already viewed in the current session remain accessible offline

---

## PHASE G — Growth & Retention

> Features that drive habit formation and word-of-mouth. Build after TestFlight.

### G1 — Push Notifications (iOS)
**Status**: `[x]` Done (local notifications — no APNs required; Capacitor LocalNotifications on native, Web Notifications API on web)  
**Needs**: `@capacitor/push-notifications`, APNs certificate  
**What to do**: "You have 3 saved places near you" local push when app is backgrounded and GPS detects proximity. Also: "Your trip plan is ready" when long-running plan completes.

### G2 — Trip Sharing (Read-Only Link)
**Status**: `[ ]` Not started  
**Needs**: Vercel KV or Supabase  
**What to do**: Generate a `travelpanel.app/plan/[shareId]` URL that shows a read-only version of the plan. Store plan JSON in KV with 90-day TTL. Share via native share sheet.

### G3 — iCloud Sync
**Status**: `[ ]` Not started  
**Needs**: Capacitor community plugin or native Swift  
**What to do**: Sync IndexedDB → CloudKit via background sync. Fallback: export/import JSON manually (already done in D5). Required for multi-device scenario.

### G4 — Widgets (iOS 16+ interactive)
**Status**: `[ ]` Not started  
**Needs**: WidgetKit + AppIntents (Swift — same as E4/E5)  
**What to do**: Interactive widget showing next trip day with "Check in" action to mark a day complete. Builds on E4 (home screen widget).

### G5 — AI Chat Interface for Trip Planning
**Status**: `[x]` Done  
**What to do**: Replace the static day slider + chip preferences with a conversational interface. User can say "move the beach day to Day 1" or "add a vegetarian restaurant near the temple". Requires streaming Claude API with tool calls to mutate the plan.

---

## PHASE H — Premium Polish & Retention Hooks

> Goal: turn the app from "interesting tool" to "daily companion." These tasks address the biggest remaining gaps in UX quality, retention, and data safety — all buildable without Supabase or native Swift.

### H1 — Demo Board on First Launch
**Status**: `[x]` Done  
**Files**: `app/onboarding/page.tsx`, `lib/db.ts`, new `lib/demoData.ts`  
**What to do**:
- Create `lib/demoData.ts` with 3 realistic synthetic clips (Tokyo ramen alley, Paris Marais, Kyoto bamboo grove), each with `substance` items pre-populated
- In `markOnboardingDone()`, call `seedDemoBoard()` which inserts a "🌏 Explore Ideas" demo board with those clips and marks them `isDemo: true`
- Change the "Get started" CTA in onboarding to navigate to that board's plan page instead of `/`
- Add a "Clear demo content" button in Settings (or admin) that removes items where `isDemo === true`
- Why: empty map on first launch is the #1 reason users churn in minute 1

### H2 — JSON Data Backup (Export + Import)
**Status**: `[x]` Done  
**Files**: new `lib/backup.ts`, `app/settings/page.tsx` (new)  
**What to do**:
- Create `lib/backup.ts` with `exportAllData()` → serializes all boards + items to JSON → triggers download via `navigator.share` (iOS) or anchor download (web)
- Add `importFromJSON(file)` which reads a backup file, merges boards/items (skip duplicates by id)
- Create `app/settings/page.tsx` — a simple settings screen with: Export backup button, Import backup button (file picker), Clear all data (with confirmation), App version
- Add "Settings" entry to NavBar (gear icon replacing a less-used tab, or as a header button)
- Why: data loss on device wipe is existential; users need backup before switching phones

### H3 — Activity Check-in (Live Trip Mode)
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`  
**What to do**:
- Add a checkbox (or tap-to-complete) to each activity card in the plan complete view
- Store checked activity state in the `Trip` object: `checkedActivities: Record<dayIndex, Set<activityIndex>>`
- Show a day progress bar: "2 / 5 done today" above the activity list
- Checked activities get a strikethrough + lighter opacity with a green checkmark
- Persist immediately to IndexedDB on check/uncheck (reuse `saveTrip`)
- Why: users return to the plan repeatedly during the trip; engagement driver

### H4 — Clip Deduplication Guard
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `components/ImportSheet.tsx`, `lib/db.ts`  
**What to do**:
- Before saving a new clip, check `getAllItems()` for an existing item with matching `url` (normalise: strip trailing slash, lowercase scheme)
- If duplicate found: show a toast "Already saved — tap to view it" with the existing item's title and a "View" button that opens the detail card
- Allow force-save via "Save anyway" for intentional duplicates (e.g. revisiting same restaurant)
- Add a `findByUrl(url)` helper to `lib/db.ts`
- Why: users who actively clip often double-save; duplicates pollute the map and inflate counts

### H5 — Thumbnail Fallback System
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `components/BoardCard.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Replace `<img onError=hide>` pattern with a graceful fallback: a styled div showing platform gradient background + first letter of title
- Create `components/ClipThumbnail.tsx` — wraps `<img>` with a fallback that renders platform color + emoji when image fails or is absent
- Use `PLATFORM_COLORS` for the gradient and `PLATFORM_LABELS` initial for the letter
- Apply everywhere thumbnails are shown: InboxCard, BoardCard cover, LocationDetailCard header, PlanShareCard
- Why: Xiaohongshu/WeChat block thumbnail scraping → half the inbox shows broken/empty images; this makes every card look intentional

### H6 — Batch Select & Manage in Inbox
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Long-press any InboxCard to enter "selection mode" (use framer-motion press duration or `onLongPress` via pointer events)
- In selection mode: cards show a checkbox overlay in the top-left corner; tapping a card toggles its selection
- Show a sticky action bar at the bottom (above NavBar): "X selected · Move to board · Delete"
- Exit selection mode by pressing X in the action bar or tapping an empty area
- Persist the board-move and delete actions the same way single-item actions work
- Why: power users with 50+ clips need bulk operations to stay organized

### H7 — Map Fullscreen Mode
**Status**: `[x]` Done  
**Files**: `app/page.tsx`, `components/MapView.tsx`  
**What to do**:
- Add a "↗ Expand" button (top-right of map area) that toggles the map to cover the full screen including nav bar
- In fullscreen mode: NavBar is hidden, map fills viewport, a "✕ Close" button appears in top-left
- Swipe up from the bottom edge to restore the panel (framer-motion drag gesture)
- Animate with a smooth height transition (spring, 400ms)
- Why: the map is the #1 feature; on mobile it's cramped by headers/tabs; fullscreen makes it feel like a native maps app

### H8 — Clip Search with Semantic Highlight
**Status**: `[x]` Done  
**Files**: `lib/searchItems.ts`, `components/InboxCard.tsx`  
**What to do**:
- Extend `searchItems()` to return match positions alongside each result: `{ item, matchField: 'title' | 'substance' | 'notes' | 'tag', matchSnippet: string }`
- In InboxCard, when `matchSnippet` is present, show it as a small highlight row below the card title (max 1 line, with the matched term bolded)
- Use a simple regex to find and bold the matching term in the snippet
- Why: with 50+ clips, knowing *why* a clip matched the search (substance content vs. just title) helps users find the right clip faster

### H9 — Onboarding: Substance Value Demonstration
**Status**: `[x]` Done  
**Files**: `app/onboarding/page.tsx`  
**What to do**:
- Replace the static SVG illustration on Screen 2 (AI extracts the wisdom) with an animated "before/after" demo
- Left side: raw Instagram-style post with a location pin
- Right side: the extracted wisdom card with colour-coded badges (🟡 Tip, 🔴 Warning, 🌸 Good to know)
- Animate the cards sliding in one-by-one with a 400ms stagger (framer-motion)
- This directly visualises the substance moat to new users who've never seen the extraction in action
- Why: onboarding Screen 2 is the most important pitch — it's why TravelPanel > competitors who only save pins

### H10 — Settings Page & Data Management
**Status**: `[x]` Done  
**Files**: new `app/settings/page.tsx`, `components/NavBar.tsx`  
**What to do**:
- Create a Settings page at `/settings` with sections:
  - **Data**: Export backup (JSON), Import backup, Clear all demo content
  - **Appearance**: Dark mode toggle (override system preference, stored in localStorage)
  - **About**: App version (`package.json` version), GitHub link, feedback mailto
- Add "Settings" tab to NavBar (gear icon) replacing the least-used tab, or as an icon in the inbox header
- Dark mode toggle writes `force-dark` / `force-light` to localStorage and overrides the system pref in the existing dark mode script
- Why: users expect a settings page; currently there's no way to explicitly toggle dark mode or manage data

---

## PHASE I — Data Integrity, Polish & Retention Depth

> Goal: every "it'd be nice if" gap that makes the app feel unfinished on an iPhone. No infrastructure required — all tasks are pure client-side JS/React/IndexedDB.

### I1 — Trip Activity Progress Persistence
**Status**: `[x]` Done  
**Files**: `lib/types.ts`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add `checkedActivities?: Record<number, number[]>` to the `Trip` type (Sets aren't JSON-serializable, use arrays)
- In `toggleActivity()`, persist the updated check state to IndexedDB immediately using refs (avoids stale closure) 
- In `loadTrip()`, restore `checkedActivities` from the saved trip (convert `number[]` back to `Set<number>`)
- Why: users mark day activities done as they travel; losing that on refresh is data loss

### I2 — Board Cover Thumbnail Auto-Set
**Status**: `[x]` Done  
**Files**: `lib/db.ts`, `hooks/useBoards.ts`, `app/boards/page.tsx` (or wherever boards list renders)  
**What to do**:
- When an item with a thumbnail is added to a board (`addItemToBoard`), update the board's `coverThumbnail` to the item's thumbnail if the board doesn't already have one
- In the boards list page, render the `coverThumbnail` as a background image behind the board card, with the emoji + name overlaid
- Fall back to the emoji-on-gradient display when no thumbnail exists
- Why: boards page looks sparse (just emojis on white cards); cover photos make it feel alive and visually scannable

### I3 — Inline Clip Notes from Inbox
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `lib/db.ts`  
**What to do**:
- Add a "Add note" button (pencil icon) to the InboxCard footer (done state only)
- Tapping expands a single-line textarea inline (no sheet, no navigation); on blur, save to `item.notes` via `saveItem()`
- If `item.notes` already exists, show a truncated preview in the card footer with the edit button
- Why: capturing a quick note while browsing (e.g. "go in shoulder season") is currently a 4-tap operation (tap card → open detail → find notes field → type); inline saves that friction

### I4 — Map Cluster Tap — Item List Popover
**Status**: `[ ]` Not started  
**Files**: `components/MapView.tsx`  
**What to do**:
- When a cluster marker is tapped, show a compact bottom sheet listing all item titles in that cluster (up to 10, with count if more)
- Each row in the list is tappable and calls `onPinClick` with that item
- Dismiss on backdrop tap or drag-down gesture
- Why: currently tapping a cluster does nothing useful; users can't find the specific clip they're looking for when pins overlap

### I5 — Keyboard-Safe Import Sheet on iOS
**Status**: `[ ]` Not started  
**Files**: `components/ImportSheet.tsx`  
**What to do**:
- When the URL input field is focused, add `pb-[env(keyboard-inset-height,0px)]` padding to the sheet's scrollable area so the keyboard doesn't cover the paste button
- Use `visualViewport` resize listener as a fallback for older iOS: on `visualViewport.resize`, set a CSS variable `--kb-height` and apply it as bottom padding
- Why: on iPhone SE and iPhone 13 mini, the keyboard covers the URL input and paste button, making the import flow unusable

### I6 — Trip Day Notes
**Status**: `[ ]` Not started  
**Files**: `lib/types.ts`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add `notes?: Record<number, string>` to the `Trip` type for per-day notes
- In the plan view, below each day's activity list, add a "Day notes…" textarea (shows only when the day is active/expanded)
- Persist `notes` to the trip in IndexedDB on blur (same fire-and-forget pattern as I1)
- Show a small notepad icon in the day header when a day has notes
- Why: travelers need to capture real-world context ("Restaurant was closed — try the place next door") that the AI plan can't know

### I7 — Board Sort & Filter Bar
**Status**: `[ ]` Not started  
**Files**: `app/boards/page.tsx` (or the board detail page that lists items)  
**What to do**:
- In the board detail view (the page that lists clips in a board), add a sort bar: "Date added", "Most tips", "Platform"
- Sort is in-memory (no DB change needed)
- Remember the chosen sort in `sessionStorage`
- Why: boards with 20+ clips become hard to navigate; sort-by-tips lets users quickly find the highest-signal clips before trip planning

### I8 — Smart Empty State for Plan Page
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`, `components/EmptyState.tsx`  
**What to do**:
- When a board has 0 items with locations (the `hasLocations = false` branch), show a richer empty state with:
  - A visual showing the board emoji large + a "no pins yet" message
  - An "Add clips to this board" CTA that routes to Inbox with the board pre-selected as move target
  - A list of 3 example clip types that work well (Instagram reels, YouTube vlogs, 小红书 posts)
- Why: new users don't understand why the plan button is disabled; the empty state should teach them what to do

### I9 — Substance Highlight in Plan Activities
**Status**: `[ ]` Not started  
**Files**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- For each plan activity, if its `sourcedTips` array is non-empty, show a collapsible "From your clips" section below the activity time/name
- Each sourced tip shows: `💡 <content>` with a smaller `— from "<sourceTitle>"` attribution line
- Collapsed by default (show a "N tips from your clips" expand button); expand on tap
- Why: sourcedTips are already in the plan data but are currently invisible — this is the core substance moat surfaced at exactly the right moment (the user is about to go to that location)

### I10 — Substance Type Breakdown in Detail Card
**Status**: `[ ]` Not started  
**Files**: `components/LocationDetailCard.tsx`  
**What to do**:
- In LocationDetailCard, replace the flat "N tips" count badge with a breakdown row showing each type that's present: `💡 3 tips · ⚠️ 1 warning · 💬 1 opinion`
- Use the existing `SubstanceType` enum values to build the breakdown
- Tapping the row scrolls to / expands the SubstanceList section
- Why: substance type breakdown signals *what kind* of wisdom is in the clip at a glance, helping users prioritise which clips to read before visiting a place

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
