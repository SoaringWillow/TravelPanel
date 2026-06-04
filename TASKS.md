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

## PHASE D — iOS Polish & App-Store Ready

The goal of Phase D is a **beautiful, fully native-feeling iOS app** that users want to put on their home screens. Each task targets a specific gap between "web app in Capacitor shell" and "premium iOS app".

### D1 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done  
**Why**: The trash-icon tap is hidden and un-discoverable. Swipe-left-to-delete is the universal iOS gesture for removing list items — doing this in-web with Framer Motion requires zero new packages.  
**Files**: `components/SwipeToDelete.tsx` (new), `app/inbox/page.tsx` (wrap cards, switch to 1-col list)

### D2 — Web Share API (share clips & plans natively)
**Status**: `[x]` Done  
**Why**: Users should be able to share a saved clip or trip plan via the iOS Share Sheet from inside the app. `navigator.share` works natively in Capacitor WKWebView.  
**Files**: `lib/share.ts` (new), `components/InboxCard.tsx`, `app/plan/[boardId]/page.tsx`

### D3 — Pull-to-Refresh on Inbox
**Status**: `[x]` Done  
**Why**: iOS users expect pull-to-refresh. It also triggers re-enrichment of any failed clips, replacing the current manual retry flow.  
**Files**: `app/inbox/page.tsx`, new `components/PullToRefresh.tsx`

### D4 — Clip Edit Modal
**Status**: `[x]` Done  
**Why**: Users can't fix a wrong title, add tags, or change the board after saving. Long-press or swipe-to-reveal "Edit" action opens a bottom sheet editor.  
**Files**: new `components/ClipEditSheet.tsx`, `app/inbox/page.tsx`, `app/boards/[id]/page.tsx`

### D5 — Native App Icon & Splash Screen
**Status**: `[x]` Done  
**Why**: The app currently shows a generic WebView icon. A real branded icon is required before App Store submission and makes the home screen presence feel intentional.  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (PNG generation script), update launch storyboard

### D6 — Empty State Illustrations
**Status**: `[x]` Done  
**Why**: Empty map, empty inbox, empty boards all show minimal text. Branded illustrations + actionable CTAs ("Share your first inspiration") dramatically improve first-run experience.  
**Files**: `components/EmptyState.tsx` (new), update map/inbox/boards pages

### D7 — Board Detail UI Polish
**Status**: `[x]` Done  
**Why**: Board detail page currently shows a basic card grid. Add a hero cover image, stats row (N clips, N locations, N substance tips), and a "Plan trip" CTA that pre-selects this board.  
**Files**: `app/boards/[id]/page.tsx`

### D8 — Map Marker Polish & Category Colors
**Status**: `[x]` Done  
**Why**: All map pins are the same indigo dot. Color-coding by the clip's primary tag (food=orange, nature=green, culture=purple) gives the map visual hierarchy and scanability at a glance.  
**Files**: `components/MapView.tsx`

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

## PHASE E — iOS App-Store Polish (Current Sprint)

Goal: close every gap between "web app in Capacitor" and "premium iOS app users want on their home screen." Work top-to-bottom.

### E1 — Boards List Page Polish
**Status**: `[ ]` Not started
**Why**: Boards page uses a bespoke inline empty state instead of the shared `EmptyState` component, and `BoardCard` doesn't show substance tip counts or location counts like the board detail hero.
**Files**: `app/boards/page.tsx`, `components/BoardCard.tsx`
**What to do**:
- Replace the inline empty state block with `<EmptyState illustration="boards" title="No boards yet" subtitle="Create your first collection to organise your travel ideas." action={<button…>Create a Board</button>} />`
- In `BoardCard`, add a stats mini-row below the board name: show clip count, location count (sum across items), and tip count (sum of substance items)
- Fetch the extra stats by passing `items` array from `useSavedItems()` into `BoardCard` (or compute a `boardStats` map in `BoardsPage`)

### E2 — Haptic Feedback on Key Actions
**Status**: `[ ]` Not started
**Why**: Without haptics, the app feels like a website. Native iOS apps give tactile feedback on significant actions. Capacitor ships `@capacitor/haptics` — it no-ops in the browser so no conditional needed.
**Files**: new `lib/haptics.ts`, `components/SwipeToDelete.tsx`, `components/ClipEditSheet.tsx`, `app/share/page.tsx`
**What to do**:
- Create `lib/haptics.ts` with `impactLight()`, `impactMedium()`, `notificationSuccess()`, `notificationError()` wrappers around `@capacitor/haptics` (import dynamically to avoid SSR errors)
- Fire `impactMedium()` when swipe-to-delete threshold is crossed (inside `SwipeToDelete`)
- Fire `notificationSuccess()` when a clip is saved successfully (in `app/share/page.tsx` after enrichment starts)
- Fire `notificationSuccess()` when ClipEditSheet saves
- Fire `notificationError()` when enrichment fails permanently

### E3 — Safe-Area Inset Audit
**Status**: `[ ]` Not started
**Why**: Several pages use hardcoded `pt-12` for status bar clearance. On iPhone 15 Pro with Dynamic Island, `pt-12` (48px) may be insufficient. CSS `env(safe-area-inset-top)` adapts automatically to every device.
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/settings/page.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Add `viewport-fit=cover` to the `<meta name="viewport">` tag in `app/layout.tsx` if not already present
- Replace `pt-12` with `pt-[max(3rem,env(safe-area-inset-top))]` on each page header (or use a Tailwind plugin `safe-top` utility via arbitrary value)
- The board detail hero already uses `env(safe-area-inset-top)` — confirm it's correct and use as reference pattern
- Verify NavBar bottom clearance: replace hardcoded `pb-24` with `pb-[calc(1.5rem+env(safe-area-inset-bottom))]`

### E4 — ClipEditSheet Keyboard Avoidance
**Status**: `[ ]` Not started
**Why**: When the iOS keyboard appears over the bottom sheet, the title input is hidden behind it. This is the most common frustration with web-in-WebView forms.
**Files**: `components/ClipEditSheet.tsx`
**What to do**:
- Listen to `visualViewport.resize` (or `window.resize`) to detect keyboard appearance
- When keyboard is visible, shift the sheet up by `window.innerHeight - visualViewport.height` px using a CSS `transform: translateY()`
- Animate the shift with a spring (or `transition: transform 0.3s ease`)
- Reset shift on `visualViewport.resize` when keyboard hides
- Ensure the sheet's `maxHeight` shrinks so content doesn't overflow: `maxHeight: 85vh - keyboardHeight`

### E5 — SwipeToDelete on Board Cards
**Status**: `[ ]` Not started
**Why**: Boards page has no swipe-to-delete. Users who want to remove a board have to tap a small delete icon. Consistency with the inbox increases discoverability.
**Files**: `app/boards/page.tsx`, `components/BoardCard.tsx`
**What to do**:
- Wrap each `BoardCard` in the existing `SwipeToDelete` component (same as inbox)
- Pass `onDelete={() => handleDelete(board.id)}` 
- On delete animation complete, call `removeBoard`
- Confirm the swipe direction doesn't conflict with horizontal board card overflow

### E6 — LocationDetailCard Substance Visual Polish
**Status**: `[ ]` Not started
**Why**: The substance section in `LocationDetailCard` exists but feels like an afterthought — plain text list with no visual hierarchy. This is the product's #1 moat and should look premium.
**Files**: `components/LocationDetailCard.tsx`, `components/SubstanceList.tsx`
**What to do**:
- In `SubstanceList`, add a left-accent colored bar per substance type (tip=indigo, warning=amber, opinion=purple, wisdom=emerald, context=sky, recommendation=rose)
- Each substance item: rounded card with a colored left border, type icon, bold content, and source_quote in italic gray below
- Add a subtle section header "✦ Insights from this clip" above the list
- Add entrance animation (stagger with Framer Motion: each card fades+slides in with 50ms delay)

### E7 — Pull-to-Refresh on Boards Page
**Status**: `[ ]` Not started
**Why**: The Boards page doesn't have pull-to-refresh. Consistency with Inbox means users expect it everywhere.
**Files**: `app/boards/page.tsx`
**What to do**:
- Wrap the boards list content in `<PullToRefresh onRefresh={async () => { await refreshBoards(); }}>` 
- Add a `refreshBoards` callback to `useBoards` hook (re-reads boards from IndexedDB)
- Keep the `OnboardingSeed` banner outside the pull-to-refresh area (above it, in the header zone)

### E8 — App Review Prompt
**Status**: `[ ]` Not started
**Why**: App Store ratings are critical for discoverability. The optimal time to ask is after the user successfully generates their first trip plan — they've seen the product's value.
**Files**: new `lib/appReview.ts`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `lib/appReview.ts` that calls `@capacitor-community/app-review` (or the native iOS `SKStoreReviewController` via a Capacitor plugin) after the first plan is generated successfully
- Gate the prompt: only show once, only after `planGenerationCount >= 1`, store the flag in localStorage
- On web/browser (no Capacitor plugin), this is a no-op
- Install: check if `@capacitor-community/app-review` is in `package.json`; if not, note that it must be added

### E9 — Offline Mode Indicator
**Status**: `[ ]` Not started
**Why**: The app stores everything locally but the enrichment and planning features require network. When offline, buttons should indicate why they're disabled.
**Files**: new `hooks/useOnlineStatus.ts`, `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `hooks/useOnlineStatus.ts`: returns `{ isOnline: boolean }` using `navigator.onLine` + `window` `online`/`offline` events
- In the share/import flow: when offline, disable the submit button and show "You're offline — connect to save" 
- In the plan page: when offline, show a subtle banner at the top "No internet — plan generation unavailable"
- In plan button CTA on board detail: show a subtle offline indicator next to the button when offline

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
