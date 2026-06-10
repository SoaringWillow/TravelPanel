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

## PHASE D — iOS Polish & Core UX (Current Sprint)

> Goal: Ship a beautiful, native-feeling app. Every screen should feel intentional on iPhone.
> Execution order: D2 → D3 → D4 → D5 → D6 → D7 → D8 → D1 (needs keys) → D9 → D10

### D1 — Supabase Full Activation 🔴 BLOCKED (needs keys)
**Status**: `[ ]` Not started  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from user  
**Files**: `app/settings/page.tsx`, `app/layout.tsx`, new `components/AuthModal.tsx`  
**What to do**:
- Add a "Sign in" button to the Settings page that opens an AuthModal
- AuthModal: email magic-link form + "Continue with Google" button (uses `lib/supabase.ts` auth)
- Wire `syncNow()` from `lib/cloudSync.ts` on: auth state change, app focus, after any clip save
- Show sync status badge in Settings (last synced timestamp, "Syncing…" animation)
- Once logged in, Settings page shows the user's email and a "Sign out" button

### D2 — Swipe Gestures on Clip Cards 🔴 HIGH PRIORITY
**Status**: `[ ]` Not started  
**Why**: Swipe-to-delete and swipe-to-move are the standard iOS UX pattern. Without them, the app feels like a web page, not an app.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Swipe left on a card: reveal a red Delete action and a blue Move action (using `framer-motion` drag or a simple touch handler)
- Swipe right: reveal a green "Done/Archive" action (marks substance as read, or fast-moves to board)
- The swipe reveals a colored background with icon + label (same pattern as iOS Mail)
- At 60% swipe, auto-trigger the action with haptic confirmation
- Use `useMotionValue` + `useTransform` from framer-motion for smooth gesture tracking

### D3 — Haptic Feedback Throughout 🔴 HIGH PRIORITY
**Status**: `[ ]` Not started  
**Why**: Every iOS app uses haptics for confirmation. Without them, interactions feel unresponsive.  
**Files**: new `lib/haptics.ts`, `components/InboxCard.tsx`, `app/share/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `impact(style)`, `notification(type)`, `selection()` wrappers that call `window.navigator.vibrate()` on web and Capacitor Haptics on native
- `impact('light')` — chip selection, filter toggle, card tap
- `impact('medium')` — clip saved, board created, action confirmed
- `notification('success')` — enrichment done, plan generated, export complete
- `notification('error')` — enrichment failed, rate limit hit
- `selection()` — swipe gesture threshold crossed, context menu opened

### D4 — Shimmer Skeleton Loaders
**Status**: `[ ]` Not started  
**Why**: Spinners feel dated; skeletons show shape and reduce perceived load time.  
**Files**: new `components/SkeletonCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/settings/page.tsx`  
**What to do**:
- Create `SkeletonCard` component: animated shimmer (CSS `@keyframes` gradient sweep) in the shape of an InboxCard (thumbnail placeholder + 2 text lines)
- Replace the loading spinner in the inbox with 4 SkeletonCards stacked
- Add skeleton for boards grid: 4 placeholder board cards in a 2×2 grid
- Settings stats row: skeleton numbers while loading
- Shimmer animation: `background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)` with `backgroundSize: 200% 100%` animated

### D5 — Pull-to-Refresh on All Lists
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add a pull-to-refresh gesture on the inbox and boards list (use a simple touch event handler or a small library)
- On pull: trigger `enrichItem` retry for all `failed`/`pending` items (reuses existing retry logic)
- Show a spinner that follows the pull distance (rubber-band spring feel)
- On boards: re-fetch board list + trigger a sync if Supabase is connected

### D6 — Detail Card Polish (Hero Image + Swipe-to-Close)
**Status**: `[ ]` Not started  
**Files**: `components/LocationDetailCard.tsx`  
**What to do**:
- If the clip has a `thumbnail`, show it as a full-width hero image at the top of the detail card (max 180px height, `object-cover`, slight rounded-top corners)
- Add swipe-down-to-close gesture: track `dragY`, when dragged >80px dismiss the card (with spring animation out the bottom)
- Add a pill drag handle at the very top (gray bar, 36×4px, centered) — standard iOS bottom sheet indicator
- Add a native-style share button (Upload icon) in the top-right of the detail card header that triggers `navigator.share()` with the clip URL and title

### D7 — Context Menus (Long-Press) on Cards
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `app/boards/page.tsx`  
**What to do**:
- Long-press on a clip card (>400ms): show a `popover` or `div`-based context menu with: Open, Move to Board, Copy URL, Delete
- Long-press on a board card: show: Open, Rename, Delete
- The context menu should animate in with a scale+fade effect, dismiss on tap-outside
- Board rename: inline text input in the context menu (or a small modal)
- On mobile, this replaces the need for visible edit buttons which clutter the UI

### D8 — Board Cover + Item Count Badges
**Status**: `[ ]` Not started  
**Files**: `app/boards/page.tsx`, `lib/db.ts`  
**What to do**:
- On the boards grid, show the board cover thumbnail (first clip's thumbnail) as a card background, darkened with a gradient overlay
- If no thumbnail is available, show the emoji at a large size on an indigo gradient background
- Item count badge in the top-right of the board card (e.g., "12 clips")
- When the user reorders boards (long-press drag), update the boards array in IndexedDB
- Add `updateBoard(boardId, partial)` helper to `lib/db.ts`

### D9 — On-Trip GPS Mode (Active Navigation View) 🔴 KEY FEATURE
**Status**: `[ ]` Not started  
**Why**: This completes the core use case: user clips destinations → plans a trip → navigates in real-time.  
**Files**: new `app/trip/[tripId]/navigate/page.tsx`, `components/RouteMapView.tsx`  
**What to do**:
- New full-screen map view accessible from the plan view: "Start Trip" button
- Shows the user's real-time GPS position (use `navigator.geolocation.watchPosition`)
- Highlights the next destination in the plan with a pulsing pin
- Shows distance and ETA to the next spot (straight-line distance as fallback, no routing API needed)
- "Next stop" button advances the active waypoint
- Background location updates via Capacitor `@capacitor/geolocation`
- Auto-opens Maps app with directions when user taps on next-stop pin

### D10 — Post-Trip Timeline
**Status**: `[ ]` Not started  
**Files**: new `app/trip/[tripId]/timeline/page.tsx`, `lib/db.ts`  
**What to do**:
- After a trip, prompt "Log what you actually visited"
- Simple checkmark UI: each planned activity has a ✓ (visited), ✗ (skipped), or ✎ (add note) button
- Stores an `actualTimeline` on the Trip object in IndexedDB
- Generates a simple "Your Tokyo Trip" summary view: X of Y planned spots visited, substance items that turned out to be true/false based on notes
- Export as a simple share image (HTML canvas → PNG)

---

## PHASE E — Cloud, Social & Discovery

> Goal: Multi-device sync, sharing with friends, and discovering new destinations.
> Needs B1 Supabase keys to begin.

### E1 — B4 Embedding/Vibe Search (Semantic)
**Status**: `[ ]` Blocked on Supabase pgvector  
**Needs**: B1 Supabase keys + pgvector extension enabled  
**Files**: `app/api/embed/route.ts` (new), `app/inbox/page.tsx`, `components/SearchBar.tsx`  
**What to do**:
- After each clip is enriched, POST to `/api/embed` to generate an embedding (use `voyage-3-lite` via Voyage AI or OpenAI `text-embedding-3-small`)
- Store the vector in Supabase's `items` table (pgvector column)
- Update `SearchBar` to support two modes: keyword (existing) and vibe (semantic)
- Vibe search: POST query to `/api/embed`, get vector, run `<->` similarity query against Supabase
- Show "Vibe search" pill above results; include a note "Finds similar vibes, not just exact matches"
- Toggle between modes with a segmented control

### E2 — Shared Boards
**Status**: `[ ]` Blocked on Supabase auth  
**Files**: `app/boards/[boardId]/share/page.tsx` (new), `app/api/share/route.ts` (new)  
**What to do**:
- "Share board" option in board context menu
- Creates a public read-only URL: `/boards/{boardId}/share?token={jwt}`
- The shared view shows the board's clips, map, and substance (read-only, no auth required)
- Share token is stored in Supabase with expiry (7 days or permanent)
- Recipient can "Add to my TravelPanel" (clones the board into their account)

### E3 — Proactive Resurfacing (Smart Notifications)
**Status**: `[ ]` Blocked on Supabase + push notifications  
**What to do**:
- When the user is near a saved location (GPS geofence), send a push notification: "📍 You're near Tsukiji Market — you saved this 3 months ago"
- Use Capacitor local notifications for iOS
- Geofence radius: 500m
- Max 1 notification per day per clip
- Opt-in from Settings with a toggle

### E4 — Import from Maps & Bookmarks
**Status**: `[ ]` Not started  
**What to do**:
- "Import from Google Maps saved places" — user pastes the Google Takeout JSON export, we parse locations and create clips
- "Import from Apple Maps" — parse shared `.maps` links or clipboard URLs
- "Import from browser bookmarks" — accept HTML bookmark exports, filter for travel-related URLs, batch-enrich them
- Batch import page with progress bar and per-item enrichment status

---

## PHASE F — App Store & Distribution

### F1 — App Store Assets
**Status**: `[ ]` Not started  
**What to do**:
- App icon: 1024×1024 PNG, indigo background, white location pin
- Launch screen: centered logo on white background with "TravelPanel" wordmark
- App Store screenshots: 6.5" and 5.5" iPhone sizes, 5 screens (Home/Map, Clip from Share, Inbox, Board, Trip Plan)
- App Store description, keywords, category (Travel)
- Privacy policy URL (required for App Store submission)

### F2 — Onboarding Flow (First-Time Experience)
**Status**: `[ ]` Not started  
**Files**: new `app/onboarding/page.tsx`, new `components/OnboardingFlow.tsx`  
**What to do**:
- 3-screen swipeable onboarding: (1) "Save travel inspiration from anywhere" (show Share Sheet), (2) "AI extracts the wisdom" (show substance items), (3) "Plan your trip in one tap" (show itinerary)
- Shows on first launch only (detect via `hasSeenOnboarding` in localStorage — already gated, this adds the visual flow)
- "Get started" button at the end → sets `hasSeenOnboarding=true`, dismisses to home

### F3 — Pro Tier UI
**Status**: `[ ]` Not started  
**What to do**:
- Add "Pro" badge and upgrade prompt to: rate limit messages, plan export, shared boards
- Settings page: "Upgrade to Pro" section with feature comparison (Free vs Pro)
- Free tier limits: 50 clips, 3 boards, 2 plan generations/day
- Pro: unlimited everything + priority processing + vibe search
- No payment integration needed yet — just the UI gates + a waitlist email capture

---

## PHASE C — On-Trip Mode (Superseded by D9/D10)

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Superseded by D9 (more detailed spec)

### C2 — Post-Trip Timeline
**Status**: `[ ]` Superseded by D10 (more detailed spec)

### C3 — Shared Boards v1
**Status**: `[ ]` Superseded by E2 (more detailed spec)

### C4 — Proactive Resurfacing
**Status**: `[ ]` Superseded by E3 (more detailed spec)

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
