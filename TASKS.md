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
**Status**: `[x]` Done

### C4 — Proactive Resurfacing
**Status**: `[x]` Done

---

## PHASE D — iOS Beauty & Polish (Current Sprint)

> Goal: every screen should feel like a native iOS app — delightful, fast, and instantly intuitive to a first-time user.

### D1 — Substance Visible in Inbox Cards 🔴 HIGHEST PRIORITY
**Status**: `[x]` Done  
**Why**: The substance extraction is the #1 moat, but `InboxCard` only shows title, thumbnail, tags, and a count badge. Users never read the actual wisdom unless they open the map detail card. This is the single biggest gap between "feature exists" and "feature is felt".  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Show the first 1–2 substance items directly on the card (below tags)
- Use icon + short content text: "💡 Arrive before 8am to beat the queue"
- Type-colored left border accent (warning=amber, tip=blue, wisdom=purple)
- Collapse/expand if >2 items (tap card to expand inline — avoid navigation)
- Empty substance: don't render the section (no whitespace)

### D2 — Dark Mode Support
**Status**: `[ ]` Not started  
**Files**: `app/globals.css`, all major components  
**What to do**:
- Add `dark:` Tailwind classes throughout the app (bg, text, border colors)
- Use `prefers-color-scheme` media query via Tailwind's `dark` variant
- Add `colorScheme: 'dark light'` to `app/layout.tsx` metadata
- Test key surfaces: map top bar, inbox cards, plan page, settings, share page
- Map tiles already work in dark mode (OpenFreeMap has dark styles available at `https://tiles.openfreemap.org/styles/dark`)

### D3 — Haptic Feedback on Key Interactions
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `app/share/page.tsx`, `app/trip/[boardId]/page.tsx`  
**What to do**:
- Use `navigator.vibrate()` (web) for short haptic pulses on:
  - Clip saved successfully (1 pulse, 50ms)
  - Activity checked off in trip mode (2 pulses, 30ms each)
  - Board selected in share flow (1 pulse, 30ms)
- On iOS Capacitor, use `@capacitor/haptics` with `ImpactStyle.Medium`
- Detect platform and use the right API; no-op gracefully if unavailable
- Don't overdo it — only on decisive confirmation moments, not every tap

### D4 — Illustrated Empty States
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/page.tsx`  
**What to do**:
- Replace plain "No items yet" text with illustrated empty states
- Use large emoji + 2-line description + a clear CTA button
- Inbox empty: "✈️ Nothing saved yet · Share any travel post from Instagram, YouTube, or Xiaohongshu → TravelPanel" + "Clip your first inspiration →" button
- Boards empty: "🗂 No boards yet · Boards let you organise clips by destination" + "Create a board →"
- Map empty (no pins): "🗺 Your map is empty · Save travel clips to see locations pinned here" + share icon
- Use seed boards to pre-fill on first launch (already exists via OnboardingSeed)

### D5 — Swipe-to-Delete on Inbox Cards
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`  
**What to do**:
- Add swipe-left gesture on `InboxCard` to reveal a red delete button
- Use Framer Motion `drag="x"` with `dragConstraints` and a threshold (e.g. -120px)
- On confirm delete: animate card out, call the `onDelete` handler
- On iOS: feels completely native; on web: shows a visual affordance
- Don't require a confirmation dialog — the animation itself is the affordance (undo is out of scope for now)

### D6 — Platform Extraction Quality (Instagram, YouTube, TikTok)
**Status**: `[ ]` Not started  
**Files**: `lib/parse-url.ts`, `app/api/import/route.ts`  
**What to do**:
- Add `instagram`, `youtube`, `tiktok`, `twitter` to the `Platform` type and `detectPlatform()`
- Update `PLATFORM_LABELS` and `PLATFORM_COLORS` for the new platforms
- Add platform-specific user agents and headers in `fetchPageData()` to improve scraping
- For YouTube: extract video title from `<meta property="og:title">` reliably; prompt Claude to extract the places and tips mentioned in the video title/description
- For Instagram/TikTok: these are anti-scraped, document that Vision path (B3) is the fix; add `isAntiScraped` flag to `detectPlatform()` return value and use it in the vision routing

### D7 — Pull-to-Refresh on Inbox
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Add pull-to-refresh gesture to the inbox scrollable list
- On pull: re-trigger enrichment on all `failed` items (re-using existing retry queue from A2)
- Show a subtle spinner at the top during refresh
- Use CSS overscroll with a `touchstart`/`touchmove` event to detect pull distance
- On Capacitor iOS: additionally check App Group for any pending shares that came in while the app was backgrounded

---

## PHASE E — App Store Ready

### E1 — In-App Review Prompt
**Status**: `[ ]` Not started  
**Files**: `app/share/page.tsx` or a new `lib/reviewPrompt.ts`  
**Needs**: `@capacitor/app-review` plugin  
**What to do**:
- Trigger the native iOS App Store review prompt after the user saves their 5th clip (track count in localStorage)
- Use `@capacitor/app-review` on native; gracefully no-op on web
- Only show once (track via `hasShownReview` localStorage key)
- Show at the right moment: on the "done" screen of the share flow, after the checkmark animation

### E2 — Onboarding Walkthrough
**Status**: `[ ]` Not started  
**Files**: new `components/OnboardingWalkthrough.tsx`, `app/layout.tsx` or `app/page.tsx`  
**What to do**:
- 3-screen onboarding shown on first launch (before seed boards appear)
- Screen 1: "Save travel inspiration from anywhere" — show mock share sheet clip
- Screen 2: "AI extracts every location and tip automatically" — show substance card
- Screen 3: "Plan your trip with your own clips" — show plan view mock
- CTA: "Get started →" (dismisses walkthrough, shows seed boards)
- Skip button in top-right corner
- Store `hasSeenOnboarding: true` in localStorage

### E3 — Privacy Policy Page
**Status**: `[ ]` Not started  
**Files**: new `app/privacy/page.tsx`  
**What to do**:
- Simple page with privacy policy text covering:
  - What data is collected (URLs shared, locally stored in IndexedDB)
  - What's sent to third parties (Claude API for extraction, PostHog for analytics)
  - User rights (delete all data from Settings)
  - Contact email
- Link to it from Settings page
- Required for App Store submission

### E4 — Background Enrichment via Service Worker
**Status**: `[ ]` Not started  
**Files**: new `public/sw.js`, `app/layout.tsx`  
**What to do**:
- Register a minimal service worker that listens for a `ENRICH_QUEUE` message
- When the tab is hidden/closed, the SW picks up pending items from IndexedDB and calls `/api/import`
- This ensures Xiaohongshu clips enrich even if the user leaves immediately after saving
- Use `navigator.serviceWorker.postMessage` to hand off the queue
- On iOS Capacitor, the WKWebView SW support is limited — document the limitation and fall back to the existing retry queue (A2)

---

## PHASE F — Cloud & Monetisation Foundation

### F1 — Supabase Full Activation
**Status**: `[ ]` Blocked on `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**What to do once keys provided**:
- Create Supabase project → run `supabase/schema.sql`
- Add sign-in UI to Settings page (magic link + Google OAuth button)
- Wire `syncNow()` on auth change and app focus
- Enable Google provider in Supabase dashboard
- Test round-trip: save on one device → appears on another within 5s

### F2 — Semantic / Vibe Search
**Status**: `[ ]` Blocked on Supabase pgvector (needs F1)  
**What to do**: See original B4 task description.

### F3 — Push Notifications (Enrichment Complete + Nearby)
**Status**: `[ ]` Not started  
**Needs**: Supabase Edge Functions or a simple notification service, `@capacitor/push-notifications`  
**What to do**:
- "Your Tokyo clip has been enriched — 5 locations found" → push when enrichment finishes
- "You saved a clip about Shinjuku — you're 400m away" → local notification using Capacitor LocalNotifications
- For the nearby case: trigger on app foreground via existing `useNearbyClips` hook

### F4 — iOS Home Screen Widget
**Status**: `[ ]` Not started  
**Needs**: WidgetKit (Swift, Xcode)  
**What to do**:
- Small widget: "Today's inspiration" — shows the most recently saved clip thumbnail + title
- Medium widget: shows clip count + recent board names
- Data from App Group UserDefaults (shared with main app)
- Deeplinks into relevant board on tap

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
