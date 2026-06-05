# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases unless a task is explicitly blocked.

---

## Status Summary (as of 2026-06-05)

### Completed ✅
- A1–A12: Full MVP feature set (substance extraction, enrichment retry, PostHog, rate limits, clustering, search, onboarding, plan export, multi-version plans, wisdom view, sourced plans)
- B2: Browser extension (Chrome/Safari Manifest V3)
- B3: Xiaohongshu/WeChat fix via Claude Vision
- B5: Cloud backup export + Settings page
- C1: On-Trip GPS mode with nearby clip discovery
- C2: Post-trip Timeline view in Collections
- C4: Proactive proximity resurfacing on app open

### Scaffolded / Waiting on Keys 🔑
- B1: Supabase (needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- B4: Embedding search (needs Supabase pgvector from B1)
- C3: Shared boards (needs auth from B1)

---

## PHASE D — iOS Polish & UX Beauty

These tasks make TravelPanel feel like a premium iOS app. No external deps required.

### D1 — iOS Safe Area & Visual Polish 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: The app likely has layout issues near the notch/Dynamic Island and Home Indicator.  
**Files**: `app/globals.css`, `app/layout.tsx`, all page files  
**What to do**:
- Add `safe-area-inset` CSS variables to globals.css using `env()` for top/bottom/left/right
- Replace any hardcoded `pt-12` top padding with `pt-[env(safe-area-inset-top,_48px)]` equivalents
- Add `-webkit-overflow-scrolling: touch` and `overscroll-behavior: none` to the root to eliminate iOS bounce on non-scrollable areas
- Set `viewport-fit=cover` in `app/layout.tsx` meta viewport tag
- Add `-apple-system, BlinkMacSystemFont` to the font stack in tailwind.config.js
- Test: check that NavBar sits above Home Indicator, map fills edge-to-edge, top bar avoids notch

### D2 — Haptic Feedback on Key Actions
**Status**: `[x]` Done  
**Why**: Native iOS apps feel physical. Haptics on clip-save, plan-generate, and board-create make the app feel real.  
**Files**: `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`, `components/ImportSheet.tsx`  
**What to do**:
- Install `@capacitor/haptics` (already likely in package.json — check first)
- Create `lib/haptics.ts` with: `tapLight()`, `tapMedium()`, `tapHeavy()`, `successNotification()`, `errorNotification()` — each wraps `Capacitor.isNativePlatform()` guard
- On clip saved → `successNotification()`
- On board chip tap → `tapLight()`  
- On plan generated → `successNotification()`
- On error → `errorNotification()`
- All functions no-op gracefully on web

### D3 — Clipboard URL Detection on App Open
**Status**: `[x]` Done  
**Why**: Users often copy a Xiaohongshu/Instagram link, switch to TravelPanel, and expect it to "just know." This is a major friction reduction for the core loop.  
**Files**: `components/CapacitorBridge.tsx`, `app/page.tsx`  
**What to do**:
- On app foreground resume (`appStateChange` event in Capacitor App), check the clipboard for a URL
- Use `@capacitor/clipboard` to read clipboard text
- If clipboard contains a valid HTTP URL that looks like a social post (instagram.com, xiaohongshu.com, weixin.qq.com, douyin.com, youtube.com, bilibili.com), show a subtle `ProximityBanner`-style nudge: "📋 Looks like a travel link — clip it?"
- Tapping "Clip it" opens `/share?url=<clipboard-url>` 
- Don't show the nudge if the URL was already clipped (check items by URL)
- Store last-nudged URL in sessionStorage to avoid repeat nudges in same session

### D4 — Better Import UX: Inline Preview
**Status**: `[x]` Done  
**Why**: After entering a URL in ImportSheet, users wait with no feedback. Adding a live preview makes the clip feel more intentional.  
**Files**: `components/ImportSheet.tsx`  
**What to do**:
- After the user stops typing a URL (debounced 1s), fetch og:title + og:image from a lightweight proxy endpoint `GET /api/preview?url=...`
- Create `app/api/preview/route.ts` that fetches the page and returns `{ title, thumbnail, platform }` (reuse `fetchPageData` from import route)
- Show a mini preview card below the URL input: thumbnail (if any) + detected title + platform badge
- Rate-limit the preview endpoint: max 1 req/2s per session (sessionStorage counter)
- If fetch fails / times out, show nothing (don't break the flow)

### D5 — Offline Mode Banner
**Status**: `[x]` Done  
**Why**: Users on a plane or in rural areas lose connectivity. Showing "offline" status prevents frustration when clip/enrich silently fails.  
**Files**: `app/layout.tsx` or a new `components/OfflineBanner.tsx`  
**What to do**:
- Listen to `window` `online`/`offline` events
- When offline, show a fixed bottom banner above NavBar: "✈️ Offline — clips are saved locally"
- Banner animates in/out (framer-motion)
- When back online, briefly show "Back online" in green, then dismiss after 3s
- Banner does NOT block interaction

### D6 — Pull-to-Refresh on Inbox/Boards
**Status**: `[x]` Done  
**Why**: Users intuitively pull-to-refresh on iOS. Currently the inbox doesn't respond.  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add a pull-to-refresh gesture handler: when scroll position is 0 and user pulls down >50px, trigger a data refresh
- Show a spinning indicator at the top while refreshing
- Re-run the enrichment retry queue on refresh (`runRetryQueue()` from lib/retryQueue)
- Use CSS overscroll-behavior carefully to make this feel native, not web-jank

---

## PHASE E — Enrichment & Planning Power-Ups

### E1 — Weather Enrichment on Plan Generation
**Status**: `[x]` Done  
**Needs**: Free weather API (Open-Meteo — no key required)  
**Files**: `app/api/plan/route.ts`  
**What to do**:
- During plan generation, for the primary destination (first location in the first clip), fetch the 7-day weather forecast from `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
- Map WMO weather codes to human-readable summaries (sunny, cloudy, rain, snow)
- Include a `weatherSummary` in the planner context: "Weather forecast for the travel dates: Day 1 sunny 22°C, Day 2 cloudy 18°C..."
- Add `weatherForecast?: { day: number; condition: string; highC: number; lowC: number }[]` to `DayPlan` type
- Render weather chip on each day in the plan UI (sun/cloud emoji + temp range)
- Graceful fallback: if the API fails or no coordinates available, skip without error

### E2 — Batch Import: Paste Multiple URLs at Once
**Status**: `[ ]` Not started  
**Files**: `components/ImportSheet.tsx`, `app/api/import/route.ts`  
**What to do**:
- Detect when the user pastes or types text with multiple URLs (newline-separated or space-separated)
- If >1 URL found, switch to "batch mode" UI: show URL list with checkboxes, "Clip all X URLs" button
- Process URLs sequentially (not in parallel) to avoid rate limits
- Show progress: "Clipping 2 of 5..."
- Save each as a separate item with the same board assignment

### E3 — Smart Day-by-Day Route Optimization
**Status**: `[ ]` Not started  
**Files**: `app/api/plan/route.ts`  
**What to do**:
- Currently the planner distributes locations across days arbitrarily
- Update the `planCluster` prompt to group nearby locations into the same day, minimizing travel time
- Add geographic clustering to the planner: compute pairwise distances between all locations, group by proximity (use a greedy nearest-neighbor approach in the prompt context)
- The prompt should receive a pre-computed distance matrix or cluster assignment hint
- Result: Day 1 visits locations that are all in the same neighborhood, Day 2 in another area

### E4 — Clip Deduplication Detection
**Status**: `[ ]` Not started  
**Files**: `app/api/import/route.ts`, `lib/db.ts`  
**What to do**:
- Before saving a clip, check if the URL already exists in IndexedDB (normalize URL: strip tracking params, lowercase)
- If a duplicate is detected in the share flow, show: "You already saved this — view it?" with a link to the existing item
- Add `getAllItemsByUrl(url: string)` to `lib/db.ts`
- URL normalization: strip `?utm_*`, `&utm_*`, trailing slashes, `www.` prefix

### E5 — Enrichment Progress Indicator in Inbox
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Items with `enrichmentStatus: 'processing'` should show a subtle progress shimmer animation
- Items with `enrichmentStatus: 'failed'` should show a ⚠️ badge with a tap-to-retry button (already partially done, verify it's surfaced)
- Add a small progress bar at the top of the inbox: "Extracting 2 clips..." when any items are in processing state
- Auto-refresh the inbox item list when enrichment completes (listen for IndexedDB updates via polling or BroadcastChannel)

---

## PHASE F — Cloud & Auth (blocked until Supabase keys)

### F1 — Supabase Activate (complete B1)
**Status**: `[ ]` Blocked — needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**What to do** (once keys exist):
- Create Supabase project at supabase.com
- Run `supabase/schema.sql` in the Supabase SQL editor
- Add keys to `.env.local`
- Add sign-in UI surface (magic link email)
- Wire `syncNow()` on auth state change + app focus
- Enable Google OAuth provider in Supabase dashboard

### F2 — Shared Boards via Public Link (C3)
**Status**: `[ ]` Blocked — needs F1  
**What to do**: Once auth exists, allow "Share board" → generates a read-only public URL for a board

### F3 — Embedding / Vibe Search (B4)  
**Status**: `[ ]` Blocked — needs F1 (Supabase pgvector)  
**What to do**: Embed clip descriptions + substance text with Claude Embeddings API, store in pgvector, enable semantic search ("cozy mountain cafe")

---

## PHASE G — App Store & Distribution Polish

### G1 — App Icon Complete Set
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`  
**What to do**:
- Generate all required iOS app icon sizes (20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024pt) from an SVG source
- Create a travel-themed icon: teal background (#0d9488), white map pin with subtle globe detail
- Create `scripts/generate-app-icon.js` (uses same raw PNG approach as extension/generate-icons.js) or document how to use Xcode's icon generator
- Update `Assets.xcassets/AppIcon.appiconset/Contents.json` with all sizes

### G2 — Splash Screen
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/Assets.xcassets/Splash.imageset/`, `capacitor.config.ts`  
**What to do**:
- Design a clean splash: teal background + white TravelPanel wordmark + subtle map pin
- Configure SplashScreen plugin in `capacitor.config.ts` with 800ms fade duration
- Generate at 1x, 2x, 3x resolutions

### G3 — Privacy Policy + Terms Page
**Status**: `[ ]` Not started  
**Files**: new `app/legal/page.tsx`  
**What to do**:
- Create a simple `/legal` page with Privacy Policy and Terms of Service
- Privacy policy must cover: what data is stored (local IndexedDB only), what is sent to Claude API (clip URLs/content), location data (only on device, never sent to server except for plan generation lat/lng)
- Link from the Settings/Profile page

### G4 — App Store Screenshots (automation)
**Status**: `[ ]` Not started  
**What to do**:
- Create a `scripts/screenshots.md` with step-by-step guide for taking App Store screenshots
- Required sizes: iPhone 6.9" (1320×2868), iPhone 6.7" (1290×2796), iPad 12.9" (2048×2732)
- 5 key screens to capture: Map view with pins, Share flow, Wisdom detail view, Trip plan view, GPS trip mode

---

## Execution Order

`D1 → D2 → D3 → D5 → D4 → D6 → E1 → E4 → E5 → E2 → E3 → G1 → G2 → G3 → G4`

F1-F3 unblock only once Supabase keys are provided.
