# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Project Status (as of 2026-06-01)

### ✅ Completed Phases

**Phase A — Bug-Free MVP**: All done (A1–A12)
- Substance extraction (2-layer clips), enrichment retry queue, PostHog analytics,
  AI cost guard, resource banners, pin clustering, full-text search, onboarding seed
  boards, plan export (PDF + ICS), multi-version plans, substance wisdom view,
  substance-sourced itineraries.

**Phase B — Cloud & Extensions**: All done (B1–B5)
- Supabase scaffold (dormant until keys), browser extension (Chrome/Safari MV3),
  Xiaohongshu Claude Vision fix (image + shared text via URL scheme), vibe search
  (Claude query expansion + BM25 scoring), data export/import + settings panel.

**Phase C — On-Trip & Social**: All done (C1–C4)
- On-Trip GPS mode (live navigation overlay, arrived banner, haversine distance),
  post-trip timeline (journal view per board with personal notes), shared boards
  (URL-encoded, no backend), proactive resurfacing (seasonal + forgotten clips widget).

### 🎯 North Star Metric
Weekly clips per active user. Proxy for habit formation.

### 🏗 Architecture Summary
- **Frontend**: Next.js 14 App Router + Tailwind + shadcn/ui
- **Native**: Capacitor (iOS wrapper) + Share Extension
- **DB**: IndexedDB (idb) — local-first; Supabase cloud sync scaffolded
- **AI**: Anthropic Claude (Haiku for enrichment, Opus for plans)
- **Maps**: MapLibre + OpenFreeMap (free, no API key)

---

## ⭐ Recommended Execution Order

`D1 → D2 → D3 → D4 → D5 → D6 → D7 → E1 → E2 → E3 → E4 → E5 → F1 → F2 → F3`

---

## PHASE D — iOS Beauty Sprint

### D1 — Skeleton Loading States
**Status**: `[x]` Done
**Why**: Spinners feel like loading; skeletons feel like the content is almost here. Critical for perceived performance on slow connections.
**Files**: `components/SkeletonCard.tsx` (new), `app/inbox/page.tsx`, `app/boards/page.tsx`, `components/InboxCard.tsx`
**What to do**:
- Create a `SkeletonCard` component that mimics `InboxCard` layout with animated shimmer (CSS `animate-pulse` blocks)
- Replace the spinner in the inbox and boards pages with a grid of 4–6 `SkeletonCard` components while `loading === true`
- Add a `SkeletonCard` variant for the boards list view too
- The shimmer should use a left-to-right gradient animation for a premium feel

### D2 — Micro-animations and Haptic Feedback
**Status**: `[x]` Done
**Why**: Animations make the app feel alive. Haptics make it feel native on iPhone.
**Files**: `components/InboxCard.tsx`, `components/NavBar.tsx`, `app/share/page.tsx`, `lib/haptics.ts` (new)
**What to do**:
- Create `lib/haptics.ts` with `haptic(type: 'light'|'medium'|'heavy'|'success'|'error')` that calls `@capacitor/haptics` when available, no-ops on web
- Install `@capacitor/haptics` (it's in the Capacitor ecosystem, peer-dep of `@capacitor/core`)
- Add `haptic('success')` when a clip is saved in `/share/page.tsx`
- Add `haptic('light')` on NavBar tab changes
- Add `haptic('medium')` when a plan is generated
- Add `whileTap={{ scale: 0.96 }}` to all primary action buttons that don't already have it
- Add `spring` entrance animations to the detail cards (LocationDetailCard, OnTripOverlay)

### D3 — Dark Mode Support
**Status**: `[x]` Done
**Why**: iOS users expect dark mode. Without it the app looks unfinished on OLED iPhones.
**Files**: `app/globals.css`, `tailwind.config.js`, all component files (audit pass)
**What to do**:
- Enable `darkMode: 'class'` in `tailwind.config.js`
- Add a `ThemeProvider` that reads `prefers-color-scheme` and applies `dark` class to `<html>`
- Add dark mode variants (`dark:bg-gray-900 dark:text-white` etc.) to the main layout and key components:
  - `NavBar`, `InboxCard`, `LocationDetailCard`, `SettingsPanel`, `OnTripOverlay`
  - `app/page.tsx` top bar, `app/inbox/page.tsx` header
- Map tiles: OpenFreeMap doesn't have a dark style — when dark mode is active, add a CSS `invert(90%) hue-rotate(180deg)` filter to the MapLibre canvas as a simple fallback
- Store the user's preference in `localStorage` with a manual override toggle in the Settings panel

### D4 — App Icon and Splash Screen Design
**Status**: `[x]` Done
**Why**: The app currently has placeholder indigo squares. A real icon is required for App Store submission and makes the app feel premium on the home screen.
**Files**: `browser-extension/generate-icons.js`, `public/manifest.json`, `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
**What to do**:
- Create a polished SVG app icon: a stylized globe or map pin with a gradient (indigo → violet) on a white background, with subtle shadow
- Generate PNG icons in all required sizes using the Python PNG generator technique (or SVG + CSS rendering)
- Required iOS sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024 (2x variants for most)
- Update `public/manifest.json` to reference the new icons
- Update `browser-extension/icons/` with the new design
- Create a matching splash screen: gradient background (indigo-600 → violet-700) with the globe icon centered + "TravelPanel" wordmark below
- Add splash screen colors to `capacitor.config.ts`

### D5 — Onboarding Flow
**Status**: `[x]` Done
**Why**: New users who see an empty map have no idea what to do. The onboarding seed boards (A8) help but a proper walkthrough converts much better.
**Files**: `components/OnboardingFlow.tsx` (new), `app/layout.tsx` or `app/page.tsx`
**What to do**:
- Create a 4-step onboarding modal/sheet:
  1. **Welcome** — "TravelPanel turns social posts into real trips." With the globe icon and a brief tagline
  2. **How to Clip** — Show the iOS Share Sheet icon + "Share any Instagram, YouTube or Xiaohongshu post to save it here"
  3. **Substance** — "We extract not just pins, but the actual wisdom: tips, warnings, opinions from each post"  
  4. **Plan** — "Organize into boards → generate an AI itinerary → navigate live"
- Each step has a large illustration (SVG inline), headline, and 1-sentence description
- "Next" / "Get Started" buttons; skip link at the top right
- Only show if `localStorage.getItem('onboardingComplete')` is falsy
- After dismissal, seed the demo boards (A8) if the user clicks "Get Started", or go straight to the empty app if they skip

### D6 — Better Empty States with Illustrations
**Status**: `[x]` Done
**Why**: Plain text empty states look unpolished. SVG illustrations add personality and guide users.
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create inline SVG illustrations (simple, line-art style, 120×100px) for:
  - **Inbox empty**: a speech bubble with a camera icon, caption "Share posts from social apps to start clipping"
  - **Boards empty**: a stacked cards icon, "Create your first board — a collection for a destination"
  - **Plan empty (no locations)**: a route icon with dotted path, "Add clips with identified locations to plan a trip"
- Each empty state has: illustration + bold headline + 1-sentence description + primary CTA button
- Animations: fade-in the illustration, then slide-up the text (50ms stagger)

### D7 — Safe Area and Dynamic Island Handling
**Status**: `[x]` Done
**Why**: iPhone 14/15 Pro models have the Dynamic Island at the top. Without proper safe-area insets the top bar is obscured.
**Files**: `app/globals.css`, `app/layout.tsx`, all page headers
**What to do**:
- Ensure `env(safe-area-inset-top)` is applied to all sticky/fixed headers:
  - The map top bar in `app/page.tsx` should use `pt-[calc(16px+env(safe-area-inset-top))]`
  - `NavBar` bottom should use `pb-[calc(8px+env(safe-area-inset-bottom))]`
  - The inbox header should add safe-area top padding
- Add `viewport-fit=cover` to the `<meta name="viewport">` tag in `app/layout.tsx` 
- Test on iPhone 15 Pro simulator (Dynamic Island) and older iPhone SE (no notch) — both should look correct
- The on-trip overlay (`OnTripOverlay`) should respect `safe-area-inset-bottom` on iPhone with home bar

---

## PHASE E — Production Readiness

### E1 — Supabase Sign-in UI
**Status**: `[ ]` Not started
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Files**: `components/AuthSheet.tsx` (new), `components/SettingsPanel.tsx`
**What to do**:
- Add a "Sign in to sync" section to `SettingsPanel` (visible only when `cloudEnabled === false` or user not signed in)
- Create `AuthSheet.tsx`: a bottom sheet with:
  - Email magic link input + "Send link" button
  - Google OAuth "Continue with Google" button (when configured)
  - "Sign out" button when user is signed in
- When `cloudEnabled === true` and user signs in, call `syncNow()` from `lib/cloudSync.ts`
- Show sync status badge in the Settings panel ("Last synced: 2m ago" or "Sync pending")

### E2 — Privacy Policy and Terms Pages
**Status**: `[x]` Done
**Files**: `app/privacy/page.tsx` (new), `app/terms/page.tsx` (new), `components/SettingsPanel.tsx`
**What to do**:
- Create simple, honest privacy policy: data stays local (IndexedDB), URLs sent to Anthropic for extraction (no PII), PostHog analytics (if key present), what data is stored, how to delete it
- Create terms of service: usage limits, no liability for travel plans, AI-generated content disclaimer
- Add links to both pages in the Settings panel footer
- Pages should be static, styled simply (white background, max-w-prose, proper typography)

### E3 — App Store Metadata and Screenshots
**Status**: `[ ]` Not started
**Files**: `docs/app-store/` (new directory)
**What to do**:
- Write App Store description (up to 4000 chars): lead with the moat (substance extraction), bullet key features, end with the "your clips become real trips" promise
- Write subtitle (30 chars): "AI Travel Inspiration Clipper"
- Write keywords (100 chars): travel, trip planner, travel inspiration, places, itinerary, map, travel journal
- Create screenshot captions for 6.7" iPhone (required 6 screenshots):
  1. Map view with pins — "All your travel inspiration on a map"
  2. Clip the Share Sheet — "Save from any app in one tap"
  3. Substance wisdom view — "Not just pins. The actual tips from each post"
  4. AI trip planner — "Turn your clips into a day-by-day itinerary"
  5. On-Trip GPS mode — "Live navigation while you're actually there"
  6. Trip Timeline — "Your personal travel journal, automatically built"
- Save all copy to `docs/app-store/metadata.md`

### E4 — In-App Review Prompt
**Status**: `[x]` Done
**Files**: `lib/reviewPrompt.ts` (new), `app/share/page.tsx`
**What to do**:
- Create `lib/reviewPrompt.ts` that wraps `@capacitor-community/rate-app` or `SKStoreReviewRequest`
- Trigger the review prompt after the user has: (a) saved 5+ clips AND (b) generated at least 1 plan AND (c) not been prompted in the last 30 days
- Track prompt eligibility in `localStorage`: `reviewPromptedAt` timestamp
- On the web (non-Capacitor), do nothing (no-op)
- Show after the "Saved to ✅" confirmation in the share page — happy moment

### E5 — Offline Mode Indicator
**Status**: `[x]` Done
**Files**: `components/OfflineBanner.tsx` (new), `app/layout.tsx`
**What to do**:
- Create a `OfflineBanner` that subscribes to `navigator.onLine` and the `online`/`offline` events
- When offline: show a subtle banner at the top ("Offline — clips saved locally, will sync when reconnected")
- When back online: show a brief "Back online ✓" toast that auto-dismisses in 3s
- The banner should not cover the Dynamic Island area — respect safe-area-inset-top
- Add to `app/layout.tsx` inside the `<body>`

---

## PHASE F — Advanced iOS Features

### F1 — QR Code for Board Sharing
**Status**: `[ ]` Not started
**Files**: `components/ShareBoardButton.tsx`, new `components/QRModal.tsx`
**What to do**:
- Install `qrcode` npm package (pure JS, no canvas needed — outputs SVG string)
- Add a "Show QR" option to `ShareBoardButton` that opens a modal
- `QRModal` displays a large QR code encoding the `/boards/join?data=...` URL
- Caption: "Scan to add this board to TravelPanel"
- The QR modal has a "Download QR" button that saves the SVG as PNG

### F2 — Duplicate Clip Detection
**Status**: `[ ]` Not started
**Files**: `app/share/page.tsx`, `lib/db.ts`
**What to do**:
- Before saving a new clip in `/share`, check if an item with the same URL already exists (query IndexedDB by URL)
- If duplicate found, show a warning: "You already saved this! It's in [Board Name]. Save again anyway?"
- Add a secondary button "View existing clip" that navigates to the existing item
- This prevents the common frustration of saving the same post twice

### F3 — Pull-to-Refresh on Inbox and Boards
**Status**: `[ ]` Not started
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`
**What to do**:
- Add pull-to-refresh gesture on iOS (using `@capacitor/haptics` + a custom drag handler)
- When the user pulls down past a threshold, trigger enrichment retry for any pending/failed items
- Show a subtle "Refreshing…" indicator with a spinner during the refresh
- On web (non-Capacitor): add a visible "Refresh" button in the header instead of a gesture

### F4 — Siri Shortcuts Integration
**Status**: `[ ]` Not started  
**Files**: `ios/App/App/AppDelegate.swift`, new Shortcut definition
**What to do**:
- Add a "Save to TravelPanel" Siri Shortcut that opens the share flow with a URL
- Register the shortcut using `NSUserActivity` with `activityType = "com.travelpanel.app.save"`
- This lets users say "Hey Siri, save this to TravelPanel" while browsing Safari
- Add the shortcut donation in `AppDelegate.swift` on `application(_:continue:restorationHandler:)`

---

## Completed Tasks

*(Phases A, B, and C are fully complete — see git history for details)*
