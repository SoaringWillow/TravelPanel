# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-10)

Goal: **a beautiful, fully functional iOS app** that makes the clip-action moat visceral.

Phase C is iOS polish — the raw substance extraction works, but the app still *feels* like a web prototype. These tasks close the gap between "it works" and "I love using this every day."

`C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → D1 → D2 → D3 → D4 → E1 → E2`

(D and E tasks add growth surface area; C tasks are the prerequisite for retention.)

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

## PHASE C — iOS Polish & Native Feel

> **Why Phase C is the highest priority now**: The core extraction loop works. The gap between "it works" and "I love using this daily" is almost entirely UI/UX polish and native iOS feel. These tasks are what turn a prototype into a product users recommend.

### C1 — Dark Mode
**Status**: `[x]` Done  
**Why**: iOS users expect dark mode. The app is jarring at night on OLED screens. This is a hygiene item that users notice immediately.  
**Files to change**: `app/globals.css`, `tailwind.config.ts`, every major component  
**What to do**:
- Add `darkMode: 'media'` to `tailwind.config.ts` (respects iOS system preference automatically)
- Audit and add `dark:` variants to all hardcoded `bg-white`, `text-gray-900`, `border-gray-100` classes
- Key surfaces to darken: NavBar, boards list, inbox card, map overlay, detail card, settings page
- MapLibre map: switch to a dark base map style when system is dark (OpenFreeMap has a `dark` style)
- Test on both light and dark to avoid color contrast regressions
- Dark background target: `#0f172a` (slate-900); card background: `#1e293b` (slate-800)

### C2 — Clipboard Import (Paste URL)
**Status**: `[x]` Done  
**Why**: The Share Sheet is iOS-only. Web users and Android users have no way to import URLs. A "Paste URL" button on the main screen gives all users a first-class import path without opening a Share Sheet.  
**Files to change**: `app/page.tsx` (or `app/inbox/page.tsx`), `components/ImportSheet.tsx`  
**What to do**:
- Add a sticky floating action button (FAB) at the bottom-right of the map/inbox view: `+` icon
- On tap: show a bottom sheet with a URL input field and "Import" button
- Pre-fill the input if the clipboard contains a URL (check `navigator.clipboard.readText()` on mount, prompt permission if needed)
- On "Import", call the existing `?import=<url>` flow (same as browser extension)
- Show loading state while enrichment runs, then show extracted locations count
- On iOS within the Capacitor app, this complements the Share Sheet (both work simultaneously)

### C3 — Swipe Gestures + Haptics on Clip Cards
**Status**: `[x]` Done  
**Why**: Swipe-to-delete is a native iOS pattern users expect. Without it, managing clips feels clunky. Haptics make the app feel native rather than web-ported.  
**Files to change**: `components/InboxCard.tsx`, `components/CapacitorBridge.tsx`  
**What to do**:
- Add swipe-left-to-delete on `InboxCard` using a touch gesture (use `framer-motion` drag or `react-swipeable`)
- Reveal a red delete background as the card slides left, with a trash icon
- On release past 40% threshold: delete with a `framer-motion` exit animation
- Show a toast "Clip deleted — Undo" at the bottom with a 5-second undo window
- Add haptic feedback using Capacitor's `@capacitor/haptics` plugin:
  - `HapticsImpactStyle.Light` on swipe threshold reached
  - `HapticsImpactStyle.Medium` on delete confirm
  - `HapticsNotificationType.Success` on clip saved
- Install `@capacitor/haptics`: run `npm install @capacitor/haptics` and add to `capacitor.config.ts`
- Wrap Haptics calls in `try/catch` since the plugin no-ops on web

### C4 — Skeleton Loaders for Pending Clips
**Status**: `[x]` Done  
**Why**: While a clip is enriching (status: 'pending' or 'processing'), the card shows a minimal stub. Users don't know if the app is working. Skeleton loaders signal activity and prevent perceived hangs.  
**Files to change**: `components/InboxCard.tsx`  
**What to do**:
- When `item.enrichmentStatus === 'pending' || 'processing'`: render a pulsing skeleton card instead of the stub
- Skeleton should match the card's final layout: two-line title placeholder + tag chip placeholders + a subtle "Extracting…" label
- Use Tailwind `animate-pulse` with `bg-gray-200 dark:bg-gray-700` bars
- Add a subtle spinning indicator (1rem spinner) in the top-right of the card during processing
- When enrichment completes, transition from skeleton → real content with a `framer-motion` fade-in

### C5 — Map UX Improvements
**Status**: `[x]` Done  
**Why**: The map is the hero surface but has rough edges: no fly-to animation when selecting a clip, no way to navigate to a location, pins feel generic.  
**Files to change**: `components/MapView.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- **Fly-to animation**: when the user taps a pin or selects a clip, fly the map to that location with `map.flyTo({ center, zoom: 14, duration: 800 })`
- **"Navigate" button** in LocationDetailCard: deep-link to Apple Maps (`maps://`) or Google Maps (`comgooglemaps://`) on iOS, Google Maps web on other platforms
  - Apple Maps URL: `maps://?q=<name>&ll=<lat>,<lng>`
  - Google Maps URL: `https://maps.google.com/?q=<lat>,<lng>`
  - Use `Capacitor.getPlatform()` to pick the right URL
- **Category-colored pins**: each pin's color comes from the clip's first tag (food=orange, nature=green, culture=purple, adventure=red, beach=teal, default=indigo)
- **Long-press on map**: show a "Save this location" tooltip at that coordinate, prompting a quick note input

### C6 — Empty State Illustrations
**Status**: `[x]` Done  
**Why**: An empty app shows a blank white screen. This causes new users to bounce. Good empty states explain the product and give a clear next action.  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- **Inbox empty state** (no clips yet): SVG illustration of a map pin + phone, headline "Your inspiration, organized", body "Save any travel link from Instagram, YouTube, or the web — AI extracts the locations and wisdom for you.", CTA button "Share a link"
- **Board empty state** (board with no clips): "No clips in this board yet. Add clips from Inspiration.", with a subtle dashed outline card
- **Plan empty state** (no plan generated): "Generate a trip plan from your saved clips", with the Generate button front and center
- All illustrations should be inline SVG (no external deps), stroke-based, monochrome with an indigo accent
- Dark mode variants using `dark:stroke-slate-400` etc.

### C7 — In-App Review Prompt
**Status**: `[ ]` Not started  
**Why**: App Store ratings drive discovery. The ideal moment to ask is right after a user completes a plan (high-value, high-satisfaction moment).  
**Files to change**: `app/plan/[boardId]/page.tsx`, new `lib/reviewPrompt.ts`  
**What to do**:
- Install `@capacitor-community/app-review`: `npm install @capacitor-community/app-review`
- Create `lib/reviewPrompt.ts`: exports `maybePromptReview()` that triggers the native review dialog
- Eligibility: user has ≥5 clips AND has generated ≥1 plan AND hasn't been prompted in the last 60 days (track in localStorage)
- Call `maybePromptReview()` 2 seconds after a plan is fully generated (in the plan page)
- Guard with `Capacitor.isNativePlatform()` — only fires in the iOS app, never on web

### C8 — Spotlight Search Integration
**Status**: `[ ]` Not started  
**Why**: iOS users expect saved content to appear in Spotlight (swipe-down search). This is a powerful ambient discovery channel — when a user types "Tokyo" in their phone's search, their TravelPanel clips should appear.  
**Files to change**: `components/CapacitorBridge.tsx`, `lib/db.ts`  
**What to do**:
- Install `@capacitor-community/apple-search-api`: adds Capacitor bindings to Core Spotlight
- After every successful enrichment in `lib/enrichItem.ts`, index the item: `{ uniqueIdentifier: item.id, domain: 'clips', title: item.title, description: item.description, thumbnailURL: item.thumbnail, keywords: item.tags }`
- On item delete, remove from Spotlight index
- Handle the Spotlight open callback in `CapacitorBridge.tsx`: if the app opens from a Spotlight result (`App.addListener('appUrlOpen')` with a spotlight:// scheme), navigate to that clip's detail view
- No-op on web (guard with `Capacitor.isNativePlatform()`)

---

## PHASE D — On-Trip Mode & Social

### D1 — Nearby Clips (On-Trip GPS Mode)
**Status**: `[ ]` Not started  
**Why**: The "I just landed — what's nearby?" use case is the highest-value on-trip moment. When the user is physically close to a saved location, the clip should surface automatically.  
**Files to change**: `app/page.tsx` (map view), `components/MapView.tsx`  
**What to do**:
- Request geolocation permission with `navigator.geolocation.watchPosition()`
- Show a "You are here" blue dot on the map (standard pattern)
- When user location is within 500m of a saved clip's location, show a subtle bottom-sheet chip: "📍 You're near [Location Name] — view your tips"
- Tapping the chip opens the clip's LocationDetailCard
- Add a "Nearby" filter button in the inbox view that filters clips to those within a configurable radius (start with 2km)
- Gate geolocation request on user action (button tap), not on mount — iOS requires this for user trust

### D2 — Read-Only Board Sharing
**Status**: `[ ]` Not started  
**Why**: Users want to share their "Tokyo trip" board with a friend planning the same trip. This is a natural virality mechanic.  
**Needs**: Supabase from B1 (to store shared boards server-side) — OR implement as a local export-to-URL (encode board as compressed JSON in the URL, no backend needed)  
**Files to change**: `app/boards/[id]/page.tsx`, new `app/shared/[token]/page.tsx`  
**What to do**:
- **Option A (no backend, works now)**: Encode the board + its items as a compressed base64 string in a URL hash. Generate a `travelpanel.app/shared#<data>` URL. The `/shared` page decodes and renders a read-only board view.
- **Option B (needs Supabase)**: POST the board to Supabase and get a short token URL
- Implement Option A first (no backend dependency)
- Shared view shows: board name, clip cards (title, thumbnail, tags, location count), but no AI plan
- Add a "Share board" button in the board header with a copy-link action

### D3 — Post-Trip Timeline
**Status**: `[ ]` Not started  
**Why**: After the trip, the app's job shifts from "planning" to "remembering." A timeline view shows visits in chronological order, turning TravelPanel into a travel diary.  
**Files to change**: `lib/types.ts`, `lib/db.ts`, new `app/timeline/page.tsx`  
**What to do**:
- Add `visitedAt?: number` to `SavedItem` — the user can mark a clip as "visited" from the detail card
- New `/timeline` page: clips grouped by visit date in reverse chronological order
- Each timeline entry shows thumbnail, title, date visited, top substance items
- "Mark as visited" button in LocationDetailCard: sets `visitedAt = Date.now()` and optionally opens the camera to add a photo note (camera via `@capacitor/camera`)
- Add Timeline as a 5th nav tab (replace or add alongside Settings)

### D4 — Proactive Resurfacing (Push Notifications)
**Status**: `[ ]` Not started  
**Why**: If a user has clips saved for a location they're now physically near, proactively surfacing them turns TravelPanel into an ambient travel companion.  
**Needs**: `@capacitor/push-notifications` + a server-side trigger (needs Supabase or an alternative)  
**Files to change**: `components/CapacitorBridge.tsx`, new `app/api/push/route.ts`  
**What to do**:
- Register for push notifications on first launch (request permission after first plan is generated)
- Store push token in Supabase against the user's device
- Server-side trigger: when a user's GPS location (from D1) matches a saved clip location, send a push: "You saved a tip about [Location] — 📍 500m away"
- Implement the notification tap handler in CapacitorBridge: open the clip detail directly

---

## PHASE E — Growth & Monetization

### E1 — AI Board Summary
**Status**: `[ ]` Not started  
**Why**: Users with 10+ clips in a board can't easily grasp what they've saved. An AI-generated summary ("Your Tokyo collection: 18 clips focused on street food in Shinjuku and day trips to Nikko") acts as ambient organization.  
**Files to change**: `app/boards/[id]/page.tsx`, new `app/api/summarize/route.ts`  
**What to do**:
- New `POST /api/summarize` endpoint: takes board name + top 20 item titles/substance items, calls Claude Haiku to produce a 2-sentence narrative summary
- In board detail page: show summary card at the top with a "✨ AI summary" badge
- Cache the summary in the board record (`summary?: string` field) — regenerate only when board has 5+ new clips since last summary
- Use streaming for a typewriter reveal effect

### E2 — Batch URL Import
**Status**: `[ ]` Not started  
**Why**: Power users have a backlog of saved URLs in their notes. Forcing them to paste one at a time is friction that kills early retention.  
**Files to change**: `components/ImportSheet.tsx` or new `app/import/page.tsx`  
**What to do**:
- Add a "Paste multiple URLs" option (textarea) in the import flow
- Parse pasted text for URLs using `NSDataDetector`-style regex
- Show detected URLs as a list with checkboxes — user can deselect before importing
- Queue all selected URLs as `pending` items, then enrich them sequentially (rate-limit aware)
- Progress bar: "Extracting 3 of 7 clips…"

### E3 — Real-World Enrichment Signals
**Status**: `[ ]` Not started  
**Why**: A plan for Tokyo in late March without flagging Sakura season is a missed opportunity. Real-world context (festivals, weather, price spikes) is the key differentiator vs. generic AI travel apps.  
**Files to change**: `app/api/plan/route.ts`, new `app/api/enrich/signals/route.ts`  
**What to do**:
- Create a `fetchDestinationSignals(city: string, dates?: string)` helper that calls:
  - A public holidays/festivals API (e.g. `date.nager.at` for holidays, `opentripmap.io` for events)
  - Weather API for the destination (OpenMeteo is free, no key needed)
  - Currency exchange rate (fixer.io or ExchangeRate-API, free tier)
- Inject signals into the planner prompt: "Note: the trip overlaps with Golden Week (high crowds, +30% hotel prices, 2-3h queue waits at popular sites)"
- Cache signals per city per week in IndexedDB to avoid re-fetching

### E4 — iOS Home Screen Widget
**Status**: `[ ]` Not started  
**Why**: A widget showing "Today's travel inspiration" keeps TravelPanel top-of-mind and drives daily opens.  
**Files to change**: `ios/App/` (new Xcode widget target)  
**What to do**:
- Add a new iOS Widget Extension target in Xcode (SwiftUI)
- Widget reads from App Group shared UserDefaults — on every clip save, write the latest clip's thumbnail URL + title to App Group
- Widget design: 2×2 medium widget, shows thumbnail (or a map gradient) + clip title + tag chip
- Three size variants: small (just thumbnail + title), medium (+ top substance tip), large (+ 3 clips)
- Timeline provider updates once per day or on new clip saved

### E5 — Pro Tier Paywall
**Status**: `[ ]` Not started  
**Why**: The 12-month goal includes sustainable revenue. The Pro tier should be the natural next step for users who have built a meaningful clip corpus.  
**Files to change**: `app/settings/page.tsx`, new `app/api/subscription/route.ts`  
**What to do**:
- Define Pro features: unlimited plan generations (free: 5/day), cloud sync (B1), priority AI enrichment, batch import (E2), AI board summaries (E1)
- Add "Upgrade to Pro" section in Settings with feature comparison table
- Integrate RevenueCat (`@revenuecat/purchases-capacitor`) for iOS in-app purchase — it handles App Store receipts, trial periods, and receipt validation
- Gate Pro features with `isPro` check from RevenueCat, with graceful fallback (no hard crashes)
- Show a non-pushy upgrade prompt after 5th plan generation: "Enjoying TravelPanel? Upgrade for unlimited plans."

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
