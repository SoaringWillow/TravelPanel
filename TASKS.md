# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Current State (as of 2026-06-10)

The core clip → extract → board → plan loop works end-to-end. All Phase A–E tasks complete except blocked items (B4/D4 need Supabase, E4 needs Xcode, E5 needs RevenueCat). The app looks and functions like a web prototype wrapped in Capacitor.

**The gap to a beautiful, fully functional iOS app** is now in three areas:
1. **Native feel**: Safe area, haptics, pull-to-refresh, swipe gestures — things the OS expects
2. **Ship readiness**: Privacy manifest, App Store metadata, accessibility compliance
3. **Retention surface**: Widget, smart resurfacing, viral sharing moments

North Star metric: **Weekly clips per active user**. Every task below is measured against this.

---

## ⭐ Recommended Execution Order

`F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → G1 → G2 → G3 → G4 → H1 → H2 → H3`

---

## PHASE F — iOS Native Feel & Ship Readiness

> These tasks close the gap between "web app in a WebView" and "native iOS product". They are table-stakes for App Store approval and for surviving a first-week retention cohort.

### F1 — Safe Area & Dynamic Island Support
**Status**: `[x]` Done  
**Why**: iOS 14+ devices have notches and Dynamic Islands. Without `env(safe-area-inset-*)`, the top navbar overlaps the status bar and the bottom FAB hides behind the home indicator. This is the most visually jarring issue on a real device.  
**Files to change**: `app/globals.css`, `app/layout.tsx`, `components/NavBar.tsx`, `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Add `viewport-fit=cover` to the viewport meta tag in `app/layout.tsx` — this tells iOS to render edge-to-edge
- Add Tailwind safe-area utilities to `app/globals.css`:
  ```css
  .pt-safe-top    { padding-top: env(safe-area-inset-top, 0px); }
  .pb-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
  .pl-safe-left   { padding-left: env(safe-area-inset-left, 0px); }
  .pr-safe-right  { padding-right: env(safe-area-inset-right, 0px); }
  ```
- Apply `pt-safe-top` to the top bar in `app/page.tsx` (already has `pt-12`, replace with `pt-safe-top` dynamic value)
- Apply `pb-safe-bottom` to the NavBar's bottom padding so the home indicator doesn't overlap icons
- In the map view, the floating top bar should start at `top: env(safe-area-inset-top, 0px)` not fixed `top-0`
- Test with the Simulator's device frame to verify there's no overlap at notch/island area

### F2 — iOS Privacy Manifest
**Status**: `[x]` Done  
**Why**: Apple requires a privacy manifest (`PrivacyInfo.xcprivacy`) for all new App Store submissions since May 2024. Without it, the app will be rejected. It declares which iOS APIs we use and why.  
**File to create**: `ios/App/App/PrivacyInfo.xcprivacy`  
**What to do**:
- Create the XML privacy manifest declaring these accessed API categories:
  - `NSPrivacyAccessedAPICategoryUserDefaults` — we use UserDefaults for App Group Share Extension fallback (reason: `CA92.1` — storing user preferences)
  - `NSPrivacyCollectedDataTypes` — if PostHog is enabled: analytics events (not linked to identity unless user logs in)
- Content template:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
      <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
          <string>CA92.1</string>
        </array>
      </dict>
    </array>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyTracking</key>
    <false/>
  </dict>
  </plist>
  ```
- Note: This file must also be added to the Xcode project via the Xcode GUI — document this in `ios/App/XCODE_SETUP.md`

### F3 — Offline & Error States
**Status**: `[x]` Done  
**Why**: When the user's internet is spotty (on a plane, in a tunnel), every API call silently fails. There's no "you're offline" indicator, no retry button, and no cached content fallback. This is a critical retention risk for a travel app (used internationally, often with poor connectivity).  
**Files to change**: `components/ImportSheet.tsx`, `app/plan/[boardId]/page.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Create a `useOnlineStatus()` hook in `hooks/useOnlineStatus.ts` that listens to `window.addEventListener('online'/'offline')` and returns `{ isOnline: boolean }`
- In `ImportSheet`: when offline, disable the import button and show a `"You're offline — clips will save for later"` banner above the URL input
- In `app/plan/`: show a `"No internet connection"` amber warning if offline; still allow viewing existing saved plans
- In `app/inbox/`: show a subtle offline indicator dot in the header when offline
- The map (MapLibre) has its own tile caching — don't change map behavior, just UI components
- On `fetch` error (network error vs. API error), distinguish the two and show different messages:
  - Network error: "No connection — check your internet and try again"
  - API error (4xx/5xx): "Something went wrong — tap to retry"

### F4 — Pull-to-Refresh in Inbox & Boards
**Status**: `[x]` Done  
**Why**: iOS users instinctively pull down to refresh. Without it, the app feels static and stale. This is a P0 UX expectation from App Store reviewers and users alike.  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Use the Capacitor `@capacitor/app` plugin's `pause`/`resume` events OR use pure CSS/JS overscroll detection
- Simplest approach: add a `TouchStart`/`TouchMove` listener on the scroll container — if `scrollTop === 0` and user drags down, show a refresh spinner and call `refresh()` from `useSavedItems`
- Alternatively, install `@capacitor/haptics` (already installed) and trigger a light haptic when pull-to-refresh activates
- Show a spinner with `"Refreshing…"` text while loading, then snap back
- Must feel native: the spinner should appear ABOVE the first list item, not push content down

### F5 — Accessibility (VoiceOver + Dynamic Type)
**Status**: `[x]` Done  
**Why**: App Store review team tests with VoiceOver. Failing accessibility review causes rejection. Additionally, many travel users are older — Dynamic Type support is retention-critical for them.  
**Files to change**: Most components  
**What to do**:
- Audit and add `aria-label` to every `<button>` that has only an icon (no text):
  - GPS toggle, close buttons, share button, regenerate summary button, navigation button
- Add `role="list"` and `role="listitem"` to the inbox grid and board list
- Add `aria-live="polite"` to the undo toast and nearby chip (screen reader will announce them)
- For Dynamic Type: replace hardcoded `text-sm`, `text-xs` in key areas with CSS `clamp()` or Tailwind `text-base` minimum — most important in `LocationDetailCard` and `InboxCard`
- Add `aria-busy="true"` to skeleton loaders
- Test with iOS Simulator > Accessibility Inspector > Audit

### F6 — Virtualized Infinite Scroll for Large Collections
**Status**: `[x]` Done  
**Why**: At 200+ clips, the DOM has 200+ card components, each with motion listeners and image loads. This causes frame drops and scroll jank — especially on older iPhones. The app's North Star is clip accumulation, so this will hit every power user.  
**Files to change**: `app/inbox/page.tsx`  
**What to do**:
- Install `@tanstack/react-virtual` (lightweight, no peer dep conflicts): `npm install @tanstack/react-virtual`
- Replace the flat `items.map()` list in inbox with a virtualized list using `useVirtualizer`
- Each row: 2 cards side-by-side (current grid layout)
- The virtualizer should measure row heights dynamically since skeleton cards differ from loaded cards
- Threshold: only activate virtualization when `items.length > 50` — below that the DOM cost is negligible
- Keep the existing filter/search logic intact; pass the filtered array to the virtualizer

### F7 — Universal Links (apple-app-site-association)
**Status**: `[x]` Done  
**Why**: Currently deep links use the `travelpanel://` custom URL scheme. Universal links (`https://travelpanel.app/...`) are the standard — they work on first install without the app needing to be open, they appear as normal web URLs in iMessage, and they fall back to the web app if not installed.  
**Files to create**: `public/.well-known/apple-app-site-association`  
**What to do**:
- Create `public/.well-known/apple-app-site-association` with the AASA JSON:
  ```json
  {
    "applinks": {
      "apps": [],
      "details": [{
        "appID": "TEAMID.com.travelpanel.app",
        "paths": ["/shared/*", "/inbox", "/boards/*", "/plan/*"]
      }]
    }
  }
  ```
- Note: Replace `TEAMID` with the actual Apple Team ID — document this placeholder clearly
- Update `ios/App/App/Info.plist` to add `com.apple.developer.associated-domains` with `applinks:travelpanel.app`
- Update `CapacitorBridge.tsx` to handle incoming universal link paths (route `/shared/TOKEN` → decode and show the board)
- Document the entitlement that must be enabled in Xcode: **Signing & Capabilities → Associated Domains**

### F8 — App Store Submission Checklist & TestFlight Setup
**Status**: `[x]` Done  
**Why**: The app needs a proper submission checklist so a human can complete the Xcode/App Store Connect steps that can't be automated. Clear documentation prevents launch-day scramble.  
**File to create**: `ios/App/APP_STORE_CHECKLIST.md`  
**What to do**:
- Create `ios/App/APP_STORE_CHECKLIST.md` that documents every manual step:
  1. Xcode signing (bundle ID, provisioning profile, team ID)
  2. App icon: place the 1024×1024 PNG in `Assets.xcassets/AppIcon.appiconset/`
  3. Launch screen: update `Assets.xcassets/Splash.imageset/` with brand splash
  4. Privacy manifest: add `PrivacyInfo.xcprivacy` to the Xcode project target
  5. Associated Domains capability: `applinks:travelpanel.app`
  6. Share Extension App Group: `group.com.travelpanel.app` — add to both targets
  7. `pod install` in `ios/App/`
  8. Archive → Upload to App Store Connect
  9. App Store metadata: title, subtitle, description (template included in the doc)
  10. Screenshots: required sizes (6.7", 6.5", 5.5", iPad 12.9")
  11. Age rating: 4+ (no user-generated content moderation needed yet)
  12. Export compliance: No encryption used → select "No" for encryption
- Also include the production build command: `CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build`

---

## PHASE G — Viral Growth Surface

> Features that expand reach without ads. The best travel apps grow because users share their trips.

### G1 — Smart "Share this Trip Plan" Card
**Status**: `[x]` Done  
**Why**: A generated trip plan is a shareable moment. Currently there's no way to share a plan — only boards (via D2). A "Share plan" action generates a visually rich summary card that users can screenshot and share on social.  
**Files to change**: `app/plan/[boardId]/page.tsx`, new `components/PlanShareCard.tsx`  
**What to do**:
- After a plan is generated, add a "Share" button in the plan header
- Tapping it renders a full-screen "plan summary card" modal:
  - Board emoji + name at top
  - "X days in [destination]" tagline
  - Day themes listed in a timeline (Day 1: Food & history → Day 2: Mountains & temples → ...)
  - Number of locations + source clips
  - TravelPanel branding at bottom: "Built with TravelPanel 🗺"
- On iOS: use `@capacitor/share` plugin (`Share.share({ text, url })`) to open the native iOS share sheet
- On web: copy a summary text to clipboard
- The card component should be self-contained so it can be screenshotted easily (no nav bars overlapping)
- Style: white background, large fonts, indigo accents — looks great as a screenshot

### G2 — "Import Friend's Board" Deep Link
**Status**: `[ ]` Not started  
**Why**: D2 added board sharing (base64 URL). But when a friend taps the link on iOS, there's no obvious prompt to "Save to my TravelPanel". The import experience needs to be more intentional and conversion-optimized.  
**Files to change**: `app/shared/[token]/page.tsx`, `components/CapacitorBridge.tsx`  
**What to do**:
- On the shared board page, add a prominent "Save to my TravelPanel" button that:
  - Decodes the board + items from the token
  - Saves all items to IndexedDB via `addItem()`
  - Creates a new board with the same name/emoji
  - Navigates to the newly created board
- Show a "X clips saved!" success toast after import
- In `CapacitorBridge.tsx`, handle the `travelpanel://shared/TOKEN` scheme to open the shared board view directly if the app is installed
- Track this event: `track('board_imported_from_share_link')`

### G3 — Clip Count Milestone Celebrations
**Status**: `[ ]` Not started  
**Why**: Celebrating milestones (5th clip, 25th clip, first plan) creates dopamine moments that increase weekly retention. Apps like Duolingo live by this.  
**Files to change**: `app/inbox/page.tsx`, `app/plan/[boardId]/page.tsx`, new `lib/milestones.ts`  
**What to do**:
- Create `lib/milestones.ts` with `checkMilestone(clipCount: number): string | null` that returns a celebration message at counts: 1, 5, 10, 25, 50, 100
  - 1: "First clip saved! 🎉 Your adventure collection starts here."
  - 5: "5 places saved! You're building something special ✈️"
  - 10: "10 clips — enough to plan a trip! 🗺 Try the trip planner."
  - 25: "25 places! You're a seasoned explorer 🏔"
  - 50: "50 clips! Power user mode activated 🔥"
  - 100: "100 places saved 🌏 That's a lifetime of adventures."
- After each `addItem()` call in `app/inbox/page.tsx`, check if a milestone is hit and show a full-screen `AnimatePresence` confetti modal (use `framer-motion` to animate emoji confetti)
- The modal auto-dismisses after 3 seconds or on tap
- Track: `track('milestone_hit', { count: clipCount })`
- Gate per milestone: only show each milestone once (localStorage flag)

### G4 — "Inspiration From" Attribution on Import
**Status**: `[ ]` Not started  
**Why**: When a clip is imported from a specific creator's video/post, the "Inspired by [creator]" attribution is valuable context — both for the user's memory and for potential future social features.  
**Files to change**: `app/api/import/route.ts`, `lib/types.ts`, `components/LocationDetailCard.tsx`  
**What to do**:
- In the Claude extraction prompt, add optional `sourceAuthor?: string` and `sourceDate?: string` fields to the schema
- Example: a Xiaohongshu post by "旅行博主小王" → `sourceAuthor: "旅行博主小王"`
- Add `sourceAuthor?: string` to `SavedItem` type
- In `LocationDetailCard`, if `sourceAuthor` is present, show a subtle "Inspired by [author]" line in grey below the platform badge
- This sets up future social features (follow your favorite travel creators' clips)

---

## PHASE H — AI Intelligence Layer

> These features use AI to make the app smarter over time — turning a clip library into a contextual travel assistant.

### H1 — Contextual Clip Resurfacing ("Good time to go")
**Status**: `[ ]` Not started  
**Why**: The best moment to use a saved Tokyo clip is when the user is planning a Japan trip, not 6 months after they saved it. The "Good time to go" feature resurfaces clips based on season, events, or user behavior patterns.  
**Files to change**: `app/inbox/page.tsx`, new `lib/resurface.ts`  
**What to do**:
- Create `lib/resurface.ts` with `getResurfaceRecommendations(items, signals)`:
  - Take the current month/season as a signal
  - For each item, check if any substance items mention a season (e.g. "cherry blossoms peak April", "avoid July humidity")
  - Return up to 3 clips that are seasonally relevant right now
- Add a "Good time to go" section at the TOP of the inbox (above the filter chips), showing the relevant clips in a horizontal scroll row
- Each resurfaced clip has a seasonal context chip: "🌸 Cherry season in 3 weeks" or "☀️ Perfect weather now"
- This section only appears when ≥1 item passes the seasonal relevance filter

### H2 — Smart Trip Duration Suggestion
**Status**: `[ ]` Not started  
**Why**: Users don't know how many days to plan for. Currently they enter a number manually. Claude can look at the clips in a board and suggest "Based on your 12 clips, we suggest 4–6 days" — reducing decision paralysis.  
**Files to change**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- When the plan modal opens, calculate a suggested duration:
  - If ≤5 clips: suggest 2–3 days
  - If 6–15 clips: suggest 4–6 days  
  - If 16–30 clips: suggest 7–10 days
  - If >30 clips: suggest "10+ days or split into multiple trips"
- Show this as a subtle suggestion text below the duration input: "💡 Based on your 12 places, we suggest 5 days"
- Pre-fill the input with the suggested value but let user override
- No API call needed — pure client-side calculation

### H3 — Substance Conflict Detection
**Status**: `[ ]` Not started  
**Why**: When two clips about the same location have conflicting wisdom ("always book in advance" vs "walk-ins accepted"), the user needs to know. Surfacing conflicts prevents bad trip decisions.  
**Files to change**: `app/boards/[id]/page.tsx`, new component or inline logic  
**What to do**:
- When a board has ≥2 clips about the same location (name overlap), scan their substance items for potential conflicts
- Simple heuristic: if one substance item contains "book" + "advance" and another contains "walk-in" or "no reservation needed", flag a conflict
- Show a subtle "⚠️ Conflicting tips" badge in the board detail header, clicking which opens a modal listing the conflicts with their source clips
- This can be entirely client-side — no API call needed

---

## Blocked (waiting for external resources)

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Blocked on Supabase pgvector  

### D4 — Proactive Resurfacing (Push Notifications)
**Status**: `[ ]` Blocked on Supabase  

### E4 — iOS Home Screen Widget
**Status**: `[ ]` Blocked — requires Xcode native SwiftUI widget target (must be done manually)  

### E5 — Pro Tier Paywall
**Status**: `[ ]` Blocked — requires RevenueCat setup + Apple Developer account with IAP configured  

---

## Completed Tasks (Phases A–E)

*(All Phase A–E tasks are complete as of 2026-06-10. See git log for implementation details.)*

Phase A: Substance extraction, enrichment retry, error tracking, cost guard, resource notifications, pin clustering, full-text search, onboarding seed boards, plan export, multi-version plans, wisdom view, sourced itineraries.

Phase B: Supabase scaffold (dormant), browser extension, Xiaohongshu fix, cloud backup export.

Phase C: Dark mode, clipboard import, swipe gestures + haptics, skeleton loaders, map UX (fly-to, navigate, category pins, long-press), empty state illustrations, in-app review, Spotlight search stub.

Phase D: Nearby GPS mode, read-only board sharing (base64 URL), post-trip timeline.

Phase E: AI board summary (streaming), batch URL import, real-world enrichment signals.
