# TravelPanel — Task Queue (Phase D+)

> All Phase A–C tasks are complete. This file covers the work remaining to ship a
> **beautiful, fully functional iOS app** that is App Store–ready and delights users.
>
> **Priority logic**: Ship quality first (D = design polish), then native iOS power (E),
> then discovery features (F), then plan experience depth (G).
> Work top-to-bottom within each phase.

---

## ⭐ Recommended Execution Order

`D1 → D2 → D3 → D4 → E1 → E2 → G1 → G2 → F1 → D5`

- D1 + D2 unlock every other visual improvement (foundation first)
- E1 (push notifications) is the only proactive resurfacing vector when the app is closed
- G1 + G2 turn the plan view into an iOS-native experience
- F1 adds discovery value (useful even without any saved clips)
- D5 is last: App Store submission assets

---

## PHASE D — Design Polish & iOS Beauty

### D1 — Design System: Typography, Colors, Spacing
**Status**: `[ ]` Not started
**Why**: The app uses ad-hoc Tailwind classes and inline styles inconsistently across pages. A unified design token system makes all future UI work faster and more consistent.
**Files to create/change**: `lib/design-tokens.ts`, `tailwind.config.js`, all major component files
**What to do**:
- Define a type scale in Tailwind: `text-display` (32px/bold), `text-heading` (20px/semibold), `text-title` (16px/semibold), `text-body` (14px/regular), `text-caption` (12px/regular)
- Define semantic color tokens: `brand-primary` (#6366f1), `brand-secondary` (#3b82f6), `surface` (white), `surface-2` (#f8fafc), `border` (#e2e8f0), `text-primary` (#1e293b), `text-secondary` (#64748b), `text-tertiary` (#94a3b8)
- Replace inline style font sizes and colors in `MapView.tsx`, `InboxCard.tsx`, `LocationDetailCard.tsx` with Tailwind classes
- Ensure consistent border-radius: cards = `rounded-2xl`, chips = `rounded-full`, inputs = `rounded-xl`, FABs = `rounded-full`
- Ensure consistent shadow scale: `shadow-sm` for cards, `shadow-lg` for modals/sheets, `shadow-2xl` for FABs

### D2 — iOS Native Feel: Safe Areas, Swipe, Haptics
**Status**: `[ ]` Not started
**Why**: The app feels like a PWA, not a native app. iOS users expect: content avoids the notch/home indicator, swipe-back works, taps feel physical.
**Files to change**: `app/layout.tsx`, all page-level components, `components/CapacitorBridge.tsx`
**What to do**:
- Add `env(safe-area-inset-top)` padding to all page headers (replace hardcoded `pt-12` with `pt-safe` using the `tailwindcss-safe-area` plugin or inline CSS variable)
- Add `env(safe-area-inset-bottom)` to NavBar so it clears the home indicator
- Add Capacitor Haptics to: clip save success, plan generation start, board create, delete confirm
  - Install `@capacitor/haptics` (already in package.json? check first)
  - `HapticsImpactStyle.Medium` on primary actions, `HapticsImpactStyle.Light` on secondary
- In `CapacitorBridge.tsx`, import and configure Haptics plugin on native platform
- Test that swipe-to-go-back works from all pushed routes (Next.js router does not need a change; Capacitor handles this at the WKWebView level)

### D3 — Loading Skeletons & Polished Empty States
**Status**: `[ ]` Not started
**Why**: The app shows spinners during loads. Skeletons feel faster and more premium. Empty states with clear calls-to-action convert better.
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/boards/[id]/page.tsx`
**What to do**:
- Create `components/Skeleton.tsx`: a reusable shimmer skeleton block (animated via Tailwind `animate-pulse`, or a proper shimmer with CSS `@keyframes`)
- Replace spinner in inbox loading state with `InboxCardSkeleton` components (3-4 stacked skeleton cards matching the card shape)
- Replace board list spinner with `BoardCardSkeleton` components
- Polish empty states:
  - Inbox empty (no clips saved): large illustration emoji (✈️) + headline "Start your travel wishlist" + sub "Tap + to clip your first post" + optional demo board CTA
  - Board empty (no clips in this board): map emoji + "No places yet" + "Clip something to add it here"
  - Map empty (no locations): globe emoji + "Your clips will appear here once enriched"
- All empty states must have the emoji centered with a soft gradient background circle behind it (visual weight)

### D4 — Dark Mode Support
**Status**: `[ ]` Not started
**Why**: Dark mode is standard iOS expectation. Without it the app looks unfinished to iOS power users.
**Files to change**: `tailwind.config.js`, `app/globals.css`, all component files
**What to do**:
- Enable `darkMode: 'class'` in `tailwind.config.js` (or `'media'` if we want to follow system)
- Add dark variants for all main UI surfaces: `dark:bg-gray-900` (page bg), `dark:bg-gray-800` (card), `dark:text-white` (headings), `dark:text-gray-300` (body), `dark:border-gray-700` (borders)
- In `CapacitorBridge.tsx`, read `window.matchMedia('(prefers-color-scheme: dark)')` and toggle the class on `<html>` OR use `StatusBar.setStyle({ style: Style.Dark })` for iOS
- Test map in dark mode (MapLibre uses a light base tile — optionally switch to a dark map style when dark mode is active: `https://tiles.openfreemap.org/styles/dark`)
- NavBar, LocationDetailCard, ImportSheet, SearchBar, ProactiveBanner all need dark variants

### D5 — App Store Submission Assets
**Status**: `[ ]` Not started
**Why**: Required to ship. Without these, the app can't be submitted to the App Store.
**Files to create**: `public/privacy.md` (or `/app/privacy/page.tsx`), App Store screenshots (need real device), `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
**What to do**:
- Create `app/privacy/page.tsx`: a simple Privacy Policy page (required by App Store). Cover: what data is stored (local IndexedDB only), no data shared with third parties, Anthropic API for content extraction, PostHog for analytics (optional), no account required
- Create `app/terms/page.tsx`: minimal Terms of Service page
- App icon: The existing `browser-extension/icons/icon128.png` (map pin on indigo gradient) should be adapted to all iOS required sizes. Use `generate-icons.py` as a base. Required sizes in `AppIcon.appiconset`: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024px
- Update `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json` with the generated icons
- App Store screenshots: 6.5" (iPhone 14 Pro Max) and 5.5" (iPhone 8 Plus) — at minimum create design mockups; actual screenshots taken on simulator
- Write App Store description (save to `ios/App/APP_STORE_DESCRIPTION.md`): focus on "AI travel inspiration clipper", key features, "works with any social app"

---

## PHASE E — Native iOS Power Features

### E1 — Push Notifications (Proactive Resurfacing)
**Status**: `[ ]` Not started
**Why**: The C4 proactive banner only fires when the user opens the app. Push notifications are the only way to resurface clips when the user hasn't opened the app in days.
**Files to change**: `components/CapacitorBridge.tsx`, new `lib/pushNotifications.ts`, `ios/App/` (Xcode capabilities)
**What to do**:
- Install `@capacitor/push-notifications` and configure in Xcode (Capabilities → Push Notifications)
- Create `lib/pushNotifications.ts`: `requestPermission()`, `scheduleDailyDigest(insights: ProactiveInsight[])`, `scheduleNearbyAlert(spotName: string, distanceM: number)`
- In `CapacitorBridge.tsx`, on native platform: request notification permission after first clip is saved (not on first launch — too intrusive)
- Schedule a daily digest notification: compute insights (same logic as ProactiveBanner), schedule for 9am local time via `PushNotifications.schedule()`
- Deep link from notification tap into the relevant view (inbox, specific board, or plan page)
- Do NOT request permission unless the user has saved at least 3 clips (avoids the "why does this app want notifications?" friction)

### E2 — Haptic Feedback Throughout App
**Status**: `[ ]` Not started
**Why**: Haptics make every tap feel intentional and native. Currently the app is silent on touch.
**Files to change**: `components/InboxCard.tsx`, `app/share/page.tsx`, `app/boards/[id]/page.tsx`, `components/LocationDetailCard.tsx`
**What to do**:
- Create `lib/haptics.ts`: thin wrapper around `@capacitor/haptics` that no-ops on web
  ```typescript
  export async function hapticLight() { ... }
  export async function hapticMedium() { ... }
  export async function hapticHeavy() { ... }
  export async function hapticSuccess() { ... }
  ```
- `hapticMedium()` on: clip saved to board, board created, plan generated start
- `hapticSuccess()` on: enrichment complete (the moment locations appear), plan generation done
- `hapticLight()` on: board card tap, pin tap on map, tab bar tap
- `hapticHeavy()` on: delete confirm (before the action, as a warning)

---

## PHASE F — Discovery Features

### F1 — "Nearby Now" Discovery Feed
**Status**: `[ ]` Not started
**Why**: When a user is traveling and hasn't saved nearby spots, they have nothing to look at. A lightweight "what's interesting nearby" from OpenStreetMap adds value without requiring social content.
**Files to create**: `app/discover/page.tsx`, `lib/nearbyPOI.ts`
**What to do**:
- Add "Discover" tab to NavBar (4th or 5th item, with a compass icon)
- Create `lib/nearbyPOI.ts`: uses Overpass API (`https://overpass-api.de/api/interpreter`) to fetch POIs within 1km radius
  - Query: tourism=attraction, tourism=museum, tourism=viewpoint, amenity=restaurant (cuisine:*), natural=peak
  - Return: `{ name, lat, lng, type, tags }`
  - Cache result in sessionStorage with a 30-minute TTL
- `app/discover/page.tsx`: shows a GPS-gated list of nearby POIs
  - "Get my location" prompt if GPS not granted
  - Once GPS active: categorized list (🏛 Sights, 🍜 Food, 🌿 Nature, 🛍 Shopping)
  - Each POI card: name, distance, type badge, "+ Save" button that opens the share flow with the Google Maps URL
  - Empty state if no POIs within 1km: "Explore beyond 1km" button (widens search)

### F2 — Rich Link Previews for Shared Boards
**Status**: `[ ]` Not started
**Why**: When a board's share URL is pasted in Messages, WhatsApp, or Twitter, it should show a beautiful og:image preview, not a blank card.
**Files to create**: `app/boards/join/opengraph-image.tsx`, update `app/boards/join/page.tsx`
**What to do**:
- Create `app/boards/join/opengraph-image.tsx` using Next.js `ImageResponse` from `next/og`
- The OG image shows: board emoji (large), board name, item count, "TravelPanel" watermark, indigo gradient background
- This image is dynamic based on the `?data=` URL param (decode the board package and extract metadata)
- Add `<meta og:image>` and `<meta og:title>` to the join page's `generateMetadata()` export
- Test with: paste the share URL into Slack or iMessage and verify preview appears

---

## PHASE G — Plan Experience Depth

### G1 — Swipeable Day Cards in Plan View
**Status**: `[ ]` Not started
**Why**: The current plan view is a scrollable list of DayStripCards. On mobile, swiping between days is the natural gesture. This is the biggest UX gap in the plan experience.
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx`
**What to do**:
- Wrap DayStripCards in a horizontal swipeable container (use `framer-motion` `drag` or `react-swipeable`)
- Show one day at a time on mobile, with a day selector at the top (tab strip: Day 1 · Day 2 · Day 3)
- Active day card slides into view with a spring animation
- On desktop, show all days in a vertical scroll (existing behavior)
- Show a persistent "Map" tab at the bottom of the plan view that shows all stops for the current day on a RouteMapView
- Day progress indicator: a step-progress bar at the top showing which day out of N you're viewing

### G2 — Route Map in Plan View
**Status**: `[ ]` Not started
**Why**: The plan shows text activities but no visual route. Users need to see if the day's plan makes geographic sense.
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/RouteMapView.tsx`
**What to do**:
- Below each day's activity list, render a `RouteMapView` showing all that day's location coordinates connected by a polyline
- Sequence the activities in the order they appear in the plan (the AI already orders them logically)
- Each stop on the route is numbered (matching the activity list number)
- Tap a route stop to scroll to that activity in the list
- The route line is the indigo brand color with arrow heads indicating direction
- If `RouteMapView` already exists, check if it needs the polyline layer added (it probably only shows pins currently)

### G3 — "Quick Day Plan" from Current Location
**Status**: `[ ]` Not started
**Why**: When a user is already on-trip and wants "what should I do today near here?", navigating to a board and generating a full plan is too heavy. A one-tap quick plan is the right mobile-first flow.
**Files to create**: new button in `app/page.tsx`, new `/plan/quick` page
**What to do**:
- When GPS is active on the map view, show a "Plan my day ✨" button above the NearbyStrip
- Tapping it opens `/plan/quick?lat=...&lng=...`
- The quick plan page sends a one-off request to `/api/plan` with a synthetic board of all clips within 5km of the user's current location
- Show a streaming plan output (same component as full plan view)
- Allow saving the quick plan to any board
- This is the "what should I do today?" entry point for on-trip use

---

## Completed Tasks

*(All Phase A–C tasks are complete as of 2026-06-06)*

**Phase A**: A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 ✅
**Phase B**: B1 (scaffolded/dormant) B2 B3 B4 (blocked: needs Supabase pgvector) B5 ✅
**Phase C**: C1 C2 C3 C4 ✅
