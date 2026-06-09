# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Updated Execution Order (2026-06-09)

All Phase A–G tasks are complete (E2 skipped — requires Apple Developer account).
The app has: extraction, planning, on-trip GPS, post-trip timeline, vibe search,
browser extension, shared boards, dark mode, haptics, onboarding, festivals,
weather windows, auto-organization, trip recap cards, and clip streak.

The next focus: **robustness + retention polish** before App Store submission.
Core gaps: duplicate detection, offline handling, analytics consent, data safety,
and UX improvements that prevent drop-off.

`H1 → H2 → H3 → H4 → H5 → I1 → I2 → I3 → I4`

---

## PHASE D — iOS App Store Polish

### D1 — Loading Skeletons + Pull-to-Refresh
**Status**: `[x]` Complete
**Why**: Empty grey screens before data loads feel broken. iOS users expect skeleton
shimmer cards (à la Instagram) and pull-to-refresh on all list views.
**Files to change**: `components/SkeletonCard.tsx` (new), `app/inbox/page.tsx`,
`app/boards/page.tsx`, `components/InboxCard.tsx`
**What to do**:
- Create `SkeletonCard.tsx`: animated shimmer card matching InboxCard dimensions
  (use Tailwind `animate-pulse` + gradient)
- Replace the `loading` spinner in Inbox and Boards pages with 6 SkeletonCard
  placeholders in a grid
- Add pull-to-refresh to Inbox list (`@capacitor/haptics` feedback on trigger, then
  re-fetch from IndexedDB)
- Add the `safe-top` / `safe-bottom` safe-area insets consistently across all pages
  that have a header (currently only share page has them)

### D2 — Dark Mode Support
**Status**: `[x]` Complete
**Why**: 60% of iOS users use dark mode. The app is hard-coded white, which burns eyes
at night and feels unpolished.
**Files to change**: `tailwind.config.js`, `app/globals.css`, all components
**What to do**:
- Enable Tailwind `darkMode: 'class'` and add a `dark:` pass to all hard-coded
  `bg-white`, `text-gray-800`, `border-gray-200` etc. values across components
- Add a `ThemeProvider` in `app/layout.tsx` that reads `prefers-color-scheme` on
  mount and sets `document.documentElement.classList`
- Add a Dark Mode toggle in `app/settings/page.tsx` (with options: System / Light / Dark)
- Persist theme preference to localStorage
- Map and card backgrounds need dark counterparts (`bg-gray-900`, `text-gray-100`)

### D3 — Haptic Feedback on Key Actions
**Status**: `[x]` Complete
**Why**: iOS users expect haptic responses. Currently every button is silent tactilely.
**Files to change**: `lib/haptics.ts` (new), `app/share/page.tsx`,
`components/InboxCard.tsx`, `components/TripNavigator.tsx`
**What to do**:
- Create `lib/haptics.ts` with `impact(style)` and `notify(type)` wrappers around
  `@capacitor/haptics` that no-op gracefully in browser
- Add `impact('medium')` on: Save to board tap, clip card tap, plan generation start
- Add `notify('success')` on: successful clip save, plan generated, stop marked as visited
- Add `notify('warning')` on: rate limit hit, enrichment failed
- Add `impact('heavy')` on: delete clip confirmation

### D4 — Error Boundaries + Offline State
**Status**: `[x]` Complete
**Why**: Unhandled React errors crash the whole app with a white screen. Users on planes
need a graceful "you're offline" experience.
**Files to change**: `app/layout.tsx`, new `components/ErrorBoundary.tsx`,
new `components/OfflineBanner.tsx`
**What to do**:
- Create `ErrorBoundary.tsx` (class component) that catches render errors and shows
  a "Something went wrong" card with a Reload button; wrap the main app body
- Create `OfflineBanner.tsx` that listens to `window.online/offline` events and shows
  a subtle top banner: "You're offline — changes will save locally"
- In all API calls (`enrichItem`, vibe search), show a toast if the call fails
  (rather than silently dropping)
- Add `try/catch` around IndexedDB operations with a user-visible "Storage unavailable"
  state in case IndexedDB is blocked (private browsing on some browsers)

### D5 — Onboarding Flow (First Use Tutorial)
**Status**: `[x]` Complete
**Why**: New users see a blank map and don't know what to do. The demo seed boards
show content but don't explain the product.
**Files to change**: new `app/onboarding/page.tsx`, new `components/OnboardingSlides.tsx`,
`app/layout.tsx` (redirect first-timers)
**What to do**:
- Create a 4-slide onboarding flow that shows on first launch (gated by
  `hasCompletedOnboarding` in localStorage):
  1. "Save from anywhere" — shows the share sheet flow with animation
  2. "AI extracts the wisdom" — shows a clip card with substance items
  3. "Plan with your saves" — shows the planner generating a day plan
  4. "Navigate on-trip" — shows the GPS navigator with a nearby stop
- Each slide: full-bleed illustration (use CSS/SVG or Lottie-style motion),
  title, 2-line description, progress dots
- "Get started" on last slide: mark onboarding complete, redirect to `/boards`
- Skip button on slide 1

### D6 — iOS Native Navigation Patterns
**Status**: `[x]` Complete
**Why**: On iOS, users swipe right to go back. The app uses `router.back()` buttons
but has no swipe gesture support, making it feel like a web app, not a native one.
**Files to change**: `app/layout.tsx`, `components/NavBar.tsx`
**What to do**:
- Add `@capacitor/gesture` or a custom swipe detector: on right-edge swipe,
  call `router.back()`
- Add page transition animations: new pages slide in from the right, back
  navigations slide from the left (use Framer Motion `AnimatePresence` with
  direction tracking)
- Ensure the NavBar uses `safe-area-inset-bottom` for devices with home indicator
- Ensure all page headers use `safe-area-inset-top` (pt-12 currently hardcoded;
  replace with `env(safe-area-inset-top)`)

### D7 — App Store Metadata + Assets
**Status**: `[x]` Complete  
**Why**: The Xcode project needs a proper app icon, launch screen, and privacy
manifest before App Store submission.
**Files to change**: `ios/App/App/Assets.xcassets`, `ios/App/App/Info.plist`,
new `public/privacy-policy.html`
**What to do**:
- Create App Store icon set: design a 1024×1024 icon (travel compass or map pin
  with indigo gradient), export all required sizes, place in Assets.xcassets
- Create a launch screen storyboard with the TravelPanel logo centered on
  `#f9fafb` background
- Add required privacy descriptions to `Info.plist`:
  - `NSLocationWhenInUseUsageDescription`: "TravelPanel uses your location to show
    saved places nearby and to navigate your itinerary."
  - `NSCameraUsageDescription`: "TravelPanel can use your camera to capture places
    you visit." (for future photo feature)
  - `NSPhotoLibraryUsageDescription`: "TravelPanel uses your photo library to attach
    memories to places you visit."
- Create `public/privacy-policy.html` with a minimal privacy policy
- Write `App Store Connect` metadata in a text file: name, subtitle, description (30
  words), keywords, category

---

## PHASE E — Cloud + Accounts (Activates B1)

### E1 — Supabase Auth UI (activate the B1 scaffold)
**Status**: `[x]` Complete  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Why**: The Supabase scaffold (lib/supabase.ts, lib/cloudSync.ts) exists but has no
sign-in UI. Cloud sync activates the moment keys are added + this UI is wired.
**Files to change**: new `app/account/page.tsx`, `app/settings/page.tsx`,
`lib/cloudSync.ts` (wire syncNow), `components/NavBar.tsx`
**What to do**:
- Create `app/account/page.tsx` with: magic-link email sign-in form, Google OAuth
  button (Apple OAuth for iOS App Store), signed-in state showing email + "Sync now"
  button
- In `app/settings/page.tsx`, replace the "Cloud sync — coming soon" row with a link
  to `/account`
- Wire `syncNow()` from `lib/cloudSync.ts` on: auth state change (sign-in),
  app focus (Capacitor `appStateChange` event), manual "Sync now" button tap
- Show a subtle sync status indicator in the NavBar (a dot: grey=offline,
  green=synced, orange=syncing, red=error)

### E2 — Apple Sign In (iOS App Store requirement)
**Status**: `[ ]` Needs Apple Developer account + Supabase Apple OAuth config — skipped for now  
**Needs**: Apple Developer account + Supabase Apple OAuth config
**Why**: App Store review requires "Sign in with Apple" when any other OAuth is offered.
**Files to change**: `ios/App/App/AppDelegate.swift`, `app/account/page.tsx`,
`capacitor.config.ts`
**What to do**:
- Install `@capacitor-community/apple-sign-in`
- Add "Sign in with Apple" capability in Xcode
- In `app/account/page.tsx`, add Apple Sign In button with native flow via the plugin
- Pass the Apple ID token to Supabase `signInWithIdToken()` to link accounts
- Handle the sign-in callback and sync the user's IndexedDB data to Supabase

---

## PHASE F — Real-World Enrichment

### F1 — Festival & Events Calendar
**Status**: `[x]` Complete  
**Why**: Plans generated for Kyoto in late March don't mention cherry blossom season.
The moat is "your saves + real-world context."
**Files to change**: new `app/api/enrich/festivals/route.ts`, `app/api/plan/route.ts`
**What to do**:
- Build a hardcoded JSON dataset of ~80 major annual events: Cherry Blossom Tokyo
  (late March–early April), Golden Week Japan (April 29–May 5), Songkran Thailand
  (April 13–15), Rio Carnival (Feb/March), Diwali (Oct/Nov), Chinese New Year
  (Jan/Feb), Oktoberfest (Sep/Oct), Edinburgh Fringe (August), Coachella (April)…
  Each event: `{ name, location, country, lat, lng, startMonth, endMonth, crowdMultiplier, priceMultiplier, notes }`
- In `app/api/plan/route.ts`, before generating the itinerary, query the festival
  dataset for events near the trip's locations and dates
- Inject event warnings into the planner prompt: `⚠️ Note: Tokyo Cherry Blossom
  (late March–April) overlaps these dates — expect 40% higher accommodation prices
  and 2–3× queue times at major parks.`
- Show festival callouts in the plan UI with a 🎉 icon and a dismissible banner

### F2 — Weather Suitability Window
**Status**: `[x]` Complete  
**Why**: Plans don't mention that July in Okinawa is typhoon season, or that Iceland
in December has 5 hours of daylight.
**Files to change**: new `lib/weatherWindows.ts`, `app/api/plan/route.ts`
**What to do**:
- Create a static dataset of weather suitability windows for 50 popular destinations:
  ideal months, months to avoid, and why (rainy season, extreme heat, low daylight)
  e.g. `{ destination: "Okinawa", avoidMonths: [6,7,8], reason: "typhoon season" }`
- Match trip destination to dataset (fuzzy match on location names)
- Inject weather context into the planner prompt and surface in the plan UI
  with a 🌤 / ⛈ icon

### F3 — Smart Board Auto-Organization
**Status**: `[x]` Complete  
**Why**: After 50+ saves, the Inbox is a mess. The ambient organization promise requires
AI to cluster saves into boards automatically.
**Files to change**: new `app/api/auto-organize/route.ts`, `app/inbox/page.tsx`
**What to do**:
- Create `app/api/auto-organize/route.ts`: takes all unassigned Inbox items, uses
  Claude to cluster them by destination (e.g. "Tokyo", "Bali", "Portugal") and
  optionally by vibe (e.g. "Budget eats", "Architecture")
- Return: `{ suggestedBoards: Array<{ name: string; emoji: string; itemIds: string[] }> }`
- Add an "Auto-organize" button to the Inbox header with an ✨ icon
- Show a preview modal: "AI found 3 groups — Tokyo (12), Bali (8), Misc (4)" with
  checkboxes to create each board
- One tap creates the boards and moves the items

---

## PHASE G — Growth & Virality

### G1 — Trip Highlights Reel (shareable social card)
**Status**: `[x]` Complete  
**Why**: Post-trip, users want to share "I visited X places in Y days" — this drives
organic acquisition when shared to Instagram Stories / WeChat Moments.
**Files to change**: new `app/trip-recap/[boardId]/page.tsx`, new `lib/generateRecap.ts`
**What to do**:
- Create a visually beautiful "Trip Recap" page for a completed trip:
  - Full-bleed map thumbnail showing the route
  - "You visited X places in Y days" headline
  - Photo grid of clip thumbnails
  - 3 best substance items as pull-quotes
  - Footer: "Planned with TravelPanel" + App Store link
- Export as a PNG via `html2canvas` (1080×1920 for Stories, 1080×1080 for square)
- Add "Create Recap" button to the trip plan page after plan is complete
- Include a QR code linking to the shared board (from C3)

### G2 — Clip Streak + Habit Nudge
**Status**: `[x]` Complete  
**Why**: North Star metric is weekly clips per active user. A streak mechanic makes
clipping habitual — same psychology as Duolingo's streak.
**Files to change**: new `lib/streak.ts`, new `components/StreakBadge.tsx`,
`app/page.tsx`
**What to do**:
- Track clips per day in localStorage: `{ date: "2026-06-09", count: 2 }`
- Compute current streak (consecutive days with ≥1 clip)
- Show streak in the home screen header: "🔥 7 day streak" badge next to the
  TravelPanel logo
- On 3/7/30 day milestones: show a confetti animation + haptic success feedback
- When streak breaks (no clip yesterday): subtle nudge in the Inbox empty state:
  "You haven't saved anything in 3 days. What are you dreaming about?"

---

## PHASE H — Robustness + Data Safety

### H1 — Duplicate URL Detection
**Status**: `[x]` Complete
**Why**: Users save the same URL twice (e.g. tapping Share on the same post twice). This clogs the inbox with duplicate cards and wastes enrichment quota.
**Files to change**: `lib/db.ts`, `app/share/page.tsx`
**What to do**:
- Add `getItemByUrl(url: string): Promise<SavedItem | undefined>` to `lib/db.ts` — query the `items` store, filter by `url` field, return first match
- In `app/share/page.tsx`, before `saveItem(item)`, call `getItemByUrl(url)`. If found:
  - Show a toast: "Already saved — [View clip] or [Save again]"
  - Default action: close the sheet (don't save). The toast has two action buttons
  - "View clip": navigate to `/?itemId=${existing.id}` and close the sheet
  - "Save again": proceed with the save (duplicates are allowed when intentional)
- Add `url` field to the IndexedDB `items` store index for fast lookups (add to db.ts schema if not present)

### H2 — Analytics Consent Gate
**Status**: `[ ]` Not started
**Why**: PostHog fires without user consent — a regulatory requirement for GDPR/CCPA, and an App Store review concern. Must be opt-in.
**Files to change**: `lib/analytics.ts`, `app/settings/page.tsx`, `app/layout.tsx`
**What to do**:
- In `lib/analytics.ts`, add a `isAnalyticsEnabled()` check at the top of `track()`: reads `localStorage.getItem('analyticsConsent')`. If not `'yes'`, no-op the track call and don't init PostHog
- In `app/layout.tsx`, add a one-time `<AnalyticsConsentBanner>` component (new file `components/AnalyticsConsentBanner.tsx`): shows only if `analyticsConsent` is not set. Show on first launch after onboarding: "📊 Help improve TravelPanel? We collect anonymous usage data. [Yes, that's fine] [No thanks]"
  - "Yes": sets `analyticsConsent: 'yes'`, inits PostHog
  - "No": sets `analyticsConsent: 'no'`, PostHog never inits
- In `app/settings/page.tsx`, add a "Share usage analytics" toggle row (reads/writes `analyticsConsent`)

### H3 — Enrichment Rate Limit User Feedback
**Status**: `[ ]` Not started
**Why**: When users clip their 11th item in an hour, it silently enters a "pending" state with no explanation. Users think the app is broken.
**Files to change**: `lib/enrichItem.ts`, `hooks/useSavedItems.ts`, `components/InboxCard.tsx`
**What to do**:
- In `lib/enrichItem.ts`, when `checkEnrichmentLimit()` returns `{ allowed: false }`, return early with a structured error: `{ status: 'rate_limited', resetsAt: limit.resetsAt }` — don't silently no-op
- In `useSavedItems.ts` / share page: when enrichment is rate-limited, call `showToast()`: "Enrichment paused (10/hour limit). Resumes in X minutes — your clip is saved!"
- In `components/InboxCard.tsx`, if `item.enrichmentStatus === 'pending'` and item is older than 5 minutes, show a subtle subtitle: "⏳ Enrichment queued — retries when limit resets"

### H4 — Offline-Aware API Calls
**Status**: `[ ]` Not started
**Why**: On a plane or with spotty signal, API calls silently timeout after 25+ seconds. Users assume the app is broken, not offline.
**Files to change**: `app/share/page.tsx`, `app/inbox/page.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `lib/network.ts` with `isOnline(): boolean` (checks `navigator.onLine`) and `waitForOnline(): Promise<void>` (resolves when `window.online` fires)
- In `app/share/page.tsx` `handleSave()`: check `isOnline()` before fetching. If offline, save item with `enrichmentStatus: 'pending'`, show toast: "📡 Offline — clip saved! Will enrich when connection returns."
- In `app/plan/[boardId]/page.tsx` `generatePlan()`: if offline, show immediate error: "📡 No connection — connect to generate a plan."
- In `app/inbox/page.tsx` `handleVibeSearch()`: if offline, skip the API call and fall back to keyword search with toast: "📡 Offline — using keyword search."

### H5 — Fix Xiaohongshu Image Extraction TypeScript Error
**Status**: `[ ]` Not started
**Why**: `app/api/import/route.ts` has a pre-existing TS2345 error because the `mimeType` field isn't in `ImagePart` for the current @ai-sdk version. This breaks CI and means image extraction for Xiaohongshu is silently skipped.
**Files to change**: `app/api/import/route.ts`
**What to do**:
- Read the current `@ai-sdk/anthropic` ImagePart type definition to understand the correct field names
- Replace `mimeType: "image/jpeg" | "image/png"...` with the correct property name from the SDK (likely `mediaType` or remove it since it may be inferred)
- Run `npx tsc --noEmit` and confirm the error is resolved
- Test that the image branch still reaches `generateObject` with the correct payload shape
- If the SDK doesn't support inline base64 images in the current version, update `@ai-sdk/anthropic` to the latest version that does

---

## PHASE I — iOS Experience Polish

### I1 — Safe Image Component
**Status**: `[ ]` Not started
**Why**: Broken thumbnail images (dead links, CORS failures, anti-scraping) cause layout shifts and broken cards across the app. No consistent fallback handling.
**Files to change**: new `components/SafeImage.tsx`, `components/InboxCard.tsx`, `components/ResurfaceCarousel.tsx`, `app/trip-recap/page.tsx`
**What to do**:
- Create `components/SafeImage.tsx`: a Next.js `<img>` wrapper with `onError` fallback to a gradient placeholder (use the item emoji or destination initial as text inside a colored div). Props: `src?, alt, fallbackEmoji?, className`
- Replace all raw `<img>` tags with thumbnail URLs across: InboxCard, ResurfaceCarousel, trip-recap page, DayStripCard
- Add `loading="lazy"` to all thumbnail images
- The fallback should be visually consistent: a soft gradient div with the first letter of the item title

### I2 — Onboarding Demo Data Banner
**Status**: `[ ]` Not started
**Why**: New users see pre-populated demo boards and don't understand they're examples. Without a clear "this is a demo" indicator, users may not understand the app's purpose.
**Files to change**: `app/boards/page.tsx`, `lib/db.ts`
**What to do**:
- In `lib/db.ts`, add `hasDemoData(): Promise<boolean>` — returns true if any board or item has `isDemo: true`
- In `app/boards/page.tsx`, check `hasDemoData()` on load. If true, show a dismissible banner at the top of the boards list:
  "🎯 These are example boards to help you get started. [Clear demo data] [Keep exploring]"
- "Clear demo data": calls `clearDemoData()` (already in lib/db.ts if it exists, or create it to delete all items/boards with `isDemo: true`)
- Store dismissal in localStorage (`demoBannerDismissed`) so it only shows once per device

### I3 — Map Clustering Polish
**Status**: `[ ]` Not started
**Why**: At low zoom with 50+ pins, clusters exist but the cluster bubbles lack click-to-expand behavior — tapping a cluster should zoom in, not open a detail card.
**Files to change**: `components/MapView.tsx`
**What to do**:
- In `MapView.tsx`, find the cluster layer click handler. Currently clusters and individual pins may share the same handler
- Add a check: if the clicked feature is a cluster (`feature.properties.cluster === true`), call `map.flyTo({ center: coordinates, zoom: map.getZoom() + 2 })` instead of showing a detail card
- Show cluster count badge in a ring: white circle with dark number, indigo ring border — matching the app's design language
- Individual pins should keep their current behavior (open detail card)
- Add a subtle animation when zooming into a cluster (Framer Motion won't work here — use MapLibre's built-in flyTo easing)

### I4 — Local Push Notifications (Resurfacing Reminder)
**Status**: `[ ]` Not started
**Why**: The North Star metric is weekly clips per active user. The best re-engagement trigger is a scheduled local notification on iOS: "You have 12 saved places you haven't visited yet — ready to plan?"
**Files to change**: `lib/notifications.ts` (new), `app/settings/page.tsx`, `ios/App/App/Info.plist`
**What to do**:
- Install `@capacitor/local-notifications`
- Create `lib/notifications.ts` with: `requestPermission()`, `scheduleWeeklyReminder()` (schedules a Monday 9am notification), `cancelReminders()`, `isPermissionGranted()`
- In `app/settings/page.tsx`, add a "Weekly planning reminder" toggle row. On enable: call `requestPermission()`, then `scheduleWeeklyReminder()`. On disable: `cancelReminders()`
- The notification body: "You have {N} saved places ready to plan. Open TravelPanel →"
- Count N by reading unsorted inbox items count from db at schedule time
- Gracefully no-op in browser (check `Capacitor.isNativePlatform()` before calling)
- Add `NSUserNotificationsUsageDescription` to `Info.plist`

---

## Completed Tasks

### Phase A — Bug-Free MVP
- [x] A1 — Substance Extraction (2-layer clip schema)
- [x] A2 — Enrichment Retry Queue
- [x] A3 — Error Tracking (PostHog)
- [x] A4 — AI Cost Guard
- [x] A5 — In-App Resource Request Notifications
- [x] A6 — Pin Clustering at Low Zoom
- [x] A7 — Full-Text Search on Clips
- [x] A8 — Onboarding Seed Boards
- [x] A9 — Plan Export (PDF + Calendar)
- [x] A10 — Multi-Version Plan Support
- [x] A11 — Surface Substance in Clip Detail (Wisdom view)
- [x] A12 — Thread Substance into Trip Plans (sourced itineraries)

### Phase B — Cloud Sync + Auth
- [~] B1 — Supabase Setup (scaffolded, dormant until keys)
- [x] B2 — Browser Extension (Chrome/Safari, one-click clipping)
- [x] B3 — Xiaohongshu Fix (Claude Vision for image-based shares)
- [x] B4 — Embedding/Vibe Search (Claude query expansion + ranked results)
- [x] B5 — Cloud Backup Export (JSON download from settings page)

### Phase C — On-Trip Mode
- [x] C1 — On-Trip GPS Mode (live location dot + proximity-aware stop navigator)
- [x] C2 — Post-Trip Timeline (mark visited stops + chronological journal)
- [x] C3 — Shared Boards v1 (URL-encoded sharing, no server needed)
- [x] C4 — Proactive Resurfacing (Rediscover carousel: nearby + seasonal + forgotten)
