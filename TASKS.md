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

## PHASE C — On-Trip Mode + iOS Polish

### C1 — Clipboard URL Import (Quick Clip)
**Status**: `[x]` Done  
**Why**: The fastest path to a clip is zero taps — detect a URL already in the clipboard and offer a one-tap save. Matches how power users share: copy link, switch apps, done.  
**Files**: `app/page.tsx`, new `components/ClipboardBanner.tsx`  
**What to do**:
- On map page load, call `navigator.clipboard.readText()` (requires user gesture or auto on focus)
- If text contains a URL and the user hasn't dismissed this URL before (track dismissed URLs in localStorage), show a compact banner above the bottom nav:
  `"📋 Clip from clipboard? [instagram.com/…] [Clip it] [✕]"`
- Tapping "Clip it" opens ImportSheet pre-filled with that URL
- Tapping ✕ saves the URL to a `dismissedClipboardUrls` set in localStorage (don't re-prompt same URL)
- Only trigger on `visibilitychange` to `visible` (app foregrounded) or initial mount — not on every render
- Guard with try/catch; clipboard read can fail if permissions denied

### C2 — Settings Page
**Status**: `[ ]` Not started  
**Why**: Every shipped iOS app needs a settings/about screen. Currently export is buried on the Boards page with no other settings surface.  
**Files**: new `app/settings/page.tsx`, update `components/NavBar.tsx`  
**What to do**:
- Create `/settings` page with sections:
  - **Data**: "Export my data (JSON)" button (reuse `triggerExport` from `lib/exportData.ts`), "Clear all data" with confirmation dialog
  - **App**: version number (from package.json), "Send feedback" mailto link to jiangnan027@gmail.com, "Rate the app" link
  - **Experimental**: toggle for image-mode share (enable/disable clipboard prompt)
- Add a Settings tab (⚙️) to the NavBar as a 4th item — or replace the existing globe tab with a profile/settings icon in the top bar
- Show current clip count and board count in a stats row at the top
- Remove the inline Export button from `app/boards/page.tsx` — link to settings instead

### C3 — On-Trip GPS Mode
**Status**: `[ ]` Not started  
**Why**: Owning the "I just landed, what's near me?" moment is the white space no competitor has touched (per product strategy).  
**Files**: `app/page.tsx`, `components/MapView.tsx`, new `components/NearMePanel.tsx`  
**What to do**:
- Add a "Near Me" FAB or button on the map (compass/location icon, top-right of map)
- On click: request `navigator.geolocation.getCurrentPosition()`; show loading spinner while waiting
- Once location obtained:
  - Show a pulsing "You are here" blue dot on the MapLibre map (using a GeoJSON point layer)
  - Calculate Haversine distance from current position to every saved location
  - Show a bottom drawer panel (draggable, snaps to 40% height) listing nearest 5 clips with distance labels ("0.3 km", "1.2 km")
  - Each clip in the drawer is tappable — flies to its pin and opens the detail card
- "Near Me" toggle: active state shows panel, inactive state hides it and removes the dot
- Distance labels appear on map pins while Near Me is active (small gray text below pin)
- Persist last known position in sessionStorage as a quick-load optimization

### C4 — Real-World Enrichment Signals
**Status**: `[ ]` Not started  
**Why**: Plans lack real-world context (festivals, weather, prices). A Tokyo plan in late March that doesn't mention cherry blossom queues is useless. This is the enrichment layer from the product strategy.  
**Files**: new `app/api/enrich/signals/route.ts`, `lib/types.ts`, `components/LocationDetailCard.tsx`, `app/api/plan/route.ts`  
**What to do**:
- Add `signals?: EnrichmentSignal[]` to `SavedItem` type where `EnrichmentSignal = { type: 'festival' | 'weather' | 'price' | 'crowd' | 'event'; content: string; date?: string }`
- Create `app/api/enrich/signals/route.ts` that accepts `{ locationName, travelDates? }` and uses Claude (with its training knowledge) to generate relevant signals — e.g., weather patterns, major festivals, known price-surge periods, crowd levels by season
- Update `components/LocationDetailCard.tsx` to show a "Signals" section with season/festival chips
- Wire into the plan prompt in `app/api/plan/route.ts`: append signals for each location in the `contentSummary`
- Call the signals endpoint lazily: trigger when user opens LocationDetailCard if `item.signals` is undefined

### C5 — Proactive Resurfacing (Geo-Notifications)
**Status**: `[ ]` Not started  
**Why**: Users save clips and forget them. When they travel near a saved place, the app should surface it.  
**Needs**: `@capacitor/local-notifications`, `@capacitor/geolocation`  
**Files**: new `lib/geoFence.ts`, update `components/CapacitorBridge.tsx`  
**What to do**:
- Install `@capacitor/local-notifications` and `@capacitor/geolocation`
- In `lib/geoFence.ts`: on app foregrounding (on native), get current position and find any saved location within 500m
- If found and not notified in the last 24h (track in localStorage), trigger a local notification: "📍 Near [Location Name] — you have a clip saved here"
- Tapping notification navigates to the item detail card
- Only arm geo-fencing when user has ≥1 location saved and has granted notification permission
- Store `lastNotifiedAt: { [locationKey]: number }` in localStorage to debounce

---

## PHASE D — iOS App Polish & Ship Readiness

### D1 — Dark Mode Support
**Status**: `[ ]` Not started  
**Files**: `app/globals.css`, all components  
**What to do**:
- Add CSS custom properties for dark mode colors to `globals.css`
- Update all Tailwind classes to include `dark:` variants (background, text, border, shadow)
- Add `class="dark"` detection from `prefers-color-scheme` media query in `app/layout.tsx`
- Key surfaces: NavBar, MapView overlay, board cards, detail card, share page, plan view
- The map itself handles dark mode via MapLibre style switching (use a dark map style URL from OpenFreeMap when in dark mode)

### D2 — Haptic Feedback on iOS
**Status**: `[ ]` Not started  
**Needs**: `@capacitor/haptics`  
**Files**: `app/share/page.tsx`, `components/ImportSheet.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Install `@capacitor/haptics`
- Add haptic feedback (ImpactStyle.Light) on: clip save success, board selection tap, plan generation complete
- Add haptic feedback (ImpactStyle.Medium) on: long-press, destructive action (delete)
- Add haptic feedback (NotificationType.Success) on: enrichment complete
- Wrap in try/catch and Capacitor.isNativePlatform() guard — no-op on web

### D3 — Smooth Page Transitions
**Status**: `[ ]` Not started  
**Files**: `app/layout.tsx`, individual page files  
**What to do**:
- Wrap page content in a Framer Motion `<motion.div>` with `initial={{ opacity: 0, y: 8 }}` and `animate={{ opacity: 1, y: 0 }}`
- Share page: slide up from bottom (like a native sheet)
- Detail card: already has animation, improve spring physics
- Plan page: fade in with stagger on day cards
- Use `AnimatePresence` with `mode="wait"` for page-level transitions

### D4 — App Icon & Launch Screen
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/`, `ios/App/App/Info.plist`  
**What to do**:
- Generate a full 1024x1024 app icon using the indigo map-pin SVG (same as browser extension)
- Use `generate-icons.js` pattern to produce all required iOS icon sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024
- Update `Assets.xcassets/AppIcon.appiconset/Contents.json` with all sizes
- Set a launch screen background color (#4F46E5 indigo) with the map-pin SVG centered in `LaunchScreen.storyboard`
- Update `CFBundleDisplayName` in `Info.plist` to "TravelPanel"

### D5 — Inbox Import Performance (Virtual List)
**Status**: `[ ]` Not started  
**Why**: At 200+ clips the inbox scroll jank becomes visible — all cards render at once.  
**Files**: `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Install `@tanstack/react-virtual`
- Replace the flat `items.map()` render in the inbox page with a virtualised list
- Each row is a fixed 120px height `InboxCard` — no layout measurement needed
- Overscan 5 items above/below the viewport
- Keep search filtering working (virtualise the filtered array, not the raw array)

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
