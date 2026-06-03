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
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Wrap InboxCard in a swipeable container using `framer-motion` drag gesture
- Swipe left > 40% of card width → show red delete background + trash icon
- Release past threshold → delete with spring-out animation
- Should feel like native iOS Mail / Reminders swipe-to-delete

### D5 — Plan View Visual Polish
**Status**: `[ ]` Not started  
**Files**: `components/DayStripCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Redesign DayStripCard to use a vertical timeline layout (similar to C2 board timeline) with activity cards that surface sourced tips
- Add day thumbnail collage: 3 location thumbnails stitched into a cover strip per day
- Improve the plan generation progress UI: show each agent step with a bouncing indicator
- Add a "Share plan" button that generates a clean screenshot-able summary card

### D6 — Illustrated Empty States
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create SVG illustrations for: empty inbox, empty board, no plan generated yet
- Each empty state has a large illustration, a headline, a 1-line explanation, and a CTA button
- Inbox empty: "Your inspiration board is empty — share from Instagram, Xiaohongshu, or YouTube"
- Boards empty: "No collections yet — create one to organize your clips"
- Plan empty: "Plan your trip — AI will build a day-by-day itinerary from your saved places"

### D7 — iOS App Icon Set
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`  
**What to do**:
- Design a single 1024×1024 master icon: dark indigo rounded background + white travel pin (SVG-first)
- Generate all required iOS sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024 (all @1x and @2x)
- Update `Contents.json` in the AppIcon appiconset to reference all generated files
- Tip: use the same icon geometry as the browser extension (`extension/generate-icons.js`) scaled up

### D8 — Clip Editing (title + notes)
**Status**: `[ ]` Not started  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add an "Edit" button to the LocationDetailCard that opens an inline edit form
- Editable fields: title, notes (free text, multi-line), tags (chip selector)
- Save persists to IndexedDB; update the item in the `items` store
- "Notes" field is already in the SavedItem type (optional string) but never shown or editable

### D9 — App Store Metadata & Screenshots
**Status**: `[ ]` Not started  
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
**Status**: `[ ]` Not started  
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
**Status**: `[ ]` Not started  
**What to do**: Extend the existing `searchItems` utility to search across board-assigned items too. Add a "Global" toggle to the search bar that searches everything, not just Inbox.

### E2 — Board Cover Customization
**Status**: `[ ]` Not started  
**What to do**: Let users pick a clip thumbnail as the board cover. Store as `coverThumbnail` on the Board object (field already exists). Show in board list as a full-bleed card rather than emoji.

### E3 — Trip Itinerary Polish: Drag-Reorder Days
**Status**: `[ ]` Not started  
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
**Status**: `[ ]` Not started  
**What to do**: A hidden `/admin` route (password-gated) showing: total enrichments this month, average tokens per enrichment, total API cost estimate, top-clipped domains, daily active users estimate from analytics.

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
