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
**Status**: `[x]` Done — MapLibre GeolocateControl + nearby clips panel (500m radius)

### C2 — Post-Trip Timeline
**Status**: `[x]` Done — Timeline toggle in Inbox: all clips grouped by Today/Yesterday/This week/Month

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[x]` Done — Daily Discovery widget on Boards page; resurfaces clips ≥7 days old using daily-seeded shuffle, dismissible per-day, shows substance teaser

### C3 — Shared Boards v1
**Status**: `[ ]` Blocked — requires Supabase (B1 activation) for cross-user sharing

---

## PHASE D — iOS App Polish & Production Readiness

> Goal: Ship a beautiful, App Store–ready iOS app. These tasks focus on native iOS quality, visual polish, and reliability. None require Supabase.

### D1 — iOS Safe Area & NavBar Polish
**Status**: `[x]` Done — NavBar bottom padding uses env(safe-area-inset-bottom); share page uses safe-top/safe-bottom
**Why**: Without safe-area padding the NavBar overlaps the iPhone home indicator and the share page clips under the notch. Critical for any real device.
**Files**: `components/NavBar.tsx`, `app/globals.css`, `app/share/page.tsx`

### D2 — Clipboard Paste Button in Import Sheet
**Status**: `[x]` Done — reads clipboard on drawer open, shows one-tap paste chip when clipboard contains a URL, clears on paste  
**Why**: Users copy links from iOS and need a one-tap "Paste from Clipboard" button instead of manually long-pressing to paste. This reduces friction in the core clip flow.  
**File**: `components/ImportSheet.tsx`  
**What to do**:  
- Read `navigator.clipboard.readText()` on button tap  
- Show a "Paste URL" button only when clipboard contains a URL  
- Fall back gracefully if clipboard permission is denied

### D3 — Local Notifications for Enrichment Completion
**Status**: `[ ]` Not started  
**Why**: Currently enrichment runs silently. Users close the share sheet without knowing if it succeeded. A local notification "Your Tokyo café clip is ready — 3 locations found" closes the loop.  
**Files**: new `lib/notify.ts`, `lib/enrichItem.ts`  
**What to do**:  
- Use `@capacitor/local-notifications` (add to package.json) in native context  
- In web context, use the Web Notifications API if permission granted  
- Fire notification on enrichment success: "{clip title} — {N} locations, {M} tips found"  
- Request notification permission on first enrichment  
- No-op gracefully if denied

### D4 — App Icon & Splash Screen Generation
**Status**: `[ ]` Not started  
**Why**: `icon-192.png` and `icon-512.png` referenced by the PWA manifest don't exist. The iOS Xcode project needs proper icon assets. Without these, the app shows a blank icon.  
**Files**: `public/`, `ios/App/App/Assets.xcassets/AppIcon.appiconset/`  
**What to do**:  
- Create a Node.js script `scripts/generate-app-icons.js` using `sharp`  
- Input: `public/icon-source.svg` (create the SVG — travel-themed gradient with plane)  
- Output: all required PWA sizes (192, 512) and iOS sizes (20, 29, 40, 60, 76, 83.5, 1024 @1x/2x/3x)  
- Update `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json`

### D5 — Pull-to-Refresh on Inbox & Boards
**Status**: `[x]` Done — usePullToRefresh hook with touch events and rubber-band damping; indigo spinner indicator on both inbox and boards pages; refresh() added to useBoards  
**Why**: After clipping a link in another app or tab, users return to the inbox and see stale data. Pull-to-refresh is a standard iOS pattern that forces a reload.  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:  
- Add pull-to-refresh gesture detection using touch events (no new deps)  
- On pull completion, call the data refresh function from `useSavedItems`/`useBoards`  
- Show an indigo spinner during refresh  
- Or use `@capacitor/haptics` to give a light haptic click on refresh

### D6 — Enrichment Failure "Retry All" Button
**Status**: `[x]` Done — "N failed · Retry" badge in inbox header; retryAll() runs all failed items in parallel; spinner during retry  
**Why**: The retry queue retries automatically, but after 3 failures items are stuck. Users deserve a manual "Retry all failed" button in the inbox header.  
**Files**: `app/inbox/page.tsx`, `hooks/useEnrichmentRetry.ts`  
**What to do**:  
- Count failed items in the inbox header  
- Show "N failed · Retry" button in red when failed items exist  
- On tap: re-attempt enrichment for all failed items simultaneously

### D7 — Haptic Feedback on Key Actions
**Status**: `[x]` Done — lib/haptics.ts wrapper (dynamic @capacitor/haptics import, no-op in web); impact('light') on clip save, notification('success') on enrichment done, impact('medium') on card delete  
**Why**: iOS users expect haptic feedback on save, delete, and success. Without it the app feels like a website, not a native app.  
**Files**: `lib/haptics.ts` (new), `app/share/page.tsx`, `components/InboxCard.tsx`  
**What to do**:  
- Create `lib/haptics.ts` with `impact(style)` and `notification(type)` wrappers around `@capacitor/haptics`  
- No-op in web context  
- Fire `impact('light')` on save  
- Fire `notification('success')` on enrichment done  
- Fire `impact('medium')` on swipe-delete

### D8 — Offline Indicator & Graceful Degradation
**Status**: `[x]` Done — useOnlineStatus hook (navigator.onLine + events); amber offline banner on share page; enrichment skipped when offline, done stage shows "will enrich when reconnected"  
**Why**: The app silently fails enrichment when offline. Users don't know if their clip saved or failed.  
**Files**: new `hooks/useOnlineStatus.ts`, `app/share/page.tsx`  
**What to do**:  
- Hook: `useOnlineStatus()` using `navigator.onLine` + online/offline events  
- On share page: if offline, show "Saved to Inbox — enrichment will run when you're back online" instead of showing a spinner  
- Set `enrichmentStatus: 'pending'` (not 'processing') when offline — the retry queue handles it

### D9 — Board Cover Image Auto-Update
**Status**: `[x]` Done — coverThumbnail set in addItemToBoard (db.ts) and updateItemEnrichment; BoardCard uses dark gradient overlay for legible text on cover photos; fallback indigo gradient when no cover  
**Why**: Board cards show a grey gradient instead of a cover photo because `coverThumbnail` is never updated when items are added.  
**Files**: `lib/db.ts`, `app/share/page.tsx`  
**What to do**:  
- In `addItemToBoard`, after adding the item ID, check if the board has `coverThumbnail`  
- If not, find the first item in the board with a thumbnail and set it as `coverThumbnail`  
- Update `BoardCard.tsx` to display the cover image as a gradient overlay

### D10 — Import Sheet: URL Validation & Preview
**Status**: `[x]` Done — URL validated with `new URL()`, domain chip with platform color shown on valid URL, error hint on invalid, import/save-anyway buttons gated on valid URL  
**Why**: Users can submit any text including non-URLs. The import sheet should validate the URL and show the domain before saving.  
**Files**: `components/ImportSheet.tsx`  
**What to do**:  
- Validate input is a URL before enabling the Save button  
- Show a small domain preview chip: "youtube.com" with platform color  
- For known platforms, show "Instagram · Post" etc.

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
