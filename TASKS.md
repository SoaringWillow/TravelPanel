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

## PHASE D — iOS Polish & Beauty (Current Sprint)

> Goal: ship a polished, native-feeling iOS app. Every task here moves the needle on
> visual quality, iOS conventions, or functional completeness for the core user loop.
> Work top-to-bottom.

### D1 — Toast Notification System
**Status**: `[x]` Done  
**Why**: Every action (save, delete, export, error) is silent. Users have no feedback loop.  
**Files**: new `components/Toast.tsx`, new `hooks/useToast.ts`, `app/layout.tsx`  
**What to do**:
- Build a bottom-anchored `<Toast>` component (above NavBar) with variants: `success`, `error`, `info`
- Auto-dismiss after 2.5 s with a shrinking progress bar; can be dismissed by tap
- Export a `useToast()` hook (add/dismiss, max 1 at a time)
- Mount `<ToastProvider>` in `app/layout.tsx`
- Wire toasts for: clip saved (share page), export complete (settings), enrichment failed (InboxCard)

### D2 — Safe-Area NavBar + Home Indicator Fix
**Status**: `[x]` Done  
**Why**: NavBar overlaps iPhone home indicator bar. Content under navbar gets clipped.  
**Files**: `components/NavBar.tsx`, `app/globals.css`  
**What to do**:
- Apply `padding-bottom: env(safe-area-inset-bottom)` to the nav bar element
- Replace hardcoded `pb-24` page bottom padding with a CSS custom property `--nav-height` that accounts for safe area
- Verify on iPhone 14 (notch) and iPhone SE (no notch) form factors
- Add `viewport-fit=cover` to the Next.js metadata viewport config if not already present

### D3 — Dark Mode
**Status**: `[ ]` Not started  
**Why**: Tailwind `darkMode: ['class']` is configured but unused. iOS dark mode preference is ignored.  
**Files**: `app/globals.css`, `app/layout.tsx`, all major component files  
**What to do**:
- Set `dark` class on `<html>` when `prefers-color-scheme: dark` (CSS media query or `useEffect`)
- Add `dark:` variants to all hardcoded `bg-white`, `text-gray-900`, `border-gray-200` classes in:
  - `components/NavBar.tsx`, `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`
  - `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/settings/page.tsx`
  - `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`
- Update `CapacitorBridge.tsx` StatusBar style to `Style.Dark` in dark mode
- Use CSS variables for background/text/border tokens so a single `:root.dark` block controls everything

### D4 — Haptic Feedback on Key Actions
**Status**: `[ ]` Not started  
**Why**: Capacitor supports haptics; taps on iOS feel dead without them.  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Install `@capacitor/haptics` (add to package.json, run `npx cap sync`)
- Create `lib/haptics.ts` with `impact(style)` and `notify(type)` wrappers that no-op outside Capacitor
- Trigger `ImpactStyle.Medium` on: clip save (share page board chip tap), plan generate button
- Trigger `NotificationType.Success` on: enrichment complete, export done
- Trigger `NotificationType.Error` on: enrichment failed, rate limit hit

### D5 — Pull-to-Refresh on Inbox & Boards
**Status**: `[ ]` Not started  
**Why**: iOS users expect pull-to-refresh everywhere; without it the app feels static.  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, new `components/PullToRefresh.tsx`  
**What to do**:
- Build a headless `<PullToRefresh onRefresh={fn}>` wrapper using pointer events
  (pull distance → spring animation → trigger → snap back)
- Wrap Inbox list and Boards grid
- On refresh: re-read IndexedDB, re-trigger failed enrichments (existing retry queue)
- Show a spinner at the top during refresh; haptic `impact` when threshold is reached

### D6 — JSON Data Import (Restore from Backup)
**Status**: `[ ]` Not started  
**Why**: Export (B5) is useless without import. Data loss on device wipe is existential.  
**Files**: `app/settings/page.tsx`, `lib/db.ts`  
**What to do**:
- Add "Import backup" section to settings page with a file picker (`<input type="file" accept=".json">`)
- Parse the JSON, validate it has `{ clips, boards, trips }` arrays (version 1 schema)
- Merge strategy: skip items/boards already in DB (by `id`); import new ones only
- Show progress (e.g. "Importing 47 clips…") and a success toast when done
- Add `importAllData(payload)` to `lib/db.ts`

### D7 — Error Boundaries & Better Empty States
**Status**: `[ ]` Not started  
**Why**: Unhandled errors produce blank screens. Empty pages have no call to action.  
**Files**: new `app/error.tsx`, `app/boards/page.tsx` (empty state), `app/inbox/page.tsx` (empty state)  
**What to do**:
- Add `app/error.tsx` (Next.js error boundary page): friendly message + "Reload" button
- Replace bare empty-list UIs with illustrated empty states:
  - Inbox empty: "📱 Share your first travel inspiration from Instagram, YouTube, or 小红书"
  - Boards empty: "🗺 Create a board to organise your saved places"
- Each empty state has a primary CTA button (import or share)

### D8 — Swipe-to-Delete on Inbox Cards
**Status**: `[ ]` Not started  
**Why**: Long-press then find delete is clunky. Swipe-left is the iOS convention.  
**Files**: `components/InboxCard.tsx`, new `components/SwipeToDelete.tsx`  
**What to do**:
- Build a `<SwipeToDelete onDelete={fn}>` wrapper using `framer-motion` drag constraints
- Swipe left past 80px threshold reveals a red delete zone; release triggers delete
- Snap back if threshold not reached
- Spring animation for both reveal and snap-back
- Haptic `impact` when threshold is crossed; `notify(error)` on confirm

### D9 — Live Nearby Clips on Map (On-Trip Mode Lite)
**Status**: `[ ]` Not started  
**Why**: C1 (On-Trip GPS Mode) is a key product promise. This is the MVP version.  
**Files**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Add a "📍 Nearby" button to the map view (bottom-right FAB)
- On tap, call `navigator.geolocation.getCurrentPosition()`
- Fly map to user's location, show a pulsing blue dot
- Highlight clips within 5 km radius (change pin color / add glow)
- Show count badge: "3 saved spots nearby"
- Ask for location permission gracefully; if denied, show toast explaining why

### D10 — App Icon, Splash Screen & App Store Assets
**Status**: `[ ]` Not started  
**Why**: The Xcode project uses placeholder icons. Without real assets, the app can't ship to App Store.  
**Files**: `ios/App/App/Assets.xcassets/`, new `scripts/generate-app-icons.js`  
**What to do**:
- Create a Node.js script (`scripts/generate-app-icons.js`) that generates all required iOS icon sizes
  from the same indigo "T" design as the browser extension icons
  (20×20, 29×29, 40×40, 60×60, 76×76, 83.5×83.5, 1024×1024 etc.)
- Generate a simple gradient splash screen image (1242×2688 px)
- Write generated PNGs into `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Update `Contents.json` to reference the generated files
- Add a build script entry to `package.json`: `"ios:icons": "node scripts/generate-app-icons.js"`

---

## PHASE C — On-Trip Mode (Future)

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Not started  
**Note**: MVP version shipped as D9

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
