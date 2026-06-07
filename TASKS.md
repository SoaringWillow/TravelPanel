# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.
> **Ultimate goal**: A beautiful, fully functional iOS travel app that people love to use daily.

---

## Status: Phases A–C complete (2026-06-07)

All MVP features are shipped. The next phases focus on **iOS polish, visual quality, and production readiness** — turning a functional prototype into an app users would pay for.

`D1 → D2 → D3 → D4 → D5 → E1 → E2 → E3 → E4 → E5 → F1 → F2`

---

## PHASE D — iOS Polish & Native Feel

### D1 — PWA Manifest + iOS Meta Tags
**Status**: `[x]` Done
**Why**: Without proper PWA config, the iOS "Add to Home Screen" flow uses a tiny default icon and shows the browser bar. This is the difference between looking like a real app and looking like a website.
**Files to change**: `app/layout.tsx`, new `public/manifest.json`, new `public/browserconfig.xml`
**What to do**:
- Create `public/manifest.json` with name, short_name, start_url, display: standalone, orientation: portrait, theme_color: #6366F1, background_color: #ffffff, icons array (192x192 + 512x512 — generate as indigo ✈ SVG → PNG via canvas in a small script)
- Add `<link rel="manifest">` + all iOS-specific meta tags to `app/layout.tsx`:
  - `apple-mobile-web-app-capable: yes`
  - `apple-mobile-web-app-status-bar-style: default`
  - `apple-mobile-web-app-title: TravelPanel`
  - `apple-touch-icon` link (180x180)
  - `theme-color: #6366F1`
  - `viewport` with `viewport-fit=cover` for safe-area-inset support
- Add CSS vars: `--sat: env(safe-area-inset-top)` etc. in globals.css so bottom nav and top bars respect the notch/home bar on iPhone

### D2 — Loading Skeletons (replace spinners)
**Status**: `[x]` Done
**Why**: Spinners feel like waiting. Skeletons feel like loading. Every list view currently shows a spinner — replacing them with content-shaped shimmer placeholders makes the app feel instant and polished.
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/boards/[id]/page.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `components/Skeleton.tsx` with: `SkeletonBox` (div with animate-pulse bg-gray-200 rounded), `SkeletonCard` (2-column card shimmer matching InboxCard shape), `SkeletonList` (renders N cards)
- Replace all "animate-spin" loading states in list views with `<SkeletonList count={6} />` (or appropriate count)
- InboxCard enrichment-pending state: replace the pulsing "Extracting..." text with a subtle skeleton overlay on the description area
- Keep spinner only for one-shot actions (save button, export button) — NOT for page-level loads

### D3 — Error Boundaries
**Status**: `[x]` Done
**Why**: Unhandled JS errors currently crash the entire app with a blank white screen. This is especially bad on iOS where users can't open dev tools.
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `components/ErrorBoundary.tsx` as a class component that catches errors:
  - Shows a friendly "Something went wrong" screen with the TravelPanel logo, an error message, and a "Reload app" button
  - In dev mode, also shows the error + stack trace in a collapsible
- Wrap `<body>` content in `app/layout.tsx` with `<ErrorBoundary>`
- Also wrap the plan streaming view specifically (most likely to error during AI streaming)

### D4 — Bottom Nav Safe Area + Notch Handling
**Status**: `[x]` Done
**Why**: The bottom NavBar overlaps the iOS home indicator on iPhone X+ (the bar at the bottom). The top header overlaps the status bar. This looks broken on real devices.
**Files to change**: `components/NavBar.tsx`, `app/globals.css`, all page headers
**What to do**:
- In `globals.css` add: `.safe-top { padding-top: env(safe-area-inset-top, 0px); }` and `.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }` utilities (and `safe-left`, `safe-right`)
- NavBar: add `pb-[env(safe-area-inset-bottom,0px)]` to the nav wrapper so it pads above the home bar
- All `pt-12` headers (settings, inbox, boards, etc.): replace with `pt-[calc(3rem+env(safe-area-inset-top,0px))]` so they clear the status bar
- The share page and plan page have `safe-top` / `safe-bottom` classes — verify these actually work (they depend on D1's viewport-fit=cover)
- MapView: ensure the NavigationControl doesn't overlap the top bar by adding top offset equal to the top bar height

### D5 — Board Management (rename, delete, cover image)
**Status**: `[x]` Done
**Why**: Users can create boards but can't rename or delete them. This is a critical gap — after a few sessions the board list becomes messy.
**Files to change**: `app/boards/page.tsx`, `app/boards/[id]/page.tsx`, `lib/db.ts`
**What to do**:
- Add long-press handler to board cards in `/boards` (use `onPointerDown` + `setTimeout` 500ms): opens a bottom sheet with options: Rename, Delete, Change emoji
- Rename: inline text input, saves on Enter/blur
- Delete: confirmation prompt ("Delete {name}? This removes the board but keeps your clips in Inbox."), calls `deleteBoard(id)` from db.ts
- Change emoji: show a grid of 20 travel emojis (🏝🏔🌅🍜🏯🗼🌊🏕🌋🎭🏖🗺🚂✈🛶🍣🎪🌿🌃🏛) as quick-pick chips
- Cover image: auto-set to the first clip's thumbnail when board is created (already done in `addItemToBoard`) — add a "Change cover" option that picks from the board's clip thumbnails

---

## PHASE E — Visual Excellence

### E1 — Onboarding Walkthrough
**Status**: `[x]` Done
**Why**: New users open the app to an empty map with no clue what to do. The existing seed boards help but there's no explanation of the core flow.
**Files**: new `components/OnboardingSheet.tsx`, `app/page.tsx`
**What to do**:
- Create an animated 3-step onboarding sheet that shows the first time a user opens the app (detect via `hasSeenOnboarding` localStorage flag):
  - Step 1: "✈ TravelPanel" — "Save travel inspiration from any app" — shows a mock share sheet animation
  - Step 2: "📍 Spots + 💡 Wisdom" — "AI extracts locations AND tips from every post" — shows a mock clip card with substance items
  - Step 3: "🗺 Plan your trip" — "Generate a day-by-day itinerary from your saves" — shows a mock plan card
- "Get started" button sets the flag and dismisses
- Small "Skip" link at top right
- The 3 seed boards are already loaded at this point — the map isn't empty

### E2 — Location Detail Card Polish
**Status**: `[x]` Done
**Why**: The `LocationDetailCard` is the main reading surface but feels minimal. The substance items are the moat — make them feel premium.
**Files to change**: `components/LocationDetailCard.tsx`, `components/SubstanceList.tsx`
**What to do**:
- Add an "Open source" button (links to `item.url` via `window.open`) — currently missing
- Add an "Directions" button for each location: deep-links to `maps.apple.com/?daddr=LAT,LNG` (iOS) or `https://maps.google.com/maps?daddr=LAT,LNG` (fallback)
- Substance section: add animated expand/collapse — show 3 items by default, "+ N more" button to expand
- Each substance item: add a subtle left border color by type (tip=indigo, warning=red, wisdom=purple, recommendation=green, opinion=gray, context=amber)
- Add a "Share" button at the bottom using Web Share API to share the item title + URL

### E3 — Plan View UX Overhaul
**Status**: `[x]` Done
**Why**: The plan view is functional but reads like a wall of text. Day-by-day trip plans should feel exciting, not like a document.
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx` (if it exists)
**What to do**:
- Day accordion: each day is collapsed by default, tap to expand activities (use AnimatePresence for expand/collapse)
- Day header: show day number, date offset, emoji for the primary tag of that day, and a 1-line summary
- Activity cards: full-width card with a subtle gradient background based on activity tags
- Sourced tips (from substance layer): render in a distinctly styled callout with a "💡 from your clip: [title]" attribution
- Streaming state: show a pulsing skeleton card per day as they stream in (not a generic spinner)
- Add a "Regenerate" button that creates a new plan version (uses the multi-version support from A10)
- Sticky day navigation: a compact horizontal "Day 1 · Day 2 · Day 3" scroll strip at the top that jumps to the selected day

### E4 — Dark Mode
**Status**: `[x]` Done
**Why**: Travel apps are used at night (planning a trip before bed). Dark mode is a first-class iOS feature and users expect it.
**Files**: `app/globals.css`, `tailwind.config.js`, all major components
**What to do**:
- Enable `darkMode: 'media'` in `tailwind.config.js` (uses OS preference automatically)
- Add `dark:` variants to all background/text/border colors in major components:
  - NavBar, MapView overlay, InboxCard, LocationDetailCard, SettingsPage, BoardsPage
  - Focus on backgrounds: `dark:bg-gray-900`, `dark:bg-gray-800`
  - Text: `dark:text-gray-100`, `dark:text-gray-400`
  - Borders: `dark:border-gray-700`
- The map style already adapts (OpenFreeMap has a dark style: `https://tiles.openfreemap.org/styles/dark`)
  Switch map style based on `window.matchMedia('(prefers-color-scheme: dark)')`

### E5 — Haptic Feedback (iOS)
**Status**: `[x]` Done
**Needs**: `@capacitor/haptics` plugin (free, already in Capacitor ecosystem)
**Files**: `app/share/page.tsx`, `components/NavBar.tsx`, `app/page.tsx`, new `lib/haptics.ts`
**What to do**:
- Install `@capacitor/haptics` and add to `ios/App/App/AppDelegate.swift`
- Create `lib/haptics.ts` with `impact(style?)`, `success()`, `warning()`, `error()` wrappers that no-op on web
- Fire `impact()` on: nav tab switch, board chip selection in share flow, map pin tap
- Fire `success()` on: clip saved, plan generated, export done
- Fire `warning()` on: rate limit hit, enrichment failed
- This only fires on native iOS (Capacitor), never on web

---

## PHASE F — Production Readiness

### F1 — iOS App Icon + Launch Screen
**Status**: `[ ]` Not started
**Why**: The Xcode project uses a default Capacitor icon. App Store submission requires a full icon set (1024x1024 plus all size variants) and a proper launch screen.
**Files to change**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `ios/App/App/LaunchScreen.storyboard`
**What to do**:
- Create a Node.js script `scripts/generate-icons.js` that:
  - Uses `canvas` npm package to draw an indigo gradient background + white ✈ airplane icon
  - Exports to all required iOS sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024 (all @1x/@2x/@3x)
  - Writes to `ios/App/App/Assets.xcassets/AppIcon.appiconset/` with the correct `Contents.json`
- Update `LaunchScreen.storyboard` to show the same indigo gradient + white airplane (edit the XML directly — set backgroundColor to #6366F1, add a UIImageView for the icon)
- Add canvas to devDependencies, add `npm run generate-icons` script to package.json

### F2 — App Store Submission Checklist
**Status**: `[ ]` Not started
**Why**: First-time App Store submissions fail on easily-avoidable issues. A documented checklist prevents this.
**Files**: new `ios/App/APPSTORE_CHECKLIST.md`
**What to do**:
- Create a comprehensive checklist covering:
  - Required capabilities: NSLocationWhenInUseUsageDescription (for C1 GPS), NSPhotoLibraryUsageDescription (if photo access added)
  - Privacy manifest (`PrivacyInfo.xcprivacy`) — required for iOS 17+ apps using certain APIs
  - ATS (App Transport Security) config for Vercel/API domains
  - App Store Connect: Bundle ID, App Name, Category (Travel), Age rating
  - Screenshots: required sizes for iPhone 6.7", 6.5", 5.5" plus iPad Pro 12.9" (if universal)
  - Review notes: explain what the app does, mention iOS Share Extension, note the Anthropic API key is required
  - TestFlight: internal testing before external submission

### F3 — Performance Audit
**Status**: `[ ]` Not started
**Why**: The app imports heavy libraries (MapLibre, Framer Motion, jsPDF). Route-based code splitting should reduce the initial load time significantly.
**Files to change**: `next.config.js`, various page files
**What to do**:
- Run `next build` and inspect the bundle output — identify any pages over 300KB
- Ensure MapView, RouteMapView, and jsPDF are all loaded via `dynamic(() => import(...), { ssr: false })` — currently MapView is but verify the plan page
- Add `output: 'standalone'` to `next.config.js` for optimal Vercel deployment
- Review `app/layout.tsx` for any heavyweight imports at the root level (PostHog, Framer) — move to component-level lazy loading where possible
- Add `<link rel="preconnect" href="https://tiles.openfreemap.org">` to layout for faster map tile loading
- Target: initial JS payload under 200KB gzipped for the home route

---

## Completed Tasks

### Phase A — Bug-Free MVP ✓
A1 Substance extraction · A2 Enrichment retry · A3 PostHog analytics · A4 AI cost guard · A5 Resource notifications · A6 Pin clustering · A7 Full-text search · A8 Onboarding seed boards · A9 Plan export · A10 Multi-version plans · A11 Substance wisdom view · A12 Sourced trip plans

### Phase B — Cloud + Extensions (partial) ✓
B1 Supabase scaffold (dormant — awaiting keys) · B2 Browser extension · B3 Xiaohongshu + Claude Vision fix · B4 Embedding search (dormant — awaiting Supabase pgvector) · B5 Cloud backup export

### Phase C — On-Trip Mode ✓
C1 GPS mode + nearby alerts · C2 Post-trip timeline · C3 Shared boards · C4 Proactive resurfacing
