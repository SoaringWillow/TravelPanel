# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-01)

The app's core extraction loop is complete. The next focus is **iOS beauty** — making the app feel native and polished — followed by **on-trip utility** (GPS, sharing) and **production hardening**.

`D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → C1 → C3 → E1 → E2 → E3`

(C2/C4 require trip-date tracking infrastructure not yet built; do after C1. B4 is blocked on Supabase keys.)

---

## PHASE A — Bug-Free MVP ✅ Complete

All A-phase tasks are done. See completed task list at the bottom.

## PHASE B — Cloud Sync + Auth

### B1 — Supabase Setup
**Status**: `[~]` Scaffolded, dormant until keys  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Remaining**: Create Supabase project, run `supabase/schema.sql`, add sign-in UI, wire `syncNow()`, enable Google OAuth in dashboard.

### B2 — Browser Extension
**Status**: `[x]` Done  
MV3 Chrome extension with 10-platform detection, ⌘⇧S shortcut, options page, icon generator.

### B3 — Xiaohongshu Fix (Claude Vision)
**Status**: `[x]` Done  
iOS ShareViewController captures + compresses screenshot; CapacitorBridge bridges to sessionStorage; import API uses vision messages path.

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Blocked — needs Supabase pgvector (from B1)  
**What to do once unblocked**: Embed clip descriptions + substance text using Claude Embeddings API, store vectors in Supabase pgvector, add semantic search bar ("minimalist cafe Tokyo"). Use `text-embedding-3-small`. Cosine similarity query via Supabase RPC.

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
Settings page with JSON export (all clips/boards/plans), data stats, danger-zone clear-all.

---

## PHASE D — iOS Beauty Sprint (Current Sprint)

### D1 — Safe Area CSS Everywhere 🔴 HIGHEST PRIORITY
**Status**: `[ ]` Not started  
**Why**: The viewport meta has `viewport-fit=cover` but no CSS safe area variables are applied. On iPhones with Dynamic Island or notch, the header and bottom NavBar content is cut off.  
**Files to change**: `app/globals.css`, `app/layout.tsx`, `components/NavBar.tsx`, and any page with fixed headers  
**What to do**:
- Add CSS variables for safe areas in `globals.css`:
  ```css
  :root {
    --sat: env(safe-area-inset-top);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
    --sar: env(safe-area-inset-right);
  }
  ```
- Add utility classes: `.safe-top { padding-top: max(1rem, env(safe-area-inset-top)); }`, `.safe-bottom { padding-bottom: max(0.5rem, env(safe-area-inset-bottom)); }`
- Apply `pb-safe` (or equivalent) to the NavBar so tabs aren't hidden behind the home indicator
- Apply `pt-safe` to fixed page headers on map, share, and settings pages
- Test visually: the NavBar bottom edge should sit above the home indicator bar

### D2 — Loading Skeletons (Replace Spinners)
**Status**: `[x]` Done  
**Why**: Spinners look cheap on iOS. Skeleton screens feel native and reduce perceived load time.  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`, new `components/Skeleton.tsx`  
**What to do**:
- Create `components/Skeleton.tsx` — exports `SkeletonCard` (mimics InboxCard shape with animated shimmer) and `SkeletonBoard` (mimics BoardCard)
- Shimmer: use a `bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse` approach with absolute positioning
- In `app/inbox/page.tsx`: replace the spinner with `Array(3).fill(0).map((_,i) => <SkeletonCard key={i} />)` during initial load
- In `app/boards/page.tsx`: same treatment with `SkeletonBoard`
- InboxCard already has a partial skeleton for enrichment loading — ensure it's consistent with the new `SkeletonCard` style

### D3 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done  
**Why**: Delete via a small tap icon is hard to hit on mobile. Swipe-left-to-reveal-delete is the standard iOS pattern.  
**Files to change**: `components/InboxCard.tsx`  
**What to do**:
- Use Framer Motion `drag="x"` with `dragConstraints={{ left: -80, right: 0 }}`
- When `x < -60`, reveal a red "Delete" action area on the right side (absolute positioned)
- When drag exceeds `-160` (snap past), trigger delete with a spring animation
- Mild haptic via `navigator.vibrate(20)` on Android (iOS haptics require Capacitor plugin)
- Keep the existing tap-icon delete as a fallback
- Animate the card out with `exit={{ x: -400, opacity: 0 }}` via AnimatePresence

### D4 — Pull-to-Refresh on Inbox and Boards
**Status**: `[x]` Done  
**Why**: iOS users expect pull-to-refresh on any scrollable list. Currently there's no way to force-reload clips.  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create `hooks/usePullToRefresh.ts`: track touch start Y, on pull-down > 60px show a spinning indicator, on release trigger a reload callback
- Add a subtle "Refreshing…" indicator at the top of the list (Framer Motion slide-down, `y: -40 → 0`)
- On refresh: re-run the enrichment retry queue check (existing `useEnrichmentRetry` hook) + reload boards/items from IndexedDB
- The indicator should have a soft bounce animation and auto-dismiss after 400ms

### D5 — User Location on Map ("Near Me" button)
**Status**: `[x]` Done  
**Why**: A travel app's map with no "where am I" button feels broken. This is table-stakes for any mapping app.  
**Files to change**: `components/MapView.tsx`  
**What to do**:
- Add a "locate me" button (crosshair icon, bottom-right of map above NavBar)
- On click: `navigator.geolocation.getCurrentPosition()` → fly map to user location
- Show a blue pulsing dot at user coordinates (MapLibre `GeolocateControl` or manual source/layer)
- Use MapLibre's built-in `GeolocateControl` and style it to match the app's design
- Handle permission denied: show a toast "Location access denied — check Settings"
- On native (Capacitor), the geolocation API works as-is; no plugin needed

### D6 — Dark Mode Support
**Status**: `[x]` Done  
**Why**: iOS 13+ defaults to system dark mode. An app with no dark mode looks outdated and strains eyes at night. ~60% of travel planning happens in evenings.  
**Files to change**: `tailwind.config.js`, `app/globals.css`, key components  
**What to do**:
- Enable `darkMode: 'media'` in `tailwind.config.js` (class-based would need a toggle — media is simpler)
- Audit and add `dark:` variants to all key components: NavBar, InboxCard, BoardCard, MapView overlay, PlannerAgent, LocationDetailCard
- Key conversions: `bg-white → dark:bg-gray-900`, `text-gray-900 → dark:text-gray-100`, `border-gray-100 → dark:border-gray-800`, `bg-gray-50 → dark:bg-gray-800`
- The map background color should switch: MapLibre's `style` URL can use a dark variant (`maptiler-3d-dark` or `dataviz-dark` from OpenFreeMap equivalent)
- Test both modes: open in iOS Simulator, toggle dark mode in Settings

### D7 — PWA + iOS Home Screen Polish
**Status**: `[x]` Done  
**Files to change**: `app/layout.tsx`, `public/` (add icons), `public/manifest.json`  
**What to do**:
- Add `apple-touch-icon` meta tags pointing to a 180×180 PNG icon (use the browser extension's icon generator approach, scaled up)
- Add `apple-mobile-web-app-title: TravelPanel` and `apple-mobile-web-app-status-bar-style: default` to `<head>`
- Update `public/manifest.json` (or create if missing) with proper `name`, `short_name`, `theme_color: "#4f46e5"`, `background_color: "#ffffff"`, and icon sizes 192/512
- Generate 180×180, 192×192, and 512×512 PNG icons (extend the browser extension's `generate-icons.js`)
- Add `<meta name="mobile-web-app-capable" content="yes">` for Android PWA support
- The splash screen should show the brand gradient, not a white blank

### D8 — Plan Retry UI + Error Boundary
**Status**: `[x]` Done  
**Why**: When the AI plan stream fails (network error, API overload), the user sees a broken half-rendered plan with no way to retry.  
**Files to change**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Wrap the plan streaming section in a React error boundary (`components/ErrorBoundary.tsx` — a simple class component)
- On stream error, show a full-screen "Plan generation failed" state with:
  - Error message (humanized, not raw HTTP error)
  - "Try again" button that re-runs the stream
  - "Change preferences" link back to the board view
- Detect partial stream failure (stream started but cut off mid-JSON): if `DayPlan[]` has < 1 day, treat as error
- Add a progress indicator during streaming: "Generating day 2 of 5…" (parse partial NDJSON to count completed days)

---

## PHASE C — On-Trip Mode

### C1 — On-Trip GPS Mode
**Status**: `[x]` Done  
**What to do**:
- Add a "Start Trip" button to the board view and plan view
- When activated: switch the map to "trip mode" — continuous location tracking via `watchPosition`, blue user dot with accuracy ring
- Show a "Near me" overlay: highlight any saved clips within 500m with a glowing ring and distance label ("200m away")
- Add a floating "Nearby" card at the bottom that lists the 3 closest saved spots with name + distance
- Persist trip mode state in sessionStorage so it survives navigation (not a full trip session — just a mode flag)
- On iOS native via Capacitor: request location permission using `navigator.geolocation` (works without a plugin)

### C2 — Post-Trip Journal
**Status**: `[ ]` Not started  
**Blocked on**: Trip dates (start/end) not yet tracked on `Trip` objects  
**What to do**:
- Add `startDate: string` and `endDate: string` to the `Trip` type in `lib/types.ts`
- Add date pickers to the plan view when generating a trip
- After `endDate` passes, auto-generate a "memory journal" entry: a read-only collage-style view of the clips from that trip, grouped by day, with all their substance items surfaced as "things you noticed"
- Export as a shareable PDF (extend the existing PDF export in `lib/exportPlan.ts`)

### C3 — Shared Boards v1 (Read-Only Link)
**Status**: `[ ]` Not started  
**What to do**:
- Add a "Share" button to the board detail view (`app/boards/[id]/page.tsx`)
- Encode the board + its clip metadata as a compressed URL-safe JSON string (use `pako` for gzip + base64)
- Generate a shareable URL: `https://app.travelpanel.io/view?d=<compressed>` that renders a read-only board view
- Create `app/view/page.tsx` — decodes the URL param, renders a beautiful read-only board card grid (no edit controls)
- The read-only view should show: board name, clip cards with titles/tags/substance items, the board's map with pins
- Limit: if board data exceeds 50KB compressed, prompt user to select specific clips or use Cloud Share (Phase B2 Supabase)

### C4 — Proactive Geo Notifications
**Status**: `[ ]` Not started  
**Blocked on**: Requires background location permission (Capacitor plugin or native code)  
**What to do**:
- On iOS native via Capacitor: use `@capacitor/local-notifications` + `@capacitor/geofencing` to define geofences around saved clip locations
- When user enters a 200m radius of a saved location, fire a local notification: "📍 You're near [Clip Name] — tap to see your notes"
- On web/PWA: not possible without background fetch API — show a banner in-app instead
- Register geofences for the top 20 clips by proximity to current location on app focus
- Clean up old geofences on app background

---

## PHASE E — Production Readiness

### E1 — Real-World Enrichment Signals
**Status**: `[ ]` Not started  
**Why**: The strategic promise is plans that know about festivals, weather, and price surges. Currently plans are entirely based on clip data.  
**Files to change**: `app/api/plan/route.ts`, new `app/api/enrich/signals/route.ts`  
**What to do**:
- Create `app/api/enrich/signals/route.ts` — accepts `{ location: string, startDate: string }` and returns:
  - Weather summary (7-day forecast) from Open-Meteo API (free, no key required)
  - Major events in the area during the date range — use the Claude model to search its knowledge base for major annual events (not a live API)
- Thread the signals into the planner prompt in `app/api/plan/route.ts`: "Note: weather forecast for Tokyo March 28-April 4 is 12-18°C with rain on March 31. Major events: Cherry Blossom season (peak late March), Hanami parties in Shinjuku Gyoen..."
- The planner should reference these signals in activity tips: "🌸 Peak cherry blossom — expect crowds at Ueno Park, book restaurants in advance"

### E2 — Route Optimization in Plans
**Status**: `[ ]` Not started  
**Why**: Plans currently order activities by Claude's judgment, which is not geographically optimal. A 50-pin plan produces visibly inefficient routes.  
**Files to change**: `app/api/plan/route.ts`, new `lib/routeOptimizer.ts`  
**What to do**:
- Implement a nearest-neighbor TSP in `lib/routeOptimizer.ts`:
  - Input: array of `{ id, lat, lng }` locations
  - Output: ordered array minimizing total distance (Haversine formula)
  - Complexity: O(n²) is fine up to 50 locations; flag a warning above 50
- Run the optimizer on the locations within each day's cluster before passing to the plan prompt
- Add a "Optimize route" toggle to the plan generation UI (default ON)
- Show total estimated walking distance per day in the plan header

### E3 — Plan Share Sheet (Web Share API)
**Status**: `[ ]` Not started  
**Files to change**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add a native share button using the [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share): `navigator.share({ title, text, url })`
- The shared content: plan title, first 3 activities as bullet points, and a deep link back to the app
- Fallback for browsers without Web Share API: copy the plan summary to clipboard + show a toast
- On iOS native (Capacitor), the Web Share API triggers the native iOS share sheet

### E4 — AI Cost Monitoring Dashboard
**Status**: `[ ]` Not started  
**Files to change**: `app/settings/page.tsx`, `app/api/import/route.ts`, `app/api/plan/route.ts`  
**What to do**:
- Log approximate token usage per API call to a lightweight store (in-memory + last-7-days in IndexedDB)
- Show a "This month's AI usage" meter in Settings: enrichments used / limit, plans generated / limit
- Estimated cost display (based on Haiku / Opus pricing): "$0.04 used this month"
- When approaching limits, show a proactive warning on the home screen

### E5 — App Store Submission Package
**Status**: `[ ]` Not started  
**What to do**:
- Create `ios/App/Assets.xcassets/AppIcon.appiconset/` with all required iOS icon sizes (20pt → 1024pt) — write a `generate-app-icons.js` script similar to the browser extension's icon generator
- Add a launch screen storyboard in Xcode showing the brand gradient (or use `@capacitor/splash-screen` with a custom image)
- Write App Store description focusing on the moat: "Save travel inspiration from any app. TravelPanel extracts not just pins, but the wisdom — tips, warnings, and recommendations from the content you save."
- App Store keywords: travel planner, trip planning, instagram travel, save places, travel inspiration, AI travel
- Screenshots: 6.5" display (iPhone 14 Pro Max), 5.5" display (iPhone 8 Plus) — minimum 3 screenshots
- Privacy manifest: declare that the app uses location data for "App Functionality" (trip mode, nearby spots)

---

## Completed Tasks

*(Sessions mark tasks [x] here when done)*

**Phase A (all complete)**: A1 substance extraction, A2 enrichment retry, A3 PostHog analytics, A4 AI cost guard, A5 resource notifications, A6 pin clustering, A7 full-text search, A8 onboarding seed boards, A9 plan export PDF+ICS, A10 multi-version plans, A11 substance wisdom view, A12 sourced itineraries

**Phase B (partial)**: B2 browser extension, B3 Xiaohongshu Vision fix, B5 cloud backup export + settings page
