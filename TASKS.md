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

## PHASE D — Beautiful UI & iOS Native Polish

> Ultimate goal: a native-feeling iOS app that passes App Store review and delights users on first launch.
> Each task in this phase should make the app measurably more beautiful or more iOS-native.

### D1 — Dark Mode (system preference respected)
**Status**: `[x]` Done  
**Files**: `app/globals.css`, `app/layout.tsx`, `components/NavBar.tsx`, `components/InboxCard.tsx`, `components/BoardCard.tsx`, `app/boards/page.tsx`, `app/inbox/page.tsx`, `app/settings/page.tsx`  
**What to do**:
- Add dark-mode CSS variable block (`.dark { ... }`) to `globals.css`
- Add an inline `<script>` in `app/layout.tsx` `<head>` that reads `prefers-color-scheme` and sets `class="dark"` on `<html>` before first paint (prevents FOUC)
- Also listen for system changes via `matchMedia` to switch dynamically
- Go through ALL major components and add `dark:` Tailwind variants for backgrounds, text, borders, and shadows
- Dark palette: navy background `#0f172a`, card `#1e293b`, border `#334155`, text `#e2e8f0`

### D2 — Haptic Feedback on Key Interactions
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `app/share/page.tsx`, `app/boards/page.tsx`, `lib/haptics.ts` (new)  
**What to do**:
- Create `lib/haptics.ts` — thin wrapper around `@capacitor/haptics` that no-ops outside native context
- Fire `HapticsImpactStyle.Light` on board chip tap in share flow, card tap in inbox
- Fire `HapticsImpactStyle.Medium` on successful save (share done state)
- Fire `HapticsNotificationType.Error` on enrichment failure
- Fire `HapticsImpactStyle.Heavy` on delete (confirm the destructive action)

### D3 — Swipe-to-Delete on Inbox Cards
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Add swipe-left gesture to InboxCard (using CSS `transform` + pointer events, or `@use-gesture/react`)
- Reveal a red delete zone at ≥60% swipe; on release: confirm delete
- Snap back if swipe < 60%
- Works on both touch (mobile) and mouse (desktop/simulator)

### D4 — Redesigned InboxCard with Substance Preview
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Change done-card layout to horizontal: thumbnail (80×80 square, rounded-xl) on left, content on right
- Below title: show first substance item inline as a small quote in italic
- Replace raw counts (`💡 3 tips`) with a colour-coded row of pills: `📍 Tokyo` `💡 3 tips` `⚠ 1 warning`
- Skeleton: animate with `shimmer` gradient rather than just `animate-pulse`
- Card entry: stagger in with `framer-motion` variants so cards animate in one by one on page load

### D5 — Pull-to-Refresh in Inbox & Boards
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `lib/haptics.ts`  
**What to do**:
- On iOS native: use `@capacitor/haptics` on pull threshold
- On web: implement CSS overscroll-based pull indicator
- On refresh: re-run enrichment retry queue + reload IndexedDB
- Shows a spinner that morphs into a checkmark on completion

### D6 — Offline Network State Banner
**Status**: `[ ]` Not started  
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx`  
**What to do**:
- Listen to `navigator.onLine` + `online`/`offline` events
- When offline: show a subtle amber banner at the top ("No connection — clips save locally and sync when back online")
- When back online: show green "Back online" banner for 2s then dismiss
- Banner slides in from top with spring animation

### D7 — Enhanced Empty States
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Inbox empty state: Large illustration area (use emoji art or SVG), headline "Your travel inspiration starts here", sub-copy about sharing URLs, "Try sharing a YouTube travel video" CTA
- Boards empty state: "Create your first travel board" with a 3-step visual guide
- Both states animate in with spring bounce

### D8 — iOS Quick Actions (Shortcut Items)
**Status**: `[ ]` Not started  
**Files**: `public/manifest.json`, `ios/App/App/Info.plist`  
**What to do**:
- Add `shortcuts` to `manifest.json` for PWA: "Save to Inbox", "My Boards", "Plan a Trip"
- Add iOS Quick Actions (UIApplicationShortcutItem) to `Info.plist`: "Save from Safari", "Open Inbox"

---

## PHASE E — App Store & Production Readiness

### E1 — App Icon (Full iOS Icon Set)
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, new `public/icons/`  
**What to do**:
- Design a proper 1024×1024 app icon: indigo gradient background, white paper airplane / pin hybrid mark
- Generate all required sizes (20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt in @1x/@2x/@3x)
- Use the `generate-icons.py` approach (pure Python, no deps) or ImageMagick
- Also generate PWA icon set for `public/manifest.json`

### E2 — Splash Screen & Launch Image
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/Splash.imageset/`, `capacitor.config.ts`  
**What to do**:
- Create a branded splash: dark indigo background, centered white airplane icon
- Configure @capacitor/splash-screen with correct `backgroundColor` + `showSpinner: false`
- Match the app's dark/light scheme (show correct splash based on system appearance)

### E3 — Privacy Policy Page
**Status**: `[ ]` Not started  
**Files**: new `app/privacy/page.tsx`  
**What to do**:
- Required for App Store submission
- Cover: data collected (only URLs for AI extraction), no PII, local-first storage, no account required
- Link from Settings page

### E4 — Accessibility Audit
**Status**: `[ ]` Not started  
**Files**: Multiple component files  
**What to do**:
- Add `aria-label` to all icon-only buttons
- Test with VoiceOver (simulator or device)
- Support Dynamic Type: use `text-[length]` classes that scale, not fixed `text-sm`
- Minimum tap target 44pt×44pt for all interactive elements
- Sufficient color contrast (WCAG AA at minimum)

### E5 — Performance Optimization (Virtual List)
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, new `components/VirtualList.tsx`  
**What to do**:
- At 100+ inbox items, the current card grid causes performance issues
- Implement windowed rendering: only render cards in the visible viewport + 2 screens of buffer
- Use `IntersectionObserver` or `@tanstack/virtual` for the implementation
- Maintain smooth 60fps scroll on iPhone SE (the weakest device to target)

### E6 — Error Boundary + Crash Reporting
**Status**: `[ ]` Not started  
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`  
**What to do**:
- Wrap the entire app in a React ErrorBoundary
- On error: show a beautiful "Something went wrong" screen with a reload button
- Log the error to PostHog (if key present) with component stack
- Add `window.onerror` and `unhandledrejection` listeners for non-React errors

### E7 — App Store Metadata
**Status**: `[ ]` Not started  
**What to do**:
- Write App Store description (170 chars short, 4000 chars long)
- Write keyword list (100 chars max): travel, trip planner, itinerary, AI, Instagram, etc.
- Create 6.7" iPhone screenshots (1290×2796): map view, inbox, wisdom view, plan, share
- Create 5.5" screenshots (1242×2208) for older devices
- Write "What's New" release notes for v1.0

### E8 — Supabase Auth Activation
**Status**: `[ ]` Waiting for Supabase keys  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**What to do** (once keys available):
- Create Supabase project, run `supabase/schema.sql`
- Add sign-in surface to Settings page: "Sign in to sync across devices" with magic link + Google OAuth
- Wire `syncNow()` on auth state change + app focus
- Enable Google OAuth provider in Supabase dashboard
- Test full sync cycle: save on device A, verify appears on device B

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
