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

## PHASE C — iOS Polish & Beautiful UI (Current Sprint)

> Goal: Ship an iOS app that feels as native and polished as Apple Maps. Every interaction should be fast, beautiful, and intentional. These tasks make the current feature set production-quality.

### C1 — Wisdom Tab per Board
**Status**: `[x]` Done  
**Why**: The Wisdom view is the third primary surface (alongside Map and Plan). Currently substance is visible only in the clip detail card — users never discover the full power of their substance corpus across a whole board.  
**Files**: new `app/boards/[id]/page.tsx` or update `app/boards/page.tsx`, new `components/WisdomTab.tsx`  
**What to do**:
- Add a "Wisdom" tab to the board detail view (alongside a clips list and map view)
- Display all substance items from all clips in the board, grouped by type (tip, warning, opinion, etc.)
- Each item shows: type icon, content, `applies_to` chip, `source_quote` in italic, and tappable link to the source clip
- Add a type filter (show only warnings, only tips, etc.)
- Show substance count badge on the Wisdom tab
- Empty state: "No wisdom yet — your clips' tips and insights will appear here after extraction"
- This is the "personal knowledge base" moment — emphasize it visually

### C2 — Dark Mode Support
**Status**: `[ ]` Not started  
**Why**: iOS users switch to dark mode at night; a travel app is often used in the evening for planning. White backgrounds on a dark phone are jarring and signal an unfinished app.  
**Files**: `app/globals.css`, `tailwind.config.js`, all major components  
**What to do**:
- Add `darkMode: 'media'` to `tailwind.config.js` (system-preference-based)
- Audit all hardcoded white/gray backgrounds and convert to `bg-white dark:bg-gray-950` patterns
- Key surfaces: NavBar, MapView overlay cards, ImportSheet, LocationDetailCard, InboxCard, SharePage, PlanView
- MapLibre map: switch to dark tile style in dark mode (OpenFreeMap has a dark variant)
- Test: all text readable, no pure-white elements visible in dark mode
- Don't build a manual toggle — system preference is enough for v1

### C3 — Haptic Feedback on Key iOS Interactions
**Status**: `[ ]` Not started  
**Why**: Native iOS apps feel alive because of haptics. A travel app that saves a clip should feel satisfying — the Save confirmation is a moment of delight.  
**Files**: `app/share/page.tsx`, `components/ImportSheet.tsx`, `lib/haptics.ts` (new)  
**What to do**:
- Create `lib/haptics.ts` — wraps `@capacitor/haptics` with a no-op fallback for web
- `haptics.impact('light')` — on every button tap in the share flow
- `haptics.notification('success')` — on clip saved successfully  
- `haptics.notification('error')` — on enrichment failure
- `haptics.impact('medium')` — on board selection / plan generation start
- Install `@capacitor/haptics` and sync to iOS

### C4 — Smooth Skeleton Loading States
**Status**: `[ ]` Not started  
**Why**: The inbox and boards currently flash between loading/loaded states with no placeholder. On slow connections (airplane WiFi), users see blank cards. Skeleton screens signal progress and reduce perceived load time.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create a `SkeletonCard` component: animated shimmer placeholder matching InboxCard dimensions
- Show 4 skeleton cards while `useSavedItems` is loading
- Add shimmer animation via CSS: `@keyframes shimmer { 0% { background-position: -200% } 100% { background-position: 200% } }`
- Transition: skeleton → real cards with a subtle fade-in (not a pop-in)
- Apply same pattern to the boards grid

### C5 — Virtual Scrolling for Large Clip Lists
**Status**: `[ ]` Not started  
**Why**: At 200+ clips the inbox renders all items to DOM simultaneously, causing 3-4 second scroll jank on iPhone SE. This is a retention cliff at exactly the users who are most engaged.  
**Files**: `app/inbox/page.tsx`, possibly new `components/VirtualInboxList.tsx`  
**What to do**:
- Install `@tanstack/react-virtual` (already popular, React 18 compatible)
- Replace the flat `items.map(...)` in the inbox with a windowed list rendering only visible items + overscan
- Preserve scroll position on navigation (use `useRef` + `scrollRestoration`)
- Maintain existing sort/filter/search behavior on the virtualized list
- Target: smooth 60fps scroll with 500 items on iPhone SE

### C6 — Pull-to-Refresh in Inbox
**Status**: `[ ]` Not started  
**Why**: The retry queue runs on app load but there's no manual "refresh" affordance. Users who suspect stale data have no recovery path.  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Add pull-to-refresh: on iOS, use `@capacitor/haptics` impact + trigger `retryFailedItems()` from `lib/retryQueue.ts`
- On web, add a subtle refresh button (↺) in the top bar
- Show a loading spinner while retry is in progress
- Show a toast: "Retrying [N] failed clips…" and "All clips up to date" on completion

### C7 — On-Trip GPS Mode ("I just landed")
**Status**: `[ ]` Not started  
**Why**: Nobody owns the on-trip execution moment. This feature answers "I'm at [location], what's nearby from my saves?" — the white space in the competitive landscape.  
**Files**: `app/page.tsx`, `components/MapView.tsx`, new `components/NearbyDrawer.tsx`  
**What to do**:
- Add a "Near Me" button to the map view (location icon, bottom-left floating)
- Request device GPS via `navigator.geolocation.getCurrentPosition`
- Show a bottom drawer with clips sorted by distance from current position
- Each clip shows: distance, clip title, location names, top substance tip (if any)
- Pulse animation on the user's current position marker
- Tap a nearby clip → fly map to that pin + open detail card
- On iOS: use `@capacitor/geolocation` for better accuracy and background access

### C8 — Share Sheet "Quick Save" (no board selection required)
**Status**: `[ ]` Not started  
**Why**: The current share flow requires 2 taps (open sheet → pick board). The absolute minimum friction path is 0 taps after the share action — save to Inbox automatically. Users can organize later. This recovers the "I'm on the bus, save fast" use case.  
**Files**: `app/share/page.tsx`  
**What to do**:
- Add a "Quick Save to Inbox" button above the board chips that saves immediately without picking a board
- Auto-trigger this after a 1.5s timeout if the user doesn't tap (with a cancel option)
- Show a countdown ring animation on the Quick Save button
- This should be the visually dominant action, with board selection as a secondary option

---

## PHASE D — Real-World Enrichment & Memory

> Goal: Make TravelPanel the only travel app whose plans are grounded in the user's real saves AND real-world context. The moat goes from "AI plan from your clips" to "AI plan that knows about festivals, weather, prices, and your specific travel window."

### D1 — Festival & Event Calendar Enrichment
**Status**: `[ ]` Not started  
**Why**: The planner currently generates itineraries with zero awareness of real-world timing. A plan for Tokyo in late March won't mention Cherry Blossom season. This is table stakes for a serious travel planner.  
**Files**: `app/api/plan/route.ts`, new `lib/enrichment/events.ts`  
**What to do**:
- Create a curated database of ~50 major annual events: Cherry Blossom (Tokyo, Mar 25–Apr 10), Golden Week (Japan, Apr 29–May 5), Diwali (India, Oct/Nov variable), Carnival (Rio, variable), Christmas Markets (Germany, Nov/Dec), etc.
- At plan-generation time, detect which destinations are in the plan and which dates overlap with known events
- Inject event warnings into the planner prompt: "Note: Tokyo Cherry Blossom peak (Mar 25–Apr 10) overlaps with the user's dates. Accommodation typically costs 40% above average. Mention this in the plan as a context warning."
- Render event advisories distinctly in the day plan UI: amber `⚠️` cards above affected days
- User can dismiss individual advisories

### D2 — Weather Season Signals
**Status**: `[ ]` Not started  
**Why**: Complements D1. "July is typhoon season in Okinawa" is the kind of wisdom a knowledgeable local friend gives that travel AI completely misses.  
**Files**: `app/api/plan/route.ts`, new `lib/enrichment/weather.ts`  
**What to do**:
- Create a city × month matrix of weather quality signals for the top 50 travel destinations
- Data: best months, shoulder seasons, months to avoid, specific hazards (typhoon, monsoon, extreme heat, cold)
- Inject into planner prompt at plan-generation time based on destination + travel dates
- Show weather signal inline in plan: "May–June is rainy season in Kyoto — pack a compact umbrella"

### D3 — Post-Trip Memory View (Timeline)
**Status**: `[ ]` Not started  
**Why**: Users who generate a trip plan should be able to look back at it later. "Tokyo 2026" as a saved memory, not just an ephemeral plan.  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`, new `components/TripTimeline.tsx`  
**What to do**:
- After a plan is completed, allow "Mark as Taken" → stores the plan's dates in the Trip record
- Add a "Past Trips" section to the boards page showing completed trips with their date + destination
- Tap a past trip → opens a read-only timeline view of the itinerary
- Show a "How was it?" prompt after marking complete (optional notes field)
- This is the Polarsteps moment: make the user feel their trip is remembered

### D4 — Proactive "Near Your Saves" Alerts
**Status**: `[ ]` Not started  
**Why**: Compound value: when a user is in a city where they've saved things, they should know. This turns TravelPanel from a planning tool into an ambient travel companion.  
**Files**: new push notification infrastructure, `app/api/notify-proximity/route.ts`  
**What to do**:
- On app open, check current GPS position against all saved item locations (IndexedDB)
- If ≥2 saves are within 10km, show a non-intrusive banner: "You're near 4 saved spots in Osaka 📍"
- Tap banner → opens a nearby drawer (same as C7)
- Requires permission from the user; graceful decline handling
- Do NOT use background geolocation — only fire on app open

---

## PHASE E — App Store & Monetization

> Goal: Ship TravelPanel to the App Store. Build the Pro tier that makes the business sustainable.

### E1 — App Icon & Splash Screen Polish
**Status**: `[ ]` Not started  
**Why**: The current icon is a placeholder. App Store review requires a 1024×1024 icon and a launch screen that doesn't show the default Capacitor splash.  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `ios/App/App/Assets.xcassets/Splash.imageset/`  
**What to do**:
- Design a clean app icon: indigo gradient background (#4f46e5 → #7c3aed), white airplane/compass/pin motif
- Generate all required iOS icon sizes: 20×20, 29×29, 40×40, 60×60, 76×76, 83.5×83.5, 1024×1024
- Create a custom launch screen that matches the app's indigo theme
- Update `Info.plist` to reference the custom launch screen storyboard

### E2 — App Store Metadata & Privacy Policy
**Status**: `[ ]` Not started  
**Files**: `public/privacy-policy.html` (new), app store listing copy  
**What to do**:
- Write a privacy policy (required by App Store): data stored locally, no third-party tracking without consent, PostHog analytics opt-out, Anthropic API usage
- Write App Store listing copy: name, subtitle (max 30 chars), description (4000 chars), keywords (100 chars)
- Prepare 6.7" and 5.5" iPhone screenshots showing: map view, share sheet, plan view, wisdom tab
- Prepare App Store preview video (optional but strongly recommended)
- Create a `public/privacy-policy.html` page served by the web app

### E3 — Pro Tier (Stripe)
**Status**: `[ ]` Not started  
**Needs**: Stripe API key, Supabase auth from B1  
**What to do**:
- Free tier: 10 clips/day, 2 plan generations/day (already enforced by rate limiter)
- Pro tier ($4.99/month): unlimited clips, unlimited plans, priority enrichment, export to PDF/calendar
- Integrate Stripe Checkout via `app/api/stripe/` routes
- Add "Upgrade to Pro" gate on rate-limit hit (currently shows generic message)
- Pro status stored in Supabase user record (from B1), checked on API routes

### E4 — Quick-Clip from Clipboard
**Status**: `[ ]` Not started  
**Why**: Instagram links don't always open the Share Sheet reliably on Android/web. Clipboard capture is a universal fallback.  
**Files**: `components/CapacitorBridge.tsx`, `app/page.tsx`  
**What to do**:
- On app foreground (focus event), check clipboard for a URL via `navigator.clipboard.readText()`
- If clipboard contains a URL that looks like travel content (instagram.com, youtube.com, etc.), show a banner: "Clip from clipboard? [youtube.com/watch?v=...]" with Save and Dismiss buttons
- Tap Save → opens ImportSheet pre-filled with the clipboard URL
- Clear the detection after the first show (don't repeat on next foreground)
- Requires `clipboard-read` permission (request contextually, not on startup)

### E5 — Shared Boards v1 (Read-Only Link)
**Status**: `[ ]` Not started  
**Needs**: Supabase from B1  
**What to do**:
- "Share board" button on board detail page
- Generates a read-only shareable link: `https://travelpanel.app/board/[shareToken]`
- Public viewer shows: board name, clip count, map with all pins, top substance items
- No login required to view; login required to copy clips into own library
- Share token stored in Supabase (requires B1)

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
