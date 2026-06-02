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

## PHASE D — iOS Beauty + Functional Completeness (Current Sprint)

> All Phase A–C tasks are done. Phase D is the push to a truly beautiful,
> production-quality iOS app that earns a 5-star App Store rating.
> Ordered by impact on UX and the core product promise.

### D1 — Wisdom Tab on Boards (per-board substance library)
**Status**: `[x]` Done  
**Why**: PRODUCT_STRATEGY.md identifies this as the "third primary surface" beyond Map and Plan. Every board should have a "Wisdom" tab showing all substance items extracted from its clips — browsable, grouped by type, searchable. This turns the clip corpus into a personal knowledge base.  
**Files to change**: `app/boards/[id]/page.tsx`, new `components/WisdomTab.tsx`  
**What to do**:
- Add a tab bar to the board detail page: "Places" | "Wisdom" | "Plans"
- WisdomTab shows all `substance` items from all clips in the board
- Group by type: 💡 Tips · ⚠️ Warnings · 💬 Opinions · 🧠 Wisdom · 🌍 Context · ⭐ Recommendations
- Each substance item shows its type icon, content, optional `applies_to`, and `source_quote`
- Attribution: tap a substance item to see which clip it came from
- Empty state: "Save clips to this board to see extracted tips and wisdom here"

### D2 — Duplicate Detection on Save
**Status**: `[x]` Done  
**Why**: Saving the same URL twice creates duplicates that pollute boards. PRODUCT_STRATEGY.md Phase A lists this as required. Users who re-share the same post from different devices will encounter this.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- In `handleSave`, before creating the item: check if an item with the same URL already exists in IndexedDB
- If duplicate found: show a sheet — "You already saved this! View it or save to a different board?"
- Options: "Go to existing clip" (router.push to map with flyTo), "Save again anyway", "Cancel"
- Track the duplicate detection event via PostHog

### D3 — Natural Language Plan Refinement
**Status**: `[x]` Done  
**Why**: PRODUCT_STRATEGY.md lists "plan iteration via natural language" as a key v2 UX upgrade. Currently users must regenerate a completely new plan. They should be able to say "more free time" or "remove Day 2" and get an updated plan.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`  
**What to do**:
- In the complete state, add a text input: "Refine this plan…" with placeholder examples ("more relaxed pace", "remove museums", "add a beach day")
- On submit: stream a new plan, passing the current plan AND the refinement instruction to the API
- Update `/api/plan/route.ts` to accept an optional `existingPlan` and `refinement` field
- The prompt should show the current plan and ask Claude to revise it per the instruction
- Saves as a new trip variant (same as current "generate" flow)

### D4 — Festival & Weather Enrichment Signals
**Status**: `[x]` Done  
**Why**: PRODUCT_STRATEGY.md identifies enrichment as the key differentiator from chatbot travel apps. "A plan for Tokyo in late March will recommend an itinerary without flagging Sakura season." This closes that gap.  
**Files to change**: `app/api/plan/route.ts`, new `lib/enrichmentSignals.ts`  
**What to do**:
- Create `lib/enrichmentSignals.ts` with a static dataset of major annual events:
  - Cherry Blossom (Tokyo/Kyoto, late March–early April, crowd: high, price: +40%)
  - Golden Week Japan (late April–early May, crowd: very high, price: +50%)
  - Songkran Thailand (April 13–15, crowd: high)
  - Diwali India (Oct/Nov, dates vary)
  - Lunar New Year (Jan/Feb, affects China/Vietnam/Korea)
  - Christmas Markets Europe (Dec 1–24)
  - Coachella (April, Palm Springs area, price: very high)
  - 20 more major events with location, dates, crowd level, price surge
- Detect which events overlap with the planner's destination and date range
- Inject as warnings into the plan prompt: "⚠️ Cherry Blossom peak Apr 1–14 in Tokyo: accommodation typically 40% above average, plan 2hr queues at popular spots"
- Show enrichment warnings as a styled `EnrichmentWarnings` section at the top of the plan

### D5 — iOS Haptic Feedback + Native UX Patterns
**Status**: `[x]` Done  
**Why**: A beautiful iOS app must feel native. Haptics on save, swipe-to-delete patterns, and momentum scrolling make the difference between a "web app" and an "iOS app" in user perception.  
**Files to change**: `app/share/page.tsx`, `components/InboxCard.tsx`, `lib/haptics.ts`  
**What to do**:
- Create `lib/haptics.ts`: wraps `@capacitor/haptics` (already in package) with a no-op fallback for web. Expose `impact()`, `success()`, `warning()`, `error()` helpers.
- Fire `success()` haptic when a clip is saved (in share page handleSave)
- Fire `impact()` haptic when board chip is selected in share page
- Fire `warning()` haptic when enrichment fails
- InboxCard: add swipe-to-delete gesture using CSS/touch events with haptic on confirm
- Add subtle spring animations to all interactive buttons (already using Framer Motion)

### D6 — Offline Plan Caching
**Status**: `[x]` Done  
**Why**: Users on planes need their itinerary. PRODUCT_STRATEGY.md Phase C includes "offline plan: full itinerary cached for offline use before departure date." The PWA already has a service worker; we need to cache the plan data.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`, `sw.js` (or a new cache manager)  
**What to do**:
- When a plan is viewed in `complete` stage, cache it to IndexedDB under a `cachedPlan` key
- Add a "Save for offline" button in the plan complete state
- When offline (detect via `navigator.onLine`), load the cached plan from IndexedDB instead of trying to regenerate
- Show an "Offline mode — showing last saved plan" banner when offline
- The plan JSON, map tiles for the plan's bounding box (via MapLibre's offline API), and trip data are all cached

### D7 — AI Auto-Organize Inbox (Cluster Clips by Destination)
**Status**: `[x]` Done  
**Why**: PRODUCT_STRATEGY.md's "ambient organization promise" — users save to Inbox and clips organize themselves. The killer demo is opening the app after 3 months and finding clips already sorted.  
**Files to change**: `app/inbox/page.tsx`, new `app/api/organize/route.ts`, `lib/db.ts`  
**What to do**:
- Add a "Auto-organize" button to the Inbox page (shown when ≥5 unassigned clips exist)
- New API endpoint `POST /api/organize` accepts the list of unassigned items
- Claude clusters them by destination/theme and suggests board assignments:
  `[{ boardName: "Tokyo 2026", emoji: "🗼", itemIds: [...] }]`
- Stream the response — show progress: "Grouping your 23 saves by destination…"
- User sees a preview of suggested boards with a "Create all boards" action and individual board edit/skip controls
- On confirm: create boards and move items atomically

### D8 — App Icon, Splash Screen & PWA Manifest Polish
**Status**: `[x]` Done  
**Why**: The iOS home screen icon and splash screen are the first impression. The current manifest has placeholder values. Before any public launch, the app needs a proper icon, splash, and PWA identity.  
**Files to change**: `public/manifest.json`, `app/layout.tsx`, `public/` (icon files), `ios/App/App/Assets.xcassets`  
**What to do**:
- Design a proper TravelPanel app icon: indigo (#4F46E5) background, white ✈ plane icon, rounded corners. Generate PNG at 512×512 (PWA) and all iOS sizes (20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024px)
- Update `public/manifest.json`: name, short_name, theme_color, background_color, icons array pointing to the new files
- Add iOS-specific meta tags in `app/layout.tsx`: `apple-touch-icon`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`
- Create a proper splash screen (1290×2796 for iPhone 14 Pro Max) with centered icon + app name
- Update `ios/App/App/Assets.xcassets/AppIcon.appiconset/` with proper icons

### D9 — Smart Board Cover Photos
**Status**: `[x]` Done  
**Why**: Boards currently show a generic color or the first item's thumbnail. Rich cover photos with gradient overlays, clip count, and destination name make boards feel like a polished travel magazine.  
**Files to change**: `components/BoardCard.tsx`, `app/boards/page.tsx`  
**What to do**:
- BoardCard: if `board.coverThumbnail` exists, show as full-bleed background with a gradient overlay (bottom 40% dark-to-transparent)
- Overlay: board name (white, bold), emoji, clip count badge, location count badge
- If no thumbnail: show a map-style gradient placeholder using the board's dominant location (from item coordinates) as a color key — e.g. Japan boards get cherry-blossom pink, Thailand gets warm orange
- On long-press: "Change cover photo" option (let user pick from saved thumbnails in the board)
- Board grid: 2-column layout, each card is 16:9 aspect ratio

### D10 — Pull-to-Refresh + Live Enrichment Progress
**Status**: `[x]` Done  
**Why**: Currently, the inbox has no way to trigger a manual refresh. Pull-to-refresh is a universal iOS pattern users expect. Also, enrichment progress (items being processed) is not visually distinctive enough.  
**Files to change**: `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Add pull-to-refresh to the inbox scroll area using touch events or a React library
- On pull: re-run the enrichment retry queue, refresh items from IndexedDB, show a spinner
- InboxCard: when `enrichmentStatus === 'processing'`, show an animated gradient shimmer overlay on the card (skeleton loading style) instead of just a spinner — makes it feel alive
- InboxCard: when `enrichmentStatus === 'failed'`, show a red dot badge + "Tap to retry" text overlay
- Track `manual_refresh` event

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
