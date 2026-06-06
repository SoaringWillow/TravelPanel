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
**Status**: `[ ]` Not started

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started

### C3 — Shared Boards v1
**Status**: `[ ]` Not started

### C4 — Proactive Resurfacing
**Status**: `[ ]` Not started

---

## PHASE D — Native iOS Polish (Current Sprint — beauty + feel)

> Goal: make TravelPanel feel like a premium iOS travel app, not a web app wrapped in a shell.
> Execution order: `D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → D9 → D10`

### D1 — Beautiful Empty States 🔴 HIGH IMPACT
**Status**: `[x]` Done  
**Why**: Every new user hits the empty state. Right now it's a blank map. This is the first impression.  
**Files**: `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- **Map empty state**: When `items.length === 0` and not loading, show a floating card above the NavBar:
  - "Start exploring — save your first travel inspiration"
  - A subtle animated ping on the FAB button to draw attention
  - Show 3 example source icons (Instagram, YouTube, 小红书)
- **Inbox empty state**: Large centered illustration (SVG globe + sparkles), headline "Your travel inspiration starts here", subline "Share any travel URL from Instagram, YouTube, or 小红书 to clip it", and a "Try a sample clip" button that pre-fills a demo URL
- **Boards empty state**: "No collections yet — save a clip and organize it into a trip board"
- All empty states should animate in with framer-motion (fade + slide up)

### D2 — Swipe Actions on Clip Cards
**Status**: `[x]` Done  
**Why**: The standard mobile gesture for delete/move. Users expect it. Without it, the only way to delete is buried.  
**Files**: `components/InboxCard.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Use `@use-gesture/react` (already compatible with framer-motion) or framer-motion `drag` for horizontal swipe detection
- Swipe left (red destructive zone): shows "Delete" label with trash icon — on release past 40% width, confirm delete with a brief shake animation then remove
- Swipe right (indigo zone): shows "Move" label with board icon — on release, open a bottom sheet board picker
- Both directions: rubber-band spring-back if not released past threshold
- Haptic feedback (via `@capacitor/haptics`) at the threshold crossing point
- Install `@use-gesture/react` if framer-motion drag isn't sufficient: `npm install @use-gesture/react`

### D3 — Pull-to-Refresh on Inbox and Boards
**Status**: `[x]` Done  
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Implement native-feel pull-to-refresh using CSS overscroll + touch events (no library needed)
- On release: re-query IndexedDB + trigger retry for any `enrichmentStatus: 'failed'` items with `retryCount < 3`
- Show a spinner (indigo, 20px) at the top of the list while refreshing
- On Capacitor: also use `App.addListener('resume', ...)` to refresh when app returns to foreground

### D4 — Clip Editing (Notes + Tags)
**Status**: `[x]` Done  
**Why**: Users save clips and often want to add personal notes or correct tags. Right now notes are write-once.  
**Files**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add an "Edit" button (pencil icon) to `LocationDetailCard`
- In edit mode, show: editable notes textarea (multiline), tag chips that can be toggled on/off, and a "Save" button
- On save, call a new `updateItemNotes(id, { notes, tags })` function in `lib/db.ts`
- Animate edit mode in (slide up panel or in-place expansion)
- Support markdown-lite in notes: `**bold**`, `- bullets` rendered on save

### D5 — Board Cover Images from Clip Thumbnails
**Status**: `[x]` Done  
**Files**: `lib/db.ts`, `app/boards/page.tsx`, `components/BoardCard.tsx` (create if needed)  
**What to do**:
- When an item with a thumbnail is added to a board (via `addItemToBoard`), auto-set `board.coverThumbnail` if not already set
- Board cards on the `/boards` page should show the cover image as a full-bleed card header (top 60% of card = image, bottom 40% = name/stats)
- Add a subtle gradient overlay so white text is always readable
- If no cover image, show a gradient background using the board's emoji as a large watermark
- Implement `BoardCard` component if not already separated

### D6 — "Quick Plan" Button on Board Cards
**Status**: `[x]` Done  
**Files**: `app/boards/page.tsx` or `components/BoardCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add a "Plan trip →" button to each board card that has ≥2 clips with locations
- On tap: navigate to `/plan/[boardId]` with pre-filled defaults: 3 days, preferences = "balanced itinerary with morning spots first"
- Auto-start generation (skip the form step) — show agent progress immediately
- If board has <2 location clips: show "Add more clips with locations to plan a trip" tooltip

### D7 — Haptic Feedback via Capacitor Haptics
**Status**: `[x]` Done  
**Files**: `components/ImportSheet.tsx`, `app/share/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Install `@capacitor/haptics` (already in `@capacitor` org, same install pattern as other plugins)
- Create `lib/haptics.ts` with: `lightImpact()`, `mediumImpact()`, `heavyImpact()`, `successNotification()`, `errorNotification()` — all no-op in browser
- Fire `successNotification()` when a clip is saved
- Fire `lightImpact()` at swipe gesture threshold crossing (D2)
- Fire `heavyImpact()` when delete is confirmed
- Fire `mediumImpact()` on plan generation start

### D8 — Map Tag Filters (Filter Pins by Category)
**Status**: `[x]` Done  
**Files**: `components/MapView.tsx`, `app/page.tsx`  
**What to do**:
- Add a horizontally scrollable chip row floating above the NavBar (below the FAB)
- Chips: All, Food, Nature, Culture, Adventure, Beach, City, History (match the tag constants)
- When a chip is active, only show pins for items with that tag; inactive pins fade to 30% opacity
- "All" chip resets the filter
- Selected chip shows filled indigo bg; unselected shows white with border
- Filter state is local to the session (not persisted)

### D9 — Enrichment Progress on Inbox Cards (Live Status)
**Status**: `[x]` Done  
**Why**: After saving, users see a static "pending" card. There's no visual progress. This feels broken.  
**Files**: `components/InboxCard.tsx`, `hooks/useSavedItems.ts`  
**What to do**:
- Show a shimmer/skeleton animation on cards with `enrichmentStatus: 'pending'` or `'processing'`
- Once enrichment completes (status → `'done'`), animate the card content in with a subtle fade
- Show location count pill (e.g. "📍 3 places") once enrichment completes
- Show substance count pill (e.g. "💡 5 tips") if substance items > 0
- Failed enrichment: show a red "Retry" button inline on the card

### D10 — Beautiful Trip Plan Day Cards
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`  
**What to do**:
- Redesign DayStripCard with a timeline layout: vertical line on the left, activity dots on the timeline
- Each activity shows: time (e.g. "9:00am"), name, duration, and sourced tips collapsed (tap to expand)
- Sourced tips show "from your clip: [title]" attribution with an indigo left border
- Day theme shown as a badge above the first activity
- Smooth accordion expand/collapse for activity details using framer-motion
- "View on Map" button per day that filters the RouteMapView to that day's locations

---

## PHASE E — App Store Readiness

> Goal: everything needed to submit to the iOS App Store and acquire first 1000 users.

### E1 — App Icon Set (All iOS Sizes)
**Status**: `[x]` Done  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`  
**What to do**:
- Design a 1024×1024px master icon: indigo gradient background (#6366f1 → #8b5cf6), white globe with location pin
- Export all required sizes using a script (`generate-app-icons.js` using sharp): 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024px
- Update `Contents.json` in the appiconset to reference all sizes
- Also create a 1024×1024 App Store icon (no alpha channel, no rounded corners — Apple applies them)

### E2 — Launch Screen Redesign
**Status**: `[x]` Done  
**Files**: `ios/App/App/Base.lproj/LaunchScreen.storyboard` or Capacitor splash config  
**What to do**:
- Replace the default white splash with: indigo gradient background, centered white TravelPanel globe logo, app name in SF Pro Display Bold
- Use Capacitor SplashScreen plugin config in `capacitor.config.ts` (already partially configured)
- Show for 800ms then fade out (already configured via `launchShowDuration: 800`)

### E3 — Onboarding Flow (First Launch)
**Status**: `[x]` Done  
**Files**: new `app/onboarding/page.tsx`, `app/layout.tsx`  
**What to do**:
- 3-step swipeable onboarding carousel shown once (localStorage flag `hasSeenOnboarding2`)
  - Step 1: "Your travel feed, organized" — show the map + pins animation
  - Step 2: "Clip from anywhere" — show iOS Share Sheet + browser extension
  - Step 3: "AI plans your trip" — show itinerary with sourced tips
- Each step has a headline, sub-copy, and looping Lottie/SVG illustration
- "Get Started" button on last step → navigates to home and loads seed data
- Skip button on all steps
- Check flag on app load in `app/layout.tsx`; if not set, redirect to `/onboarding`

### E4 — App Store Screenshots
**Status**: `[x]` Done (script created; run `npm run screenshots` with a local dev server)  
**What to do**:
- Automate screenshot generation for 6.7" (iPhone 15 Pro Max) and 12.9" (iPad Pro)
- Use Playwright to navigate the app and take screenshots in a seeded state
- 5 required screenshots per device size:
  1. Map with colorful pins + "35 places saved" counter
  2. Import sheet analyzing a Xiaohongshu URL
  3. Clip detail with wisdom section expanded
  4. Board view with cover images
  5. Trip plan day card with sourced tips
- Script: `scripts/screenshots.ts`

### E5 — Privacy Policy + Terms Pages
**Status**: `[x]` Done  
**Files**: `app/privacy/page.tsx`, `app/terms/page.tsx`  
**What to do**:
- Required for App Store submission
- Privacy policy: data stored on-device, AI processing via Anthropic (no training use), optional PostHog analytics (opt-in), no ads
- Terms: user owns their content, no warranty, 18+ or parental consent
- Link both from Settings page

### E6 — App Store Rating Prompt
**Status**: `[x]` Done  
**Files**: `lib/ratingPrompt.ts`, `app/share/page.tsx`  
**What to do**:
- After a user's 3rd successful clip save, show an in-app rating prompt
- On iOS: use `@capacitor-community/app-review` (or direct `SKStoreReviewController`)
- Track in localStorage: `clipSaveCount`. When it hits 3, request review.
- Only request once (set `hasRequestedReview` flag after first request)
- On web (non-native): no-op

---

## PHASE F — Engagement, Retention & Monetization

> Goal: drive weekly active usage, turn casual users into power users, and lay the foundation for a Pro tier.
> Execution order: `F1 → F2 → F3 → F4 → F5 → F6 → F7`

### F1 — Clip Streak & Home Widget (Engagement Hook)
**Status**: `[x]` Done  
**Why**: The North Star metric is weekly clips per active user. A streak is the single most proven habit-formation mechanic.  
**Files**: new `lib/streaks.ts`, `app/settings/page.tsx`, `components/StreakBadge.tsx`  
**What to do**:
- Track `lastClipDate` and `currentStreak` in localStorage
- `recordClipSave()` in `lib/ratingPrompt.ts` should also call `incrementStreak()`
- Show a streak badge (🔥 N days) in the NavBar next to Settings when streak ≥ 2
- On the Settings page, show "Your streak: 🔥 7 days — keep it up!" with a small calendar heatmap (last 30 days, 2-tone: clipped vs not)
- When streak is broken, show a "You missed a day — start a new streak!" banner once

### F2 — Share Your Board (Deep Link Generation)
**Status**: `[x]` Done  
**Why**: Virality is the cheapest user acquisition. Sharing a board brings new users in with context.  
**Files**: `app/boards/[boardId]/page.tsx` (or create it), `app/api/share/route.ts`  
**What to do**:
- Add a "Share board" button on each board detail page
- Generate a deep link: `https://travelpanel.app/board/<boardId>?preview=true`
- The preview page (server-rendered) shows board name, emoji, item count, and top 3 location names — no auth required, read-only
- On iOS, also trigger the native Share Sheet with the deep link URL via `@capacitor/share`
- Store shared board metadata in a `sharedBoards` localStorage key (for now; Supabase when ready)

### F3 — Offline Caching (PWA Service Worker)
**Status**: `[x]` Done  
**Why**: Travel app used abroad → users WILL be offline. Map tiles not loading = catastrophic UX failure.  
**Files**: `next.config.js` (already has next-pwa), `public/sw.js` or next-pwa config  
**What to do**:
- Configure next-pwa to cache: all JS/CSS bundles, the map tile CDN (OpenFreeMap), and the app shell
- Map tile cache strategy: `CacheFirst` with max 500 entries, 7 days TTL
- API routes (`/api/import`, `/api/plan`) should use `NetworkOnly` (never cache AI responses)
- Show a subtle "You're offline — map and saved clips still available" banner when navigator.onLine === false
- Test: open app, turn off network, navigate between tabs — all existing clips and map tiles should still work

### F4 — Dark Mode Support
**Status**: `[x]` Done  
**Files**: `app/globals.css`, `tailwind.config.js`, all major components  
**What to do**:
- Enable Tailwind's `darkMode: 'media'` (respects system preference)
- Add `dark:` variants to all major components: NavBar, InboxCard, BoardCard, LocationDetailCard, ImportSheet
- Map in dark mode: switch to a dark MapLibre style (use OpenFreeMap's dark variant)
- Test: switch device to dark mode → all text readable, no white flash, map style switches

### F5 — Clip Count Milestone Celebrations
**Status**: `[x]` Done  
**Files**: `lib/ratingPrompt.ts` → extend, new `components/MilestoneCelebration.tsx`  
**What to do**:
- At 10, 25, 50, 100 clips: show a confetti burst + "🎉 You've saved 50 places!" modal for 2 seconds
- Use canvas-confetti or a pure CSS animation (no heavy library)
- Track milestones in localStorage to show each only once
- Also show a share prompt: "You've saved 50 travel spots! Share TravelPanel →"

### F6 — Pro Tier Teaser + Paywall
**Status**: `[x]` Done  
**Files**: new `app/pro/page.tsx`, `components/ProGate.tsx`, `lib/pro.ts`  
**What to do**:
- Define Pro features: unlimited plan generations (vs 5/day), board sharing, priority enrichment
- `lib/pro.ts`: `isPro()` checks localStorage `proUnlocked` — always false for now (placeholder for RevenueCat)
- `ProGate` component: when a non-Pro user hits a limit, show a bottom sheet: "Upgrade to Pro — $4.99/month" with feature list and a "Learn More" CTA
- `/pro` page: full Pro features breakdown, pricing, FAQ
- Do NOT implement real payment — just the UI scaffolding for when RevenueCat is integrated

### F7 — Widget Data Provider (iOS Home Screen Widget)
**Status**: `[x]` Done (web side complete; native Swift code documented in ios/App/TravelWidget/WIDGET_SETUP.md)  
**Files**: `ios/App/TravelWidget/` (new Xcode target), `lib/widgetData.ts`  
**What to do**:
- Create a WidgetKit extension in Xcode (Timeline provider) that shows: next unvisited location from the most recent board, or "Add a clip" if inbox is empty
- The widget reads from the App Group UserDefaults the last 3 saved clip titles + locations (written by the main app on each save)
- Update `lib/db.ts` saveItem to also write a `widgetData` key to App Group via @capacitor/preferences
- Widget design: indigo gradient, globe emoji, location name, "Open TravelPanel →" deep link
- Document the Xcode steps required in `ios/App/TravelWidget/WIDGET_SETUP.md`

---

## PHASE G — Performance, Polish & Power Features

> Goal: make TravelPanel feel instant, delight power users, and close the remaining quality gaps before v1.0 App Store launch.
> Execution order: `G1 → G2 → G3 → G4 → G5 → G6`

### G1 — Infinite Scroll / Pagination on Inbox
**Status**: `[ ]` Not started  
**Why**: At 200+ clips, rendering all cards at once causes jank and high memory usage.  
**Files**: `app/inbox/page.tsx`, `hooks/useSavedItems.ts`  
**What to do**:
- Load first 30 items; show "Load more" button (or intersection observer infinite scroll)
- When search is active, search all items client-side but paginate the display
- Show total count in the header: "47 clips (showing 30)"
- Smooth transition when new items load in (framer-motion stagger)

### G2 — Animated Map Route Playback
**Status**: `[ ]` Not started  
**Files**: `components/RouteMapView.tsx`  
**Why**: The plan view shows a static route. An animated "trace" of the route would be visually striking and show the day's journey at a glance.  
**What to do**:
- On day selection, animate the route line drawing in from the first pin to the last
- Use MapLibre's `line-dasharray` animation via a `requestAnimationFrame` loop
- Each activity pin pops in with a scale animation, staggered 200ms apart
- "Replay" button to restart the animation
- Only animate when the day changes; static otherwise

### G3 — Clip Deduplication Warning
**Status**: `[x]` Done  
**Files**: `app/share/page.tsx`, `lib/db.ts`  
**Why**: Users frequently clip the same URL twice. Silent duplicates waste enrichment quota and pollute the inbox.  
**What to do**:
- In `handleSave`, check if a clip with the same URL already exists in IndexedDB
- If it does: show an inline warning in the share sheet "You've already saved this link ([clip title]) — save again anyway?"
- Two actions: "Save Anyway" and "View Existing" (navigates to the existing clip)
- Don't block the user, just inform

### G4 — Substance Highlights on Board Detail Page
**Status**: `[x]` Done  
**Files**: `app/boards/[id]/page.tsx`  
**Why**: The board detail page shows a grid of InboxCards but doesn't surface the wisdom extracted from clips. This is the payoff of substance extraction.  
**What to do**:
- Add a "Highlights" section between the map and the clips grid
- Show the top 3 substance items across all clips in the board (prioritize `warning` and `tip` types)
- Each highlight: icon (💡/⚠️/💬), content text, "from: [clip title]" attribution
- "See all tips" expands to show all substance items from all board clips
- Only show if board has at least 2 clips with substance items

### G5 — Haptic Feedback Audit & Polish
**Status**: `[ ]` Not started  
**Files**: Multiple components  
**Why**: Haptics are inconsistently applied. Key interactions like board creation, plan generation start, and milestone celebration are missing haptic feedback.  
**What to do**:
- Board created: `haptics.success()`
- Plan generation starts: `haptics.medium()`
- Milestone celebration fires: `haptics.success()` + brief delay + `haptics.light()`
- Day selector pill tap in plan view: `haptics.light()`
- Pull-to-refresh trigger point: `haptics.light()`
- Error toast appears: `haptics.error()`
- Audit all existing haptic calls to ensure they fire at the right moment

### G6 — Clip Search Highlight (Match Highlighting)
**Status**: `[ ]` Not started  
**Files**: `components/InboxCard.tsx`, `lib/searchItems.ts`  
**Why**: When a search returns results, users can't see WHY a clip matched. Highlighting the matching text dramatically improves search UX.  
**What to do**:
- `searchItems.ts`: return match positions alongside results (or a `highlight(text, query)` helper)
- `InboxCard`: if a search query is active, wrap matching substring in a `<mark>` with yellow/indigo bg
- Highlight in: title, description, location names, substance content
- Performance: only compute highlights when query is non-empty (no-op otherwise)
- Use a simple regex split approach, not a full diff algorithm

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
