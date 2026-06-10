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
**Status**: `[ ]` Not started

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started

---

## PHASE D — iOS Native Experience Sprint 🍎

> Goal: make the app feel fully native and polished on iPhone. These are the tasks
> that turn a "PWA in a shell" into something users describe as beautiful.
>
> **Execution order**: D1 → D2 → D3 → D4 → D5 → D6

### D1 — Share Extension Native Inline UI
**Status**: `[ ]` Not started  
**Why**: Currently the Share Extension immediately switches to the main app. Best-in-class extensions (Pocket, Raindrop) show a native modal overlay without leaving the source app. This is the #1 UX win for the share moat.  
**Files to change**: `ios/App/ShareExtension/ShareViewController.swift`, add `ShareExtensionView.swift`  
**What to do**:
- Replace the current immediate-open-app pattern with a native `UIViewController` sheet overlay inside the extension itself
- Show: platform chip + URL title + board picker (last 5 boards from App Group) + "Save" button
- On save: write the item to App Group, then complete the extension request (no app switch)
- On next main app launch: `CapacitorBridge` reads pending item from App Group and enriches it
- Design: white card with rounded corners, TravelPanel sky-blue header, snap-to-dismiss pull handle

### D2 — iOS Safe Areas & Native Spacing Audit
**Status**: `[x]` Done  
**Why**: The app likely clips behind the notch/Dynamic Island and the home indicator on real hardware.  
**Files to change**: `app/globals.css`, all page layouts in `app/`  
**What to do**:
- Add global CSS: `body { padding-top: env(safe-area-inset-top); }` etc.
- Add `safe-top` and `safe-bottom` Tailwind utilities in `tailwind.config.js`:
  ```js
  'safe-top': 'env(safe-area-inset-top)',
  'safe-bottom': 'env(safe-area-inset-bottom)',
  ```
- Audit every page's top padding (pages that have a fixed header behind the status bar) and bottom padding (pages with content behind the home indicator or NavBar)
- The NavBar needs `padding-bottom: env(safe-area-inset-bottom)` so its items sit above the home indicator
- Test: plan page, inbox page, share page, settings page, boards page

### D3 — Haptic Feedback Throughout
**Status**: `[x]` Done  
**Why**: Haptics make the app feel native and responsive. Every significant action should have a matching tap.  
**Files to change**: `lib/haptics.ts` (new), `app/share/page.tsx`, `components/ImportSheet.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `tapLight()`, `tapMedium()`, `tapSuccess()`, `tapError()` wrappers around `@capacitor/haptics` (no-ops in browser)
- Add haptics to: clip saved (success), board created (medium), plan generated (medium), error state (error), button press on primary CTAs (light)
- Import and call in relevant components — keep calls tight (one per user action, not on animation frames)

### D4 — App Icon Asset Pack + Launch Screen
**Status**: `[ ]` Not started  
**Why**: The app still ships with the default Capacitor "C" icon. This is the most visible App Store polish gap.  
**Files to change**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `ios/App/App/Base.lproj/LaunchScreen.storyboard`  
**What to do**:
- Design: sky-blue (#0284c7) background, white map-pin with a small globe inside the dot — minimal, recognizable at 16px
- Generate all required sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024px (PNG, no alpha on 1024px)
- Create a `scripts/generate-icons.js` using `sharp` to resize from a single 1024px source SVG
- Update `LaunchScreen.storyboard` to show the icon centered on a white background (simple is best)
- Update `Contents.json` in `AppIcon.appiconset/` to reference the new files

### D5 — Pull-to-Refresh on Inbox & Boards
**Status**: `[x]` Done  
**Why**: Users naturally pull to refresh on mobile. Currently the only way to retry failed enrichments is to wait for the retry queue.  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add pull-to-refresh gesture using `@capacitor/haptics` + CSS overscroll detection (or a lightweight lib)
- On pull: trigger enrichment retry for all `status: 'failed'` items (call the existing retry queue logic)
- Show a spinner during the refresh, dismiss when done
- Web fallback: show a "Refresh" button at top of list

### D6 — Virtualized Inbox List (performance at 200+ clips)
**Status**: `[x]` Done  
**Why**: The inbox renders all clips with `map()` — at 200+ saves it jank-scrolls and causes memory pressure. This is a retention killer when users are power users.  
**Files to change**: `app/inbox/page.tsx`, possibly `components/InboxCard.tsx`  
**What to do**:
- Install `@tanstack/react-virtual` (no layout coupling, no external state)
- Wrap the inbox list in a `useVirtualizer` call with item height estimate (~140px)
- Render only the visible window + overscan
- Keep the existing search/filter working (filter before virtualizing)
- Measure: open inbox with 50 seeded items before and after, confirm no frame drops

---

## PHASE E — UI Beauty & Polish 🎨

> Goal: make TravelPanel the most beautiful travel app on the App Store.
> Every empty state, every transition, every color choice should feel intentional.

### E1 — Onboarding Flow (3 screens)
**Status**: `[x]` Done  
**Files**: new `app/onboarding/page.tsx`, update `app/page.tsx` (check flag)  
**What to do**:
- 3 swipeable onboarding cards shown only on first launch (`hasSeenOnboarding` flag in localStorage)
- Screen 1: "Clip anything" — globe icon, "Save any travel post with one tap from any app"
- Screen 2: "AI extracts the wisdom" — brain icon, "Locations pinned on your map. Tips and warnings saved."
- Screen 3: "Plan your trip" — route icon, "Generate a personalized day-by-day itinerary from your clips"
- Each screen: large icon (80px), bold headline, 2-line subtitle, progress dots
- Skip button top-right, "Next →" / "Get started" CTA
- Final tap → routes to main map with seed boards visible (A8 seed data)

### E2 — Empty States with Illustrations
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Map empty state: compass SVG illustration, "No clips yet", "Share any travel post to pin it here" + "Try it →" button that opens the import sheet
- Inbox empty state: inbox tray SVG, "Your inspiration lives here", same CTA
- Board empty state: grid SVG, "No collections yet", "Create a board to organise your clips"
- Use inline SVG illustrations (no external assets) — simple, single-color line art in indigo

### E3 — Clip Card Swipe-to-Delete
**Status**: `[x]` Done  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Add swipe-left gesture on inbox cards to reveal a red "Delete" action button
- Use `framer-motion` drag with `dragConstraints` and `onDragEnd` threshold detection
- On delete: haptic error tap + fade-out animation + remove from DB
- Undo toast: "Clip deleted · Undo" appears for 4 seconds, tapping Undo re-inserts the item

### E4 — Dark Mode Support
**Status**: `[x]` Done  
**Files**: `app/globals.css`, `tailwind.config.js`, all components  
**What to do**:
- Enable Tailwind `darkMode: 'media'` (system-respecting)
- Audit all hardcoded `bg-white`, `text-gray-900` etc. — add `dark:` variants
- Map background: dark map style (switch MapLibre style to a dark basemap in dark mode)
- Priority components: NavBar, InboxCard, LocationDetailCard, plan day strip
- Test on iPhone with system dark mode enabled

### E5 — Trip Plan Day-Strip Visual Redesign
**Status**: `[x]` Done  
**Why**: The current day strip is functional but plain. The plan view is where users spend the most time post-clip — it needs to feel premium.  
**Files**: `components/DayStripCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Redesign each day card: large day number badge, gradient header (indigo → sky), activity list with category dot colors
- Source tips render with a subtle amber callout card ("💡 from your clip: [title]")
- Smooth expand/collapse animation for each day using `framer-motion` `AnimateHeight`
- "Time estimate" chip next to activity count
- Map thumbnail (static map image if available) at top of each day card

---

## PHASE F — App Store Readiness 🚀

> Goal: everything needed to submit TravelPanel to the App Store.

### F1 — Privacy Policy Page
**Status**: `[x]` Done  
**Files**: new `app/privacy/page.tsx`, new `app/terms/page.tsx`  
**What to do**:
- Simple static pages for Privacy Policy and Terms of Use (required by App Store)
- Content: data stored locally, no account required, Anthropic API used for AI extraction
- Link both from Settings page
- Clean, readable typography — no distracting layout

### F2 — Capacitor Plugin Audit & Version Update
**Status**: `[ ]` Not started  
**Files**: `package.json`, `ios/App/Podfile`, `capacitor.config.ts`  
**What to do**:
- Audit installed Capacitor plugins: `@capacitor/app`, `@capacitor/haptics`, `@capacitor/preferences`, `@capacitor/splash-screen`, `@capacitor/status-bar`
- Update all to latest compatible versions
- Run `npx cap sync ios` and fix any native-side deprecation warnings
- Verify `capacitor.config.ts` app ID matches `com.travelpanel.app`
- Document the minimum iOS version (target iOS 16+)

### F3 — App Store Metadata Pack
**Status**: `[ ]` Not started  
**Files**: new `app-store/metadata.md` (not checked in, just a reference doc)  
**What to do**:
- Write App Store name (30 chars): "TravelPanel — Trip Planner"
- Write subtitle (30 chars): "Clip, Explore, Plan"
- Write description (4000 chars): feature walkthrough, AI moat, privacy-first angle
- Write 3 keyword fields (100 chars each)
- List 3 primary categories: Travel, Productivity, Lifestyle
- Note: screenshots needed (5 per device size) — stub the sizes in `app-store/screenshots/`

### F4 — Sentry Error Tracking (native crash reporting)
**Status**: `[ ]` Not started  
**Files**: `app/layout.tsx`, `capacitor.config.ts`, `ios/App/App/AppDelegate.swift`  
**What to do**:
- Install `@sentry/nextjs` and `@sentry/capacitor`
- Add Sentry init in `app/layout.tsx` (behind env var check — no-op if key missing)
- Capture unhandled promise rejections and React error boundaries
- Add `SENTRY_DSN` to `.env.local.example`
- In AppDelegate, add Sentry iOS SDK init for native crash reports

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
