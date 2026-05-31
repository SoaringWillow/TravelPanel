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
**Status**: `[x]` Done  
**Needs**: `VOYAGE_API_KEY` (free tier at voyageai.com, 50M tokens/month) — no-ops without it  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page

---

## PHASE C — iOS Polish & Premium Feel (Current Sprint)

> All Phase A + B tasks are done. The product now extracts both spots and substance, has
> a browser extension, fixes Xiaohongshu via Claude Vision, does semantic search, and
> has full data export. The next gap is **iOS look and feel**: the app must feel native,
> beautiful, and premium — good enough to ship to the App Store.

### Recommended execution order for Phase C:
`C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8`

---

### C1 — Dark Mode Support 🔴 HIGH IMPACT
**Status**: `[ ]` Not started  
**Why**: iOS users expect dark mode. Without it, the app looks unfinished and causes eye strain at night.  
**Files**: `app/globals.css`, `tailwind.config.ts`, all page/component files  
**What to do**:
- Add `darkMode: 'media'` to `tailwind.config.ts` (system preference)
- Audit all hardcoded `bg-white`, `text-gray-900` classes — wrap with `dark:bg-gray-900 dark:text-white` equivalents
- Map backgrounds: `#000` or `#0f0f0f` in dark, white pins on dark tiles
- Bottom NavBar: `dark:bg-gray-900/95`
- Share/plan pages: dark-mode safe card backgrounds
- Test on iOS Simulator with dark mode toggle

### C2 — Map View Premium Redesign 🔴 HIGH IMPACT
**Status**: `[ ]` Not started  
**Why**: The map IS the product. Currently uses basic dots. Premium apps have beautiful custom map styles + rich pin designs.  
**Files**: `components/MapView.tsx`  
**What to do**:
- Switch map style to a premium dark/travel-themed tile: use OpenFreeMap's `liberty` or `positron` style
- Replace circle pins with custom teardrop-shaped markers sized by category:
  - food 🍜 → orange teardrop
  - nature 🌿 → green teardrop
  - culture 🏛 → purple teardrop
  - beach 🏖 → cyan teardrop
  - default → indigo teardrop
- Show a small thumbnail image inside the pin if the item has one
- Pin tap: slide-up card (instead of popup) — matches iOS sheet UX
- Show a "substance count" badge on each pin (e.g. "3 tips")
- Smooth camera animation when navigating to a pin

### C3 — iOS Haptic Feedback
**Status**: `[ ]` Not started  
**Why**: Haptics are the difference between "web app" and "native app" feel. Every key tap should have feedback.  
**Files**: new `lib/haptics.ts`, `app/share/page.tsx`, `components/InboxCard.tsx`, `components/NavBar.tsx`  
**What to do**:
- Create `lib/haptics.ts` with `haptic(style)` wrapper:
  - Uses Capacitor's Haptics plugin on iOS
  - No-ops silently on web/Android
  - Styles: `light`, `medium`, `heavy`, `success`, `warning`, `error`
- Apply haptics to: save clip (success), delete clip (warning), plan generated (success), nav tab switch (light), pull-to-refresh (light), board created (medium)
- Install `@capacitor/haptics` if not already present

### C4 — Gesture-Dismiss on Clip Detail
**Status**: `[ ]` Not started  
**Why**: iOS users expect to swipe-down to close sheets. Currently the detail view has no gesture dismissal.  
**Files**: Any clip detail modal/sheet component  
**What to do**:
- Add `@use-gesture/react` drag handler to the bottom sheet handle
- Dragging down > 100px or flicking down → dismiss with spring animation
- While dragging: scale the background (parent) slightly (0.95) for depth effect
- This pattern should apply to: clip detail, board selector, move-to-board sheet

### C5 — On-Trip GPS Mode 🗺
**Status**: `[ ]` Not started  
**Why**: The killer on-trip use case — "What did I save near here?" During a trip, users need location-aware clip surfacing.  
**Files**: new `app/trip-mode/page.tsx`, `components/MapView.tsx`  
**What to do**:
- Add "Start Trip" button on the map view
- In trip mode: show device GPS location on the map (blue pulsing dot)
- Highlight clips within 2km radius — surface them in a "Nearby saves" panel
- Sort nearby clips by distance, show walking time estimate
- "Get directions" → deep link to Apple Maps with coordinates
- Auto-refresh location every 30s
- Exit trip mode button

### C6 — Shared Boards (Read-Only Link Sharing)
**Status**: `[ ]` Not started  
**Why**: "Here's my Tokyo list" is one of the top requested features from analogous apps.  
**Files**: `app/boards/[id]/page.tsx`, new `app/shared/[boardId]/page.tsx`, `app/api/share-board/route.ts`  
**What to do**:
- Add "Share board" button on board detail page
- Generate a short UUID-based share token, store token→boardId mapping in IndexedDB
- Shared URL: `/shared/[token]` — renders board + clips in read-only mode
- The shared page works without auth: fetches board data from the owning device
- NOTE: For the shared page to work cross-device, Supabase (B1) needs to be active. Until then, sharing creates a link that only works on the same device (localhost or Vercel for a single user). Document this clearly.
- Share via iOS Share Sheet / copy link

### C7 — Post-Trip Timeline View
**Status**: `[ ]` Not started  
**Why**: After a trip, users want a beautiful "trip diary" view to look back on.  
**Files**: new `app/plan/[boardId]/timeline/page.tsx`  
**What to do**:
- Add "Timeline view" toggle in the plan view
- Shows activities in chronological scroll (Day 1 → Day N)
- Each day has a header card with the day theme + route map thumbnail
- Activities show as timeline items with time + location + sourced tips
- Pull-to-refresh loads the most recent plan version
- Export as PDF (reuse lib/exportPlan.ts)

### C8 — App Store Readiness Polish
**Status**: `[ ]` Not started  
**Why**: The product needs to ship. This task is a bundle of small things that block App Store submission.  
**Files**: `ios/App/App/Info.plist`, new `app/onboarding/page.tsx`, various  
**What to do**:
- Add proper `NSLocationWhenInUseUsageDescription` to Info.plist (for GPS mode)
- Add `NSPhotoLibraryUsageDescription` for the screenshot upload feature
- Create a 3-step onboarding modal (first-launch only):
  1. "Save inspiration from any app" — shows Share Sheet animation
  2. "AI extracts spots + wisdom" — shows substance layer UI
  3. "Build your dream trip" — shows plan view
  - "Get started" → dismisses, clears `hasSeenOnboarding` flag
- App icon: confirm the Capacitor-bundled icon matches the brand (✈ on indigo)
- Launch screen: update to show TravelPanel branding
- Privacy manifest: add required `NSPrivacyCollectedDataTypes` entries

---

## PHASE D — Monetization + Growth (Future)

### D1 — Pro Subscription Paywall
**Status**: `[ ]` Not started  
**What to do**: Gate plan generation (> 3/month) and semantic search behind a Pro tier ($4.99/month). Use RevenueCat for iOS IAP. Show paywall sheet with "Pro" badge in nav.

### D2 — Push Notifications
**Status**: `[ ]` Not started  
**What to do**: Weekly "You saved 3 new spots — ready to plan?" nudge. Use `@capacitor/push-notifications` + OneSignal free tier.

### D3 — Social Sharing (Trip Card)
**Status**: `[ ]` Not started  
**What to do**: Generate a beautiful shareable image of the trip plan (destination collage + day summary). Share to Instagram Stories / WhatsApp.

### D4 — Referral System
**Status**: `[ ]` Not started  
**What to do**: "Invite a friend → unlock 3 extra plans for both". Requires auth (B1).

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
