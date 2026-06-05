# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Current Status (2026-06-05)

All Phase A–E tasks are complete. The app has:
- 2-layer clip extraction (spots + substance) via Claude
- Enrichment retry queue
- PostHog analytics + AI cost guards
- Pin clustering, full-text search with advanced filters, onboarding boards
- Plan export (PDF + .ics), multi-version plans, trip collaboration notes
- Substance "Wisdom view" in clip detail + sourced citations in plans
- Browser extension (Chrome/Edge/Arc)
- Claude Vision for Xiaohongshu/WeChat screenshots
- Settings page with JSON backup export
- GPS "Near Me" mode with live distance labels
- Post-Trip Timeline / Journey view in Inbox
- Shareable board links (hash-encoded)
- Proactive Resurfacing — nearby clips banner
- Supabase scaffold (dormant, waiting for keys)
- Dark mode (system-respecting), skeleton loading, pull-to-refresh
- Swipe-to-delete, haptic feedback, offline detection banner
- Map style toggle (Streets / Light / Dark), first-launch welcome overlay
- Multi-select + batch operations, sort options, duplicate URL detection
- Quick clip from clipboard (web + native iOS), E6 accessibility pass
- Universal Links + Associated Domains setup

**Phase F** focuses on App Store readiness and production hardening.

---

## PHASE F — App Store Readiness & Production Hardening

---

## PHASE D — iOS Polish & Beauty

### D1 — Dark Mode
**Status**: `[x]` Done  
**Why**: Most iOS users use dark mode. The app is entirely white — it looks jarring at night.  
**Files to change**: `app/globals.css`, `tailwind.config.ts`, all page/component files  
**What to do**:
- Add CSS custom properties for colors (--bg, --surface, --text, etc.) in `app/globals.css`
- Configure Tailwind `darkMode: 'media'` to respect `prefers-color-scheme`
- Update all pages/components to use `dark:` variants: bg-white → bg-white dark:bg-gray-900, text-gray-900 → dark:text-gray-100, etc.
- Test all major views: Home/Map, Inbox, Boards, Settings, Share, Plan, Detail card

### D2 — Skeleton Loading States
**Status**: `[x]` Done  
**Why**: Cards flash blank white during enrichment load, which feels broken.  
**Files to change**: `components/InboxCard.tsx`, new `components/SkeletonCard.tsx`  
**What to do**:
- Create `SkeletonCard` with animated shimmer (CSS animation on gray placeholder blocks)
- Show skeleton when `enrichmentStatus === 'processing'` instead of a spinner
- Use same card dimensions as real InboxCard to prevent layout shift
- Skeleton should show: thumbnail placeholder, two text lines, tag pill placeholders

### D3 — Pull-to-Refresh on Inbox
**Status**: `[x]` Done  
**Why**: Standard iOS gesture. Users pull down to refresh — app should respond.  
**Files to change**: `app/inbox/page.tsx`, new `hooks/usePullToRefresh.ts`  
**What to do**:
- Create `usePullToRefresh(onRefresh, containerRef)` hook using touch events
- When user pulls down ≥64px past the top, show an animated refresh indicator and call `onRefresh`
- `onRefresh` in inbox: re-run the enrichment retry queue + reload items
- Use spring animation for the pull indicator (matches iOS feel)

### D4 — Swipe-to-Delete on Inbox Cards
**Status**: `[x]` Done  
**Why**: Standard iOS interaction. Users expect to swipe left to reveal a delete button.  
**Files to change**: `components/InboxCard.tsx`  
**What to do**:
- Add swipe-left gesture to InboxCard using touch events (or Framer Motion drag)
- After swiping ≥80px left, reveal a red "Delete" button
- Tapping Delete confirms and removes; swiping back cancels
- Works alongside existing long-press / kebab menu

### D5 — Haptic Feedback on iOS
**Status**: `[x]` Done  
**Why**: Haptic feedback makes the app feel native. Saves, deletes, and plan generation should vibrate.  
**Files to change**: `lib/haptics.ts` (new), `app/share/page.tsx`, `components/InboxCard.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Install `@capacitor/haptics` (already in dependencies from Capacitor setup)
- Create `lib/haptics.ts` with `lightImpact()`, `mediumImpact()`, `success()`, `error()` wrappers that no-op on web
- Fire `success()` on clip save, `lightImpact()` on board selection, `mediumImpact()` on plan generation start, `error()` on enrichment failure
- Use `navigator.vibrate` as fallback on web

### D6 — Offline Detection Banner
**Status**: `[x]` Done  
**Why**: When offline, enrichment silently fails. Users don't know why nothing works.  
**Files to change**: `app/layout.tsx`, new `components/OfflineBanner.tsx`  
**What to do**:
- Create `OfflineBanner` that listens to `window.addEventListener('online'/'offline')`
- Show a subtle banner at the top: "⚡ You're offline — clips will enrich when reconnected"
- Auto-dismiss with slide-up animation when back online
- On reconnection, trigger the enrichment retry queue

### D7 — Better First-Launch Empty State
**Status**: `[x]` Done  
**Why**: The map is empty on first launch before the user dismisses onboarding. The transition is jarring.  
**Files to change**: `app/page.tsx`, `lib/seedData.ts`  
**What to do**:
- On first launch (no items), show a welcome overlay on the map (not a modal)
- Overlay has: app name, 1-line value prop ("Clip travel inspiration, AI-plan your trip"), two buttons: "Try with sample boards" and "Start from scratch"
- "Try with sample boards" loads seed data and dismisses; "Start from scratch" skips seeds
- Store choice in localStorage `hasChosenOnboarding: true`
- After choice, the FAB pulses once to draw attention

### D8 — Map Style Toggle (Standard / Satellite)
**Status**: `[x]` Done  
**Why**: Satellite view is essential for trip planning — users want to see terrain and exact beach/restaurant positions.  
**Files to change**: `components/MapView.tsx`  
**What to do**:
- Add a style toggle button in the bottom-left of the map (📍/🛰 icon)
- Toggle between: `https://tiles.openfreemap.org/styles/liberty` (streets) and `https://tiles.openfreemap.org/styles/positron` (light) and `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` (dark/satellite-like)
- Store preference in localStorage
- Button cycles through 3 styles with a tooltip showing the current style name

### D9 — Clip Notes Editor
**Status**: `[x]` Done  
**Why**: Users want to add personal notes to clips ("tried this, overrated", "reservation needed"). Currently no way to edit after saving.  
**Files to change**: `components/LocationDetailCard.tsx`, `lib/db.ts`  
**What to do**:
- Add a "Notes" section at the bottom of the LocationDetailCard
- Tapping the section shows a textarea (inline, not a modal)
- Auto-saves after 800ms debounce via `updateItemNotes(id, notes)` in db.ts
- Show note content in the InboxCard's bottom section if notes are non-empty
- Placeholder: "Add a personal note…"

### D10 — Universal Links (Deep Linking)
**Status**: `[x]` Done  
**Why**: Sharing a board link should open the app directly on iOS if installed, not the browser.  
**Files to change**: `public/apple-app-site-association`, `ios/App/App/Info.plist`, `ios/App/App/AppDelegate.swift`  
**What to do**:
- Create `public/apple-app-site-association` file with paths for `/shared`, `/boards/*`, `/plan/*`
- Add Associated Domains capability in Xcode (domains: `applinks:yourdomain.vercel.app`)
- In `AppDelegate.swift`, handle `application:continueUserActivity:restorationHandler:` to route universal links into the web layer via the same `travelpanel://` scheme
- Add `XCODE_UNIVERSAL_LINKS.md` with step-by-step Xcode instructions

---

## PHASE E — Power Features

### E1 — Multi-Select & Batch Operations
**Status**: `[x]` Done  
**Why**: Users with 50+ clips need to batch-move or batch-delete. One-at-a-time is tedious.  
**Files to change**: `app/inbox/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Long-press on any card enters "selection mode" (checkboxes appear on all cards)
- Floating action bar at bottom: "Move to board" | "Delete (N)"
- "Move to board" shows the board picker sheet; moves all selected
- Exit selection mode: tap Cancel or press escape

### E2 — Sort Options
**Status**: `[x]` Done  
**Files to change**: `app/inbox/page.tsx`  
**What to do**:
- Add a Sort button (⇅ icon) next to the view toggle in inbox header
- Options: Newest first (default), Oldest first, Most locations, Most wisdom (substance count), Platform
- Persist sort preference in localStorage

### E3 — Duplicate URL Detection
**Status**: `[x]` Done  
**Files to change**: `components/ImportSheet.tsx`  
**What to do**:
- Before saving, check if any existing item has the same URL
- If found, show an inline warning: "⚠️ You already saved this — [Title]. View it?" with a link
- User can still save a duplicate (intentional re-clip) by tapping "Save anyway"

### E4 — Quick Clip from Clipboard
**Status**: `[x]` Done  
**Files to change**: `app/page.tsx`, `components/ImportSheet.tsx`  
**What to do**:
- On app focus, check `navigator.clipboard.readText()` for a URL
- If clipboard contains a URL not yet saved, show a subtle "📋 Clip from clipboard?" banner above the FAB
- Tapping the banner opens ImportSheet pre-filled with the clipboard URL
- Dismiss permanently via X or by saving it

### E5 — Advanced Search (Filters)
**Status**: `[x]` Done  
**Files to change**: `components/SearchBar.tsx`, `lib/searchItems.ts`  
**What to do**:
- Add a filter icon next to the search bar that expands a filter panel
- Filters: date range (last week / last month / custom), tags (multi-select chips), has locations, has wisdom, platform
- Active filter count badge on the filter icon
- Combine filters with existing text search

### E6 — Accessibility Pass
**Status**: `[x]` Done  
**Files to change**: Multiple components  
**What to do**:
- Audit all interactive elements for aria-label, role, and keyboard nav
- Ensure color contrast meets WCAG AA (especially on map overlays)
- Add `aria-live` region for enrichment status changes
- Test with VoiceOver on iOS simulator (check XCODE_SETUP.md for steps)
- Ensure Dynamic Type scaling works (use `text-[length]` relative units)

### E7 — Trip Collaboration Notes
**Status**: `[x]` Done  
**Files to change**: `app/plan/[boardId]/page.tsx`, `lib/types.ts`  
**What to do**:
- Add a "Notes" text area to the plan view below the day strips
- Notes are stored per trip plan version in the `trips` IndexedDB store
- Export button includes plan notes in the PDF/calendar export

### E8 — Clipboard Import on iOS (Capacitor)
**Status**: `[x]` Done  
**Files to change**: `components/CapacitorBridge.tsx`, `app/page.tsx`  
**What to do**:
- On app foreground (Capacitor `appStateChange` active event), check `@capacitor/clipboard` for a URL
- If new URL found, show the quick-clip banner (same as E4 but native clipboard API)
- Requires `@capacitor/clipboard` package + iOS NSPasteboardUsageDescription in Info.plist
- Add instructions to `ios/App/ShareExtension/XCODE_SETUP.md`

---

## PHASE F — App Store Readiness & Production Hardening

### F1 — App Transport Security (ATS) Hardening
**Status**: `[x]` Done
**Why**: `NSAllowsArbitraryLoads = true` in `ios/App/App/Info.plist` globally disables HTTPS enforcement — App Store review will flag this as a security violation.
**Files to change**: `ios/App/App/Info.plist`
**What to do**:
- Remove the top-level `NSAllowsArbitraryLoads: true` key
- Add `NSExceptionDomains` exception for `localhost` (dev) with `NSTemporaryExceptionAllowsInsecureHTTPLoads: true`
- Add exceptions for `tiles.openfreemap.org` and `basemaps.cartocdn.com` (map tiles) with `NSExceptionMinimumTLSVersion: TLSv1.2`
- Leave `NSAllowsLocalNetworking: true` for dev server access

### F2 — Capacitor Navigation Lockdown
**Status**: `[x]` Done
**Why**: `limitsNavigationsToAppBoundDomains = false` allows the WKWebView to navigate to any URL, breaking App Sandbox and potentially causing App Store rejection.
**Files to change**: `capacitor.config.ts`
**What to do**:
- Set `limitsNavigationsToAppBoundDomains: true` in the iOS server config block
- Add the deployed Vercel domain and `localhost` to `allowNavigation`
- Test that deep links (`travelpanel://share?url=...`) still open the share flow
- Test that external links in clip descriptions open Safari rather than navigating the WKWebView

### F3 — Enrichment Failure UX
**Status**: `[x]` Done
**Why**: When enrichment fails silently, users don't know if their clip was processed. This kills trust and forces churn.
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx`
**What to do**:
- In InboxCard, when `enrichmentStatus === 'failed'`, render an inline amber banner: "⚠️ Couldn't extract places — Retry" with a button that calls `onRetry(item.id, item.url)`
- In the inbox header count badge, add red dot indicator when any items have `enrichmentStatus === 'failed'`
- Show "N clips need attention" amber text link in the header that smoothly scrolls to the first failed card

### F4 — Image Lazy Loading & Map Performance
**Status**: `[x]` Done
**Why**: The inbox with 50+ clips loads all thumbnails eagerly, causing scroll jank on low-end iPhones.
**Files to change**: `components/InboxCard.tsx`, `components/MapView.tsx`
**What to do**:
- Add `loading="lazy"` and `decoding="async"` to all `<img>` tags in InboxCard
- In MapView, scale `useSupercluster` radius with zoom: zoom < 8 → radius 60, zoom 8-12 → radius 40, zoom > 12 → radius 20
- Add `will-change: transform` to animated Framer Motion elements in InboxCard swipe layer

### F5 — Clip Sharing (Share-to-iOS)
**Status**: `[x]` Done
**Why**: Users discover TravelPanel via word-of-mouth. Native share lets them forward clips to friends via iMessage/WhatsApp.
**Files to change**: `components/LocationDetailCard.tsx`, new `lib/shareClip.ts`
**What to do**:
- Create `lib/shareClip.ts` with `shareClip(item: SavedItem)`: calls `navigator.share()` with title + URL + top 2 location names + "Saved with TravelPanel"
- Fall back to `navigator.clipboard.writeText()` + toast "Copied to clipboard" when `navigator.share` is unavailable
- Add a Share2 icon button in LocationDetailCard action row (next to "View on map" and "Open original")
- On Capacitor iOS, `navigator.share()` triggers the native iOS share sheet — no extra packages needed

### F6 — Plan Generation Error Recovery
**Status**: `[x]` Done
**Why**: If the plan API times out mid-stream, users see a frozen "Analyzing…" state with no escape other than navigating away.
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/PlannerAgent.tsx`
**What to do**:
- Add a 90-second hard timeout on plan fetch: if no `done` step arrives in 90s, call `handleCancel()` and show error toast: "Plan timed out — try reducing days or simplifying preferences"
- In PlannerAgent, if last step is `type: 'error'`, show red error card with message + "Try again" button
- Add max 2 retries (2s exponential backoff) for transient network errors in the plan fetch loop

### F7 — Rich Onboarding Seed Data
**Status**: `[x]` Done
**Why**: Current seed data is minimal. New users need to see real value — clips with substance, locations, and a plan — within 10 seconds of opening the app.
**Files to change**: `lib/seed.ts`, `components/WelcomeOverlay.tsx`
**What to do**:
- In `lib/seed.ts`, enrich the 3 seed boards (Tokyo Weekend, Chengdu Food, Bali Retreat) so each board has 4-6 clips with real `substance` items (tips, warnings, costs) and `locations` arrays
- In WelcomeOverlay, after choosing "Try with sample boards", show a 3-step tooltip sequence: "📍 Tap a pin" → "📥 Go to Inbox" → "🗓 Tap Plan" that auto-advances every 3 seconds or on tap
- Persist `hasSeenOnboardingTips: true` in localStorage when sequence completes

### F8 — Dark Mode Map Tiles Auto-Switch
**Status**: `[x]` Done
**Why**: The map stays on the light tile style even when the device is in dark mode, creating an inconsistent look.
**Files to change**: `components/MapView.tsx`
**What to do**:
- On first load, check `window.matchMedia('(prefers-color-scheme: dark)').matches`; if dark and no stored preference, default to the dark (Carto Dark Matter) style instead of streets
- Listen to `prefers-color-scheme` media query changes: when user toggles system dark mode, auto-switch between streets↔dark-matter (only if user hasn't manually picked a style in this session)
- Keep the manual 3-way toggle overriding the auto logic; store manual choice in localStorage as before

---

## Completed Tasks

*(All Phase A–E tasks — see git history)*
