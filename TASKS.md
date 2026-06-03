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

## PHASE D — iOS Beauty & Polish (Current Sprint)

> Goal: ship a beautiful, native-feeling iOS app that users love to open.
> Every task here is implementable without Supabase keys.

### D1 — iOS Safe Area + Native Feel
**Status**: `[x]` Done  
**Files**: `app/layout.tsx`, `app/globals.css`, `components/NavBar.tsx`, all page headers  
**What to do**:
- Add `viewport-fit=cover` to the meta viewport tag so the app fills the notch/Dynamic Island
- Use CSS `env(safe-area-inset-top/bottom)` for the floating header and NavBar to avoid overlap
- Add `overscroll-behavior: none` to prevent rubber-band reveal of white under dark bars
- Add `touch-action: manipulation` to all interactive buttons to remove the 300ms tap delay
- Ensure NavBar bottom padding accounts for the home indicator on iPhone X+

### D2 — Dark Mode
**Status**: `[x]` Done  
**Files**: `app/globals.css`, `tailwind.config.js`, all components  
**What to do**:
- Enable Tailwind `darkMode: 'class'` (or `media`) 
- Add a `dark:` variant for every background, text, border colour in the app
- Store user preference in localStorage and respect `prefers-color-scheme` as the default
- Toggle switch in Settings page (`app/settings/page.tsx`)
- Dark map style: swap OpenFreeMap liberty style to `dark` variant for dark mode

### D3 — Clip Flow Speed (Instant Save)
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `lib/enrichItem.ts`  
**Why**: The iOS Share Sheet flow currently saves first then enriches in the background. The enrichment is triggered but the Share Sheet closes in 3 seconds regardless. Add a "quick preview" that shows the extracted title as soon as the Share Extension is dismissed, then enriches silently.  
**What to do**:
- In `app/share/page.tsx`, start enrichment immediately on page load (not after board selection)
- Show an inline progress indicator in the done state: "🔍 Extracting locations…"
- Update the done-state card with location count when enrichment completes
- Add `haptic feedback` call via Capacitor HapticsPlugin (`Haptics.impact({ style: 'medium' })`) on successful save

### D4 — Beautiful Plan View
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`  
**What to do**:
- Add a hero section at the top of the plan with the board name, emoji, day count, and a horizontal overview map showing the full route
- Each DayStripCard: add a subtle gradient background per day number, time-of-day icons (morning ☀️ / afternoon 🌤 / evening 🌆)
- Sourced tips (`sourcedTips`) render in a distinct callout: indigo left-border, "From your clip:" attribution in small italic
- Smooth scroll-snap between day cards on mobile
- "Share plan" button that exports the plan as a beautiful image (using html2canvas or a server-side OG image endpoint)

### D5 — Haptic Feedback (iOS)
**Status**: `[x]` Done  
**Files**: new `lib/haptics.ts`, used in clip save, board create, plan generate  
**What to do**:
- Create `lib/haptics.ts` that wraps `@capacitor/haptics` with a no-op fallback for web
- `lightImpact()`, `mediumImpact()`, `successNotification()`, `errorNotification()`
- Call on: clip saved (medium), board created (light), plan generated (success notification), error (error notification)
- Install `@capacitor/haptics` and sync to iOS

### D6 — Pull-to-Refresh
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add pull-to-refresh gesture to the inbox and boards list
- On pull: re-run the enrichment retry queue for any `pending`/`failed` items
- Show a subtle spinner while refreshing
- Use the Capacitor `@capacitor/motion` or a simple touch-event approach for the gesture

### D7 — Clip Detail Sheet (Full-Screen Modal)
**Status**: `[x]` Done  
**Files**: `components/LocationDetailCard.tsx`, new `components/ClipDetailSheet.tsx`  
**What to do**:
- Create a full-screen bottom sheet for viewing a single clip in detail
- Sections: hero thumbnail → platform badge + title + description → 📍 Locations (map thumbnail) → 💡 Substance (grouped by type with icons) → 🗒 Personal notes → Actions (Add to board, View on map, Share, Delete)
- Replace the current minimal `LocationDetailCard` popup with this sheet on mobile
- Smooth spring animation; can be dismissed by swipe-down or tap outside

### D8 — App Loading Performance
**Status**: `[x]` Done  
**Files**: `app/page.tsx`, `app/layout.tsx`, `components/MapView.tsx`  
**What to do**:
- Add a splash screen overlay (matching the app's dark teal brand colour) that fades out after the map loads
- Lazy-load the trip planner page and all heavy components
- Add skeleton loaders to InboxCard and board cards while data loads from IndexedDB
- Bundle analysis: run `next build --profile` and eliminate the largest unnecessary dependencies

---

## PHASE E — AI Enhancements

### E1 — Ask About Your Clips
**Status**: `[x]` Done  
**Files**: new `app/api/ask/route.ts`, new `components/AskBar.tsx`, add to main page  
**What to do**:
- Add a floating search/ask bar to the map view with placeholder "Ask about your saved places…"
- POST to `/api/ask` with the question + a summary of all the user's saved items (title, substance items, locations)
- Claude returns a friendly answer citing specific clips ("Based on your Kyoto clip from May, the Philosopher's Path is best in early April…")
- Show the answer in a bottom sheet with linked clip cards
- Rate-limit to 20 queries/day (localStorage counter)

### E2 — Smart Board Suggestions
**Status**: `[x]` Done  
**Files**: `components/ImportSheet.tsx`, `app/share/page.tsx`  
**What to do**:
- After a clip is extracted, suggest which existing board it best fits (based on location overlap and tag matching)
- Simple client-side scoring: compare item's locations/tags against board members
- Show the top 1–2 suggestions as highlighted chips above the full board list

### E3 — Duplicate Detection
**Status**: `[x]` Done  
**Files**: `components/ImportSheet.tsx`, `lib/db.ts`  
**What to do**:
- Before saving a clip, check if the same URL already exists in IndexedDB
- If found, show a banner: "You already saved this. View it?" with a link to the existing clip
- Allow saving anyway (user may want a fresh extraction)

### E4 — Substance Highlights in Plan
**Status**: `[x]` Done  
**Files**: `app/api/plan/route.ts`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Parse all `warning`-type substance items from the board's clips
- Inject them as a "Watch out" section at the top of the generated plan
- Render with red/orange accent in the plan UI: "⚠️ From your clips: Cash only at Ippudo. Gion gets crowded after 6pm."

---

## PHASE F — iOS Native Features

### F1 — App Group Bridge (Capacitor Plugin)
**Status**: `[x]` Done (Xcode wiring required — see ios/App/App/Plugins/TravelPanelBridge/)  
**Files**: new `ios/App/App/Plugins/TravelPanelBridge/`, `CapacitorBridge.tsx`  
**What to do**:
- Create a minimal Capacitor plugin (Swift + JS) that exposes `readAppGroupData()` and `clearAppGroupData()`
- Returns `{ pendingShareImage?: string, pendingShareURL?: string, pendingShareTitle?: string }` from the App Group UserDefaults
- `CapacitorBridge.tsx` calls this on app focus and passes `pendingShareImage` to the share flow → enables B3 image vision pipeline end-to-end on iOS
- See `ios/App/ShareExtension/ShareViewController.swift` for the writer side (already implemented in B3)

### F2 — iOS Home Screen Widget
**Status**: `[ ]` Not started  
**Needs**: Xcode; SwiftUI widget extension  
**What to do**:
- Create a SwiftUI widget that shows the 3 most recently saved clips (title + thumbnail)
- Small size: clip count + "Add clip" deep-link button
- Medium size: 2 recent clips with thumbnails
- Reads from App Group UserDefaults (written by the main app via the F1 bridge)

### F3 — Siri Shortcut: "Clip Current URL"
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/`, register in App capabilities  
**What to do**:
- Donate a `INSendMessageIntent`-style shortcut: "Clip [URL] to TravelPanel"
- User can add it to Siri: "Hey Siri, clip this to TravelPanel"
- Shortcut opens the app with the URL pre-filled in the import sheet

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
