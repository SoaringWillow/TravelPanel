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

## PHASE D — iOS Polish & Visual Quality

> Goal: make the app beautiful and native-feeling on iPhone. These tasks require no external keys.
> Execute in order: D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → D9 → D10

### D1 — Thumbnail Images on InboxCard
**Status**: `[x]` Done  
**Why**: The API extracts `thumbnail` URLs but `InboxCard` never renders them. Cards look bare. Showing the actual post image makes the inbox feel like a real travel feed.  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Render `item.thumbnail` as a leading image on the card (rounded, ~80×80, object-cover)
- Graceful fallback if thumbnail is missing: show a platform-colored icon placeholder
- Lazy-load with `loading="lazy"` and a skeleton pulse while loading
- Keep the existing enrichment-pending skeleton state unchanged

### D2 — Swipe-to-Delete on InboxCard
**Status**: `[x]` Done  
**Why**: iOS users expect swipe-left to reveal delete. The current tap-then-confirm flow is two steps more than necessary.  
**Files**: `components/InboxCard.tsx`, possibly a new `components/SwipeableCard.tsx`  
**What to do**:
- Add a swipe-left gesture that reveals a red Delete action button
- Use `framer-motion` drag with a threshold: release before 40% of card width → snap back; release after 40% → confirm delete
- On delete: show a brief "Deleting…" micro-animation before calling `onDelete`
- Keep the existing action row (map / move / delete buttons) for non-touch contexts

### D3 — Dark Mode Support
**Status**: `[x]` Done  
**Why**: iOS auto-switches to dark mode; the app currently shows blinding white in dark mode.  
**Files**: `app/globals.css`, `tailwind.config.js`, all page/component files with hardcoded `bg-white` / `text-gray-900`  
**What to do**:
- Enable Tailwind's `darkMode: 'media'` (system-preference-based)
- Add `dark:` variants to all major backgrounds, text, border, and card colors
- Key surfaces: navbar bg, card bg, sheet bg, map overlay, plan view
- Test: map overlay, InboxCard, LocationDetailCard, share page, settings page

### D4 — Import Data from Backup
**Status**: `[x]` Done  
**Why**: Without import, the backup export (B5) is a write-only safety net. Users need restore.  
**Files**: `app/settings/page.tsx`, `lib/exportData.ts`  
**What to do**:
- Add an "Import from backup" section below the export button in `/settings`
- File input that accepts `.json`
- Parse and validate as `ExportBundle` (check `version === 2`, required fields)
- Merge strategy: skip items/boards/trips that already exist (by `id`) — no duplicates
- Show a summary: "Imported 12 clips, 3 collections, 1 plan. 4 skipped (already existed)."

### D5 — Pull-to-Refresh on Inbox + Boards
**Status**: `[x]` Done  
**Why**: Standard iOS gesture — users expect it. Currently the only way to refresh is reloading.  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Implement a pull-to-refresh with a spinner using `framer-motion` drag + overscroll detection
- On release: re-run pending enrichment retries + reload items from IndexedDB
- Keep the motion subtle: a small circular spinner that drops in at the top

### D6 — Haptic Feedback on Key Actions
**Status**: `[x]` Done  
**Why**: Haptics make the app feel native on iOS. Saving a clip, creating a board, and completing a plan should all feel satisfying.  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` wrapping `@capacitor/haptics` with a no-op fallback for web
- `HapticsImpactStyle.Medium` on clip saved
- `HapticsImpactStyle.Light` on board created
- `HapticsNotificationType.Success` on plan generation complete
- No-op gracefully outside Capacitor (browser does nothing, no errors)

### D7 — Richer Board Cards (clip count + thumbnails mosaic)
**Status**: `[x]` Done  
**Why**: Board cards show only the board name + emoji. A 2×2 thumbnail mosaic from the first 4 clips gives boards visual identity and makes the collections view look like a polished travel app.  
**Files**: `components/BoardCard.tsx`  
**What to do**:
- Show a 2×2 grid of thumbnails from the first 4 clips in the board (use `item.thumbnail`)
- If fewer than 4 clips: fill empty cells with the board's emoji on a gradient background
- Overlay the board name + clip count badge at the bottom of the mosaic
- Smooth skeleton loading state while thumbnails fetch

### D8 — Offline Banner
**Status**: `[x]` Done  
**Why**: When the user is offline, clip enrichment silently fails. A subtle banner tells them why.  
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx`  
**What to do**:
- Listen to `window.navigator.onLine` + `online`/`offline` events
- Show a slim amber banner at the top: "You're offline — new clips will enrich when back online"
- Banner slides in/out with framer-motion
- Auto-hide 3s after going back online

### D9 — Share Plan as Text
**Status**: `[x]` Done  
**Why**: Users want to share itineraries with travel companions via WhatsApp/iMessage. Currently only PDF/ICS export exists.  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/exportPlan.ts`  
**What to do**:
- Add "Share as text" button to the plan export options
- Generates a clean Markdown-style text: Day 1\n• 9am: Venue (from clip: "title")\n  💡 tip...
- On iOS/desktop: uses `navigator.share()` if available, falls back to copy-to-clipboard
- Show "Copied to clipboard!" toast on fallback

### D10 — Map Style Toggle (Satellite / Standard)
**Status**: `[ ]` Not started  
**Why**: Satellite view is invaluable for nature spots and remote hikes. One tap to toggle.  
**Files**: `components/MapView.tsx`  
**What to do**:
- Add a small style toggle button (map icon / satellite icon) in the top-right corner of the map
- Switch between OpenFreeMap's `liberty` style (standard) and a satellite tile layer
- Store the preference in localStorage so it persists between sessions
- Smooth transition with a brief fade

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

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
