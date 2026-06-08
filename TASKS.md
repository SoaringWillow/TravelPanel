# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-08)

Phases A and B are complete. Phase C delivers the On-Trip and Post-Trip moments.
Phase D polishes the iOS native experience to App-Store-ready quality.

`C1 → C4 → C2 → C3 → D1 → D2 → D3 → D5 → D6 → D7 → D8 → D9 → D10`

(C1 GPS mode + C4 smart inbox are the highest retention drivers; do them first.
D1 iOS polish should happen before App Store submission in D8.)

---

## PHASE A — Bug-Free MVP ✅ Complete

All Phase A tasks done. See git history for details.

---

## PHASE B — Cloud Sync + Auth ✅ Complete (B1 dormant pending Supabase keys)

All Phase B tasks done. B1 (Supabase setup) scaffolded and dormant until
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are pasted into env.

---

## PHASE C — On-Trip Mode + Post-Trip Memory

### C1 — On-Trip GPS Mode 🔴 HIGHEST PRIORITY
**Status**: `[ ]` Not started  
**Why**: On-trip "what's next?" runs every day of a trip, every few hours — this is the daily-active-user engine that changes the retention curve. Nobody in the competitive set owns this.  
**Files to create/change**: new `app/trip/[tripId]/live/page.tsx`, new `components/OnTripView.tsx`, `app/plan/[boardId]/page.tsx`, `lib/db.ts`  
**What to do**:
- Add a **"Start Trip"** button to the trip plan view. When tapped, it opens `/trip/[tripId]/live`.
- The live view shows today's schedule as a vertical timeline card list.
- Use the browser Geolocation API (`navigator.geolocation.watchPosition`) to get current lat/lng.
- Highlight the **next unvisited activity** (nearest pin by walking distance from current location).
- Show an "**Open in Maps**" button for that activity → opens `https://maps.apple.com/?daddr={lat},{lng}` (Apple Maps deep-link for iOS native).
- Each activity card has a **"Done ✓"** button that marks it visited (store `visitedAt: Date.now()` in the trip's `plan.days[day].activities[i]` and persist via `saveTrip`).
- When all activities for the day are checked, show a gentle "🎉 Day complete!" state.
- A minimal sticky header shows: current day, % complete, current time.
- Offline: the live view must work offline — do NOT call any API; use cached trip data from IndexedDB.
- Permission: request geolocation on mount; show a friendly banner if denied explaining what's missing (not an error).

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started  
**Why**: The "here's what your trip looked like" end-screen creates an emotional memory artifact. Polarsteps owns this; we should add a lightweight version tied to our check-in data.  
**Files to create/change**: new `app/trip/[tripId]/memory/page.tsx`, new `components/TripMemoryCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add a **"Trip Memory"** button to the plan view that appears once ≥1 activity has been marked visited (check `visitedAt` fields).
- The memory page renders a vertical timeline of visited activities in order of `visitedAt`.
- Each item shows: activity name, location name, time visited, and — if the source clip has a `thumbnail` — the thumbnail image.
- Include any sourced tips from `activity.sourcedTips[]` as a quote block: _"📍 Day 2 — Bear Pond Espresso. From your IG clip: 'arrive at 8am.'"_
- A "**Share Memory**" button uses the Web Share API (`navigator.share`) to share a text summary.
- If fewer than 3 activities have been visited, show an empty state: "Start checking off activities in On-Trip mode to build your trip memory."
- Keep it scroll-and-read — no editing, no database changes. Pure read view of `visitedAt` data already in the trip.

### C3 — Shared Boards v1
**Status**: `[ ]` Not started  
**Why**: Group trip planning. Wanderlog owns this; we need a basic version to serve Alex-type users (group organizer persona).  
**Needs**: Supabase (B1) — this task is blocked until `NEXT_PUBLIC_SUPABASE_URL` is set.  
**Files to create/change**: `app/boards/[id]/page.tsx`, new `app/boards/[id]/share/page.tsx`, `lib/cloudSync.ts`, `supabase/schema.sql`  
**What to do**:
- Add a **"Share Board"** button (link icon) to the board detail page header.
- Tapping it generates a shareable link: `/boards/[id]?viewer=1&token=[secure_token]`. Token is stored in the board record in Supabase.
- When a guest opens the link with `?viewer=1`, they see the board in read-only mode (no delete, no edit, no move).
- Guest can tap "**Save to My TravelPanel**" to clone the board into their own account.
- The share token can be revoked from the board settings (button: "Stop sharing").
- Limit: view-only for now. No real-time co-edit. Keep implementation simple.
- If Supabase is not enabled, show: "Sharing requires cloud sync. Add Supabase keys to enable."

### C4 — Smart Inbox Auto-Sort 🔴 HIGH PRIORITY
**Status**: `[ ]` Not started  
**Why**: Auto-organization is the ambient promise — "save without thinking about where it goes." Every manual sort is friction. Auto-sort makes the corpus feel like magic.  
**Files to change**: `app/share/page.tsx`, new `lib/autoSort.ts`, `app/api/autosort/route.ts`  
**What to do**:
- Create `/api/autosort/route.ts` that takes `{ item: ImportResult, boards: Board[] }` and returns `{ boardId: string | null, confidence: number, reason: string }` using Claude Haiku.
- Prompt: Given this clip (title, description, tags, locations, top-3 substance items) and these boards (name, emoji, description, existing item count), which board is the best fit? Return null if none match well.
- Create `lib/autoSort.ts` with `suggestBoard(item, boards): Promise<{ boardId: string | null, confidence: number, reason: string }>`.
- In `app/share/page.tsx`, after enrichment completes (on `enrichItem` success), call `suggestBoard`. If `confidence >= 0.7`, show a suggestion banner:
  ```
  ✨ Looks like "Japan Trip" — move there?   [Yes]  [Keep in Inbox]
  ```
  Banner appears as a slide-up snackbar, auto-dismisses after 8 seconds if not tapped.
- Store the user's choice in a "preference memory" in `lib/autoSort.ts`: if user confirms → learn that board, if user rejects → note the rejection. Store as `{ boardId, acceptCount, rejectCount }` in IndexedDB or localStorage.
- After 2 accepts for the same board on similar clips, auto-move without asking (confidence ≥ 0.85 + board has ≥2 accepts).
- Track with analytics: `auto_sort_suggested`, `auto_sort_accepted`, `auto_sort_rejected`.

---

## PHASE D — iOS Polish + App Store Readiness

### D1 — iOS Native Polish (Gestures + Haptics + Safe Areas)
**Status**: `[ ]` Not started  
**Why**: The app runs in Capacitor/WKWebView. iOS users expect native-feeling interactions — swipe to go back, haptic feedback on save, no layout clipping behind notch/home bar.  
**Files to change**: `app/globals.css`, `components/InboxCard.tsx`, `app/share/page.tsx`, `components/LocationDetailCard.tsx`  
**What to do**:
- Add CSS safe-area insets to all full-screen pages using `env(safe-area-inset-*)`:
  ```css
  .safe-top    { padding-top: env(safe-area-inset-top, 12px); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 16px); }
  ```
  Apply `safe-top` to all page headers and `safe-bottom` to all bottom bars.
- Add swipe-to-dismiss on the `LocationDetailCard` bottom sheet using Framer Motion drag:
  ```tsx
  drag="y" dragConstraints={{ top: 0 }} onDragEnd={(_, info) => {
    if (info.offset.y > 100) onClose();
  }}
  ```
- Add haptic feedback on key moments using `@capacitor/haptics` (already in deps):
  - On clip saved: `Haptics.impact({ style: ImpactStyle.Medium })`
  - On "Done ✓" activity check-in: `Haptics.impact({ style: ImpactStyle.Light })`
  - On error: `Haptics.notification({ type: NotificationType.Error })`
  Create `lib/haptics.ts`: a wrapper that no-ops in browser, fires on native only.
- Add `touch-action: manipulation` to all buttons to eliminate 300ms tap delay on iOS Safari.
- Set `viewport-fit=cover` in `app/layout.tsx` meta viewport tag (already needed for notch support).
- Add bounce-back overscroll prevention on the main lists: `overscroll-behavior: none` on `.overflow-y-auto` containers that shouldn't bounce.
- InboxCard: add swipe-left-to-delete gesture (reveal a red "Delete" button at -80px translateX).

### D2 — Push Notifications (Trip Reminders)
**Status**: `[ ]` Not started  
**Why**: Notifications are the re-engagement hook. Without them, iOS users forget the app exists. The highest-value trigger: "Your Japan trip starts in 3 days — here are your 47 Japan clips."  
**Files to create/change**: new `lib/notifications.ts`, `app/plan/[boardId]/page.tsx`, new `app/api/notify-send/route.ts`  
**What to do**:
- Create `lib/notifications.ts` using `@capacitor/push-notifications`:
  - `requestPermission()`: request on first plan save (not on install)
  - `scheduleLocalNotification(title, body, fireAt: Date)`: uses `@capacitor/local-notifications`
  - No-ops in browser context (non-Capacitor)
- In the plan view, after a plan is saved: prompt to set a "trip start date" (a date picker, dismiss-able). If set, schedule two local notifications:
  - 3 days before: "Your [board name] trip starts in 3 days — [N] clips are ready. Open TravelPanel to review your plan."
  - Morning of (8am): "Your trip starts today! Open TravelPanel to see today's itinerary."
- Store `tripStartDate` on the `Trip` record in IndexedDB.
- Show the trip start date in the plan header ("Trip starts: June 14").
- In `app/api/notify-send/route.ts`: send email fallback via Resend (using existing pattern from A5) for non-iOS platforms.
- Track `notification_scheduled`, `notification_tapped` events.

### D3 — Offline Plan Caching (Service Worker)
**Status**: `[ ]` Not started  
**Why**: Travelers need their itinerary at 35,000 feet and in areas with poor signal. The plan MUST work offline.  
**Files to change**: `next.config.js` (next-pwa config), new `lib/offlineCache.ts`  
**What to do**:
- Create `lib/offlineCache.ts` with `cachePlanForOffline(tripId: string)`:
  - Reads the trip from IndexedDB (already offline-capable)
  - Pre-fetches all thumbnail URLs from trip activities and stores them in Cache API:
    ```ts
    const cache = await caches.open('travelpanel-plan-v1');
    for (const url of thumbnailUrls) { await cache.add(url); }
    ```
  - Marks the trip with `cachedForOffline: true` in IndexedDB.
- Add a **"Cache for Offline"** button in the plan view (cloud-with-checkmark icon) that calls `cachePlanForOffline`. Show "✓ Cached" state after completion.
- The plan page itself is already offline-capable (data from IndexedDB). The only gap is thumbnails — this task closes it.
- Update `next.config.js` runtimeCaching to explicitly cache the plan route:
  ```js
  { urlPattern: /^\/plan\//, handler: 'CacheFirst', options: { cacheName: 'plan-pages' } }
  ```
- Show a "No internet — showing cached plan" banner when `navigator.onLine === false`.

### D4 — Trip Check-In Map View
**Status**: `[ ]` Not started  
**Why**: While in trip mode, a compact overhead view of visited vs. unvisited pins gives spatial context that a list cannot. This is the feature that makes the on-trip experience feel truly native.  
**Files to create/change**: `app/trip/[tripId]/live/page.tsx`, new `components/TripMapMini.tsx`  
**What to do**:
- Create `components/TripMapMini.tsx`: a small 200px-tall MapLibre map showing:
  - Green pins: visited activities (with a ✓ badge)
  - Blue pin: current GPS location
  - Orange pin: next unvisited activity (pulsing animation)
  - Dashed line connecting all today's activities in order
- Embed the mini map at the top of the on-trip live view (collapsible with a tap — stores expanded/collapsed in localStorage).
- On "Done ✓", animate the orange pin to green (smooth color transition using MapLibre paint expression).
- Tap a pin on the mini map to scroll the activity list to that item.
- Uses the same MapView infrastructure; no new map library needed.

### D5 — Real-World Enrichment Signals (Festival + Weather)
**Status**: `[ ]` Not started  
**Why**: The planner knows your clips but not the real world. Festival/weather signals are the differentiator that Layla can say generically but TravelPanel says specifically about your trip.  
**Files to create/change**: new `lib/enrichmentSignals.ts`, new `app/api/enrich/route.ts` (upgrade existing), `app/api/plan/route.ts`  
**What to do**:
- Create `lib/enrichmentSignals.ts` with a static dataset of 50+ major annual events:
  ```ts
  const EVENTS: Event[] = [
    { name: "Cherry Blossom Tokyo", location: "Tokyo", country: "Japan",
      window: { month: 3, dayStart: 25, month2: 4, dayEnd: 14 },
      crowdLevel: "extreme", priceSurge: 1.4, note: "Book 3+ months ahead" },
    { name: "Golden Week Japan", location: "Japan", country: "Japan",
      window: { month: 4, dayStart: 29, month2: 5, dayEnd: 5 },
      crowdLevel: "extreme", priceSurge: 1.6, note: "Domestic travel peak" },
    // ... Diwali, Songkran, Carnival, Christmas markets, etc.
  ]
  ```
  Include 50 events: Japan Cherry Blossom, Golden Week, Obon; Thailand Songkran; Bali Nyepi; India Diwali; Europe Christmas markets; Mardi Gras; Carnival Brazil; Edinburgh Fringe; etc.
- Add `getRelevantSignals(destinations: string[], travelDates?: { start: string; end: string }): EventSignal[]` that returns matching events.
- Update `app/api/plan/route.ts`: before calling the itinerary model, call `getRelevantSignals` with the trip destinations (extracted from clip locations). Append a "Real-world context" section to the planner prompt:
  ```
  ⚠️ REAL-WORLD SIGNALS (inject these as inline warnings in the plan):
  - Cherry Blossom Tokyo: peak window Mar 25–Apr 14. Price surge: +40%. Note: Book 3+ months ahead.
  ```
- In the plan output, render enrichment signals with a distinct `⚠️` style — yellow background, inline with the relevant day.
- User toggle: a "🌍 Context" switch at the top of the plan view. When off, the planner skips enrichment signals (pass `skipEnrichment: true` to the API).

### D6 — Wisdom Board View (Substance Browser)
**Status**: `[ ]` Not started  
**Why**: After 100+ saves, the substance layer (tips, warnings, opinions) is a personal knowledge base. It should be browsable. The product strategy calls this the "third primary surface" alongside Map and Plan.  
**Files to create/change**: `app/boards/[id]/page.tsx`, new `components/WisdomView.tsx`, new `components/SubstanceBrowser.tsx`  
**What to do**:
- Add a **"Wisdom"** tab to the board detail view (alongside the existing cards grid). Tab bar: [📍 Clips] [🧠 Wisdom] [🗺 Plan].
- `WisdomView` aggregates all `substance` items from all clips in the board, flattened.
- Group by `type` with section headers: 💡 Tips · ⚠️ Warnings · ⭐ Recommendations · 🧠 Wisdom · 💬 Opinions · 🌍 Context.
- Each substance item shows: the content, the source clip title (tappable → opens that clip's detail), and the `source_quote` in italic if present.
- Add a search input at the top that filters substance items client-side.
- Empty state: "No wisdom collected yet. Clips need to be enriched first."
- Count badge on the Wisdom tab: total substance item count for the board (e.g., "🧠 47").

### D7 — Plan Iteration via Natural Language
**Status**: `[ ]` Not started  
**Why**: The planner is currently regenerate-only. Users want to say "make Day 2 more relaxed" or "remove the museum and add a market." This is the product differentiator: plans sourced from your clips + iteratable by conversation.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`  
**What to do**:
- Add a floating **"Refine Plan"** pill at the bottom of the plan view (above the nav bar). Tapping it opens a sheet with a text input.
- The refinement prompt is appended to the existing plan data. New API parameter: `refinement?: string` alongside the existing `boardId`, `days`, `preferences`.
- In `app/api/plan/route.ts`, when `refinement` is present, include the current plan JSON in the prompt context:
  ```
  Current plan (JSON): <existing plan>
  User refinement request: "${refinement}"
  Generate a revised plan that incorporates this request while keeping what works.
  ```
- The refined plan streams exactly like the original. On completion, it creates a NEW trip version (auto-named "Refined: [refinement text sliced to 30 chars]") rather than overwriting.
- Show the previous version in the version selector so users can compare.
- Example refinements: "More budget options", "Remove Day 3 museum", "More coffee shops", "Add a rest afternoon on Day 2".

### D8 — App Store Readiness
**Status**: `[ ]` Not started  
**Why**: To submit to the App Store we need an icon, splash screen, metadata, and basic privacy docs.  
**Files to create/change**: `ios/App/App/Assets.xcassets/`, `app/privacy/page.tsx`, `public/apple-touch-icon.png`  
**What to do**:
- Create `app/privacy/page.tsx`: a minimal privacy policy page. Content:
  - Data stored: clips, boards, trip plans (stored locally on your device, optionally synced to Supabase if enabled)
  - No data sold to third parties
  - AI processing: clip content is sent to Anthropic Claude API for extraction (Anthropic's data retention policy applies)
  - Contact: jiangnan027@gmail.com
- Generate iOS app icon in all required sizes using a script `scripts/generate-icons.js`:
  - Uses `sharp` npm package to resize a source SVG/PNG to all required iOS sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024px
  - Source: create a `public/app-icon-source.svg` (map pin over blue gradient, same as header logo)
  - Output to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
  - Also generate a 512px and 1024px version for App Store listing
- Create `ios/App/App/Assets.xcassets/Splash.imageset/` with a centered logo on white background in 1x/2x/3x sizes.
- Update `capacitor.config.ts` to include `SplashScreen: { launchShowDuration: 2000, backgroundColor: '#FFFFFF' }`.
- Update `app/layout.tsx` metadata to include:
  - `apple-mobile-web-app-capable: yes`
  - `apple-mobile-web-app-status-bar-style: default`
  - `apple-touch-icon` link tag pointing to the 180px icon
- App Store metadata (README for the submission process):
  - App name: TravelPanel
  - Subtitle: Travel inspiration + AI planner
  - Category: Travel
  - Age rating: 4+
  - Description: (see `public/app-store-description.txt` to create)

### D9 — Multilingual (Chinese UI)
**Status**: `[ ]` Not started  
**Why**: The product targets Chinese-platform users (Xiaohongshu, WeChat, Douyin) as a core persona. Showing UI in Chinese reduces friction dramatically for this audience.  
**Files to create**: new `lib/i18n.ts`, new `lib/locales/zh.ts`, new `lib/locales/en.ts`  
**What to do**:
- Create a minimal translation system in `lib/i18n.ts`:
  ```ts
  const LOCALE_KEY = 'tp_locale';
  export function getLocale(): 'en' | 'zh' { return localStorage.getItem(LOCALE_KEY) as 'en' | 'zh' ?? 'en'; }
  export function t(key: string): string { return locale[key] ?? key; }
  ```
- Create `lib/locales/en.ts` and `lib/locales/zh.ts` with translations for all user-visible strings in:
  - NavBar labels (Map → 地图, Inspiration → 灵感, Collections → 收藏)
  - Share page ("Save to:" → "保存到：", "Inbox" → "收件箱")
  - Inbox page labels and empty states
  - Plan view headings
  - Settings page
- Add a **language toggle** in the settings page: English / 中文 (saves to localStorage, reloads the page).
- Use `t('key')` calls everywhere. Do NOT use a heavy i18n library — the light wrapper is enough for ~50 strings.
- Detect device language on first launch: if `navigator.language.startsWith('zh')`, default to Chinese.

### D10 — Duplicate Detection on Save
**Status**: `[ ]` Not started  
**Why**: Power users often share the same URL from different surfaces. Without dedup, the corpus fills with noise.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- Add `getItemByUrl(url: string): Promise<SavedItem | undefined>` to `lib/db.ts` (check the `items` store by URL).
- In `app/share/page.tsx`, before showing the board picker: call `getItemByUrl(rawUrl)`. If a matching item exists:
  - Show a banner: "You've already saved this 📎. It's in [board name or Inbox]. Save again to a different board?"
  - Two options: "**Save Anyway**" (proceeds with normal flow) and "**View Existing**" (navigates to the board/inbox with that item highlighted).
  - Auto-proceed if the user does nothing in 5 seconds (same as the existing auto-dismiss pattern).
- Normalize URLs before comparison: strip UTM params (`?utm_source=...`), trailing slashes, and fragment identifiers.
- Track: `duplicate_detected`, `duplicate_saved_anyway`, `duplicate_viewed_existing`.

---

## PHASE E — Clip Engine Extraction (Future, Month 12+)

### E1 — Clip Engine npm Monorepo
**Status**: `[ ]` Not started  
**What to do**: Extract `@clip-engine/capture`, `@clip-engine/extract`, `@clip-engine/storage`, `@clip-engine/enrich`, `@clip-engine/synthesize` as a Turborepo workspace. CookPanel shares the engine.

### E2 — CookPanel Spike
**Status**: `[ ]` Not started  
**What to do**: Build 10% of CookPanel using the extracted Clip Engine to validate the multi-vertical thesis.

---

## Completed Tasks

### Phase A (all done)
A1 Substance extraction, A2 Enrichment retry queue, A3 PostHog analytics, A4 AI cost guard, A5 Resource request notifications, A6 Pin clustering, A7 Full-text search, A8 Onboarding seed boards, A9 Plan export PDF+ical, A10 Multi-version plans, A11 Wisdom view in clip detail, A12 Sourced itineraries

### Phase B (all done, B1 dormant)
B1 Supabase scaffolded (dormant), B2 Chrome/Safari browser extension, B3 Xiaohongshu Claude Vision fix, B4 AI vibe search, B5 Cloud backup JSON export
