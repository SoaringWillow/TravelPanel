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

**Phase D — iOS Beauty Sprint**: All done (D1–D7)
- Skeleton loading states, micro-animations + haptics, dark mode, app icon + splash,
  onboarding flow, empty states with illustrations, safe area + Dynamic Island handling.

**Phase E/F — Production Readiness + Advanced iOS**: Largely done
- Privacy/terms pages, App Store metadata, in-app review prompt, offline indicator,
  QR board sharing, duplicate clip detection, pull-to-refresh. (E1 Supabase auth and F4 Siri Shortcuts deferred — need env keys / native Xcode.)

**Phase G — Polish and Performance**: All done (G1–G5)
- Boards pull-to-refresh, InboxCard long-press to move, search debounce + cancel,
  BoardCard substance badges (location count + tip count), trip planning progress animation.

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

`D1 → D2 → D3 → D4 → D5 → D6 → D7 → E1 → E2 → E3 → E4 → E5 → F1 → F2 → F3 → G1 → G2 → G3 → G4 → G5 → H1 → H2 → H3 → H4 → H5 → H6`

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
**Status**: `[x]` Done
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
**Status**: `[x]` Done
**Files**: `components/ShareBoardButton.tsx`, new `components/QRModal.tsx`
**What to do**:
- Install `qrcode` npm package (pure JS, no canvas needed — outputs SVG string)
- Add a "Show QR" option to `ShareBoardButton` that opens a modal
- `QRModal` displays a large QR code encoding the `/boards/join?data=...` URL
- Caption: "Scan to add this board to TravelPanel"
- The QR modal has a "Download QR" button that saves the SVG as PNG

### F2 — Duplicate Clip Detection
**Status**: `[x]` Done
**Files**: `app/share/page.tsx`, `lib/db.ts`
**What to do**:
- Before saving a new clip in `/share`, check if an item with the same URL already exists (query IndexedDB by URL)
- If duplicate found, show a warning: "You already saved this! It's in [Board Name]. Save again anyway?"
- Add a secondary button "View existing clip" that navigates to the existing item
- This prevents the common frustration of saving the same post twice

### F3 — Pull-to-Refresh on Inbox and Boards
**Status**: `[x]` Done
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

## PHASE G — Polish and Performance

### G1 — Boards Page Pull-to-Refresh
**Status**: `[x]` Done
**Files**: `app/boards/page.tsx`
**What to do**:
- Integrate `PullToRefresh` component (created in F3) into `app/boards/page.tsx` content area
- Pass `useBoards().refresh` as the onRefresh handler
- Ensure `useBoards` hook exposes a `refresh()` function (add it if missing)

### G2 — InboxCard Long-press to Move
**Status**: `[x]` Done
**Files**: `components/InboxCard.tsx`
**What to do**:
- Add a long-press handler (500ms hold) to the full InboxCard in done state
- On long-press: trigger `haptic('medium')` and call `onMoveToBoard(item.id)`
- This mirrors the native feel of long-pressing to manage items in iOS apps

### G3 — Search Performance: Debounce and Cancel
**Status**: `[x]` Done
**Files**: `app/inbox/page.tsx`, `lib/vibeSearch.ts`
**What to do**:
- Currently the search fires synchronously on every keystroke. Add a proper 300ms debounce using `useRef + setTimeout` (instead of changing query state inline)
- Cancel in-flight vibe search requests when a new query arrives (use an AbortController or the existing searchVersion ref approach)
- Add a loading indicator (spinner or subtle dot) while vibe search is in flight

### G4 — Clip Count Badge on Board Cards
**Status**: `[x]` Done
**Files**: `components/BoardCard.tsx`
**What to do**:
- Currently BoardCard shows item count as plain text
- Add a subtle badge: indigo pill with location pin icon + count, and a lightbulb icon + tip count if any items in the board have substance
- This surfaces the "substance density" of each board at a glance

### G5 — Trip Planning Progress Animation
**Status**: `[x]` Done
**Files**: `components/PlannerAgent.tsx`
**What to do**:
- The PlannerAgent shows agent steps as they stream. Add animated step-by-step progress:
  - Each step fades in from below as it arrives
  - Show a pulsing indigo dot for the current "thinking" step
  - Completed steps get a green check mark
  - Add estimated time display ("Usually takes 15–30 seconds")

---

## PHASE H — Substance & Intelligence

> Phase H deepens the "Substance over Spots" moat. All tasks are local-first (no Supabase required).
> Recommended order: H1 → H2 → H3 → H4 → H5 → H6

### H1 — Auto-Sort Suggestion for Inbox Clips
**Status**: `[x]` Done
**Why**: The "ambient organization" promise — clips organize themselves without user effort. Currently users must manually move every clip. Auto-sort suggestion makes the promise real.
**Files**: `app/api/autosort/route.ts` (new), `app/inbox/page.tsx`, `lib/db.ts`
**What to do**:
- Create `app/api/autosort/route.ts`: POST endpoint that receives `{ clip: SavedItem, boards: Board[] }` and uses Claude Haiku to return `{ boardId: string | null, confidence: number, reason: string }`. System prompt: "Given this travel clip and the user's boards, which board does it best fit? Return null if none match. Respond with JSON only."
- In `lib/db.ts`, add `suggestBoardForItem(itemId: string)` that calls this API and stores the suggestion as `item.suggestedBoardId` + `item.suggestedBoardReason` (update `SavedItem` type in `lib/types.ts` to include these optional fields)
- Call `suggestBoardForItem` automatically in `app/api/import/route.ts` after enrichment completes (fire-and-forget, don't await)
- In `app/inbox/page.tsx`, add a "Smart Sort" banner at the top of the inbox (when `items.some(i => i.suggestedBoardId && !i.boardId)`): "✨ {N} clips have suggested boards" → tapping opens a sheet showing each unassigned clip with its suggested board + a one-tap ✓ confirm button and ✕ dismiss button
- Confirming calls `addItemToBoard(suggestedBoardId, itemId)` and clears the suggestion; dismissing just clears `suggestedBoardId`

### H2 — Rich Location Detail Drawer from Map
**Status**: `[x]` Done
**Why**: Tapping a map pin currently shows a minimal popup. A rich drawer that surfaces all clips AND substance tips for that location fulfills the "substance is first-class" principle from the product strategy.
**Files**: `components/MapView.tsx`, `components/LocationDrawer.tsx` (new)
**What to do**:
- Create `components/LocationDrawer.tsx`: a bottom sheet (similar to the board selector sheet pattern — spring animation from `y: '100%'` to `y: 0`) that receives `{ location: Location, items: SavedItem[] }` as props
  - Header: location name + address
  - "From your clips" section: horizontal scroll of thumbnail chips — each chip shows the clip's platform badge + title (truncated to 1 line); tapping a chip navigates to `/?itemId={id}`
  - "Tips for this spot" section: a scrollable list of all `substance` items from any clip where `substance[i].applies_to` matches this location (or where the clip itself has this location). Use `SubstanceList` component for rendering.
  - If no substance: show "No specific tips yet — add more clips about this place"
  - Close button (X) top-right; backdrop tap closes
- In `components/MapView.tsx`, replace the existing `<Popup>` or pin click handler with a `selectedLocation` state + render `<LocationDrawer>` when a pin is tapped. Pass all `items` as a prop from the parent map page.
- The map page (`app/page.tsx`) must pass `items` down to `MapView` (check if it already does; if not, add `useSavedItems` hook there)

### H3 — Plan Enrichment Signals (Seasons & Crowds)
**Status**: `[ ]` Not started
**Why**: This is the core differentiator from the product strategy: "A plan for Tokyo in late March will recommend an itinerary without flagging Sakura season, 2× accommodation prices, and 3-hour queue wait times." Social media guides can't close this gap; TravelPanel can.
**Files**: `lib/enrichmentSignals.ts` (new), `app/api/plan/route.ts`, `app/plan/[boardId]/page.tsx`
**What to do**:
- Create `lib/enrichmentSignals.ts` with a static JSON array of ~40 major travel enrichment signals. Each entry:
  ```ts
  interface EnrichmentSignal {
    id: string;
    destinations: string[];  // lowercase city/country names to match against
    startMonth: number;      // 1-12, inclusive range
    endMonth: number;
    title: string;           // e.g., "Cherry Blossom Season"
    warning: string;         // e.g., "Peak crowds and accommodation 40–60% above average"
    emoji: string;           // e.g., "🌸"
    severity: 'info' | 'warning' | 'high';
  }
  ```
  Include signals for: Cherry Blossom (Tokyo/Kyoto/Japan, Mar–Apr), Golden Week (Japan, Apr–May), Typhoon season (Japan/SE Asia, Jul–Sep), Sakura festival, Diwali (India, Oct–Nov), Chinese New Year (China/SE Asia, Jan–Feb), Carnival (Brazil, Feb–Mar), Christmas markets (Germany/Austria/France, Nov–Dec), Monsoon SE Asia (Thailand/Vietnam, Jun–Sep), NYC Thanksgiving parade (Nov), Tokyo Summer Olympics crowds, Songkran water festival (Thailand, Apr), Peak Bali season (Jul–Aug)
- Export `getSignalsForPlan(destinations: string[], travelMonth: number): EnrichmentSignal[]` — matches by destination substring (case-insensitive) and month range
- In `app/api/plan/route.ts`: extract destination names from the board's clips' `locations[].address` fields, infer the travel month from the request (pass `month` param from the client or default to current month). Inject the matched signals into the system prompt as: "Active enrichment signals for this trip: {signals.map(s => s.title + ': ' + s.warning).join('; ')}. Reference these inline in the plan as warnings."
- In `app/plan/[boardId]/page.tsx`: add a `travelMonth` selector (simple 1–12 month picker or "Traveling in: [month dropdown]") above the "Generate Plan" button. Default to current month.
- After plan generation, if any signals were active, show them as dismissible banner cards at the top of the plan output — each as a colored pill (yellow for warning, red for high) with the emoji + title + warning text

### H4 — Plan Natural Language Modifier
**Status**: `[ ]` Not started
**Why**: "Regenerate with more free time" or "More budget-conscious" turns the planner from a one-shot tool into an iterative collaborator — directly matching the product strategy goal of plan iteration via natural language.
**Files**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`
**What to do**:
- In `app/plan/[boardId]/page.tsx`: after a plan is generated (when plan text exists), show a "Refine this plan" input bar at the bottom of the plan output:
  - A text input: placeholder "e.g. 'More free time', 'Budget-friendly options', 'Add a day trip'"
  - A "Regenerate ↻" button (indigo, `whileTap={{ scale: 0.96 }}`)
  - Quick-tap chips above the input for common modifiers: "More relaxed pace", "Budget-friendly", "Foodie focus", "Skip museums", "Add outdoor activities"
  - Tapping a chip fills the text input; pressing Regenerate submits
- In `app/api/plan/route.ts`: accept an optional `modifier?: string` in the request body. If present, prepend to the user message: "User modification request: {modifier}. Adjust the plan accordingly while keeping the same structure."
- The modifier input should clear after submission. The existing multi-version plan saving (A11) handles storing the new version.
- Add `haptic('medium')` on modifier submission

### H5 — Wisdom Tab on Board Detail Page
**Status**: `[ ]` Not started
**Why**: The product strategy calls for a "Wisdom view" as the third primary surface: every board has a tab showing all substance — browsable, searchable, with citation back to source clips. This is the post-200-saves retention feature.
**Files**: `app/boards/[id]/page.tsx`
**What to do**:
- Add a tab bar to the board detail page with 3 tabs: **Map** (current default view with clips), **Clips** (the InboxCard grid), **Wisdom** (new)
- The current page already shows a map + cards — reorganize into tabs using a simple tab state variable
- **Wisdom tab** content:
  - Filter chips: All / Tips / Warnings / Opinions / Context (maps to `substance[i].type`)  
  - Filtered list of all `substance` items from all board clips, rendered as cards:
    - Card: type badge (color-coded: tips=green, warnings=red, opinions=blue, context=gray) + substance content text + "From: {clip.title}" in small gray text + a "→" button that navigates to `/?itemId={clipId}`
  - Empty state: "No wisdom extracted yet — add more clips with tips, warnings, or opinions"
  - Count badge on the Wisdom tab: show total substance count as a number pill
  - Search input at top of Wisdom tab: filters the substance list by text content
- The `SubstanceList` component is already available — use or extend it

### H6 — Board Cover Auto-Assignment
**Status**: `[ ]` Not started
**Why**: BoardCards with cover thumbnails look dramatically better. Currently the `coverThumbnail` field exists in the Board type but is never set automatically. This makes every board look like a plain card instead of a visual collection.
**Files**: `lib/db.ts`, `hooks/useBoards.ts`
**What to do**:
- In `lib/db.ts`, update `addItemToBoard(boardId, itemId)`:
  - After adding the item, load the board and check if `board.coverThumbnail` is already set
  - If not set, load the item and check if `item.thumbnail` exists
  - If both conditions are met, call `updateBoard({ ...board, coverThumbnail: item.thumbnail })`
- In `lib/db.ts`, update `removeItemFromBoard(boardId, itemId)`:
  - After removing, check if the removed item's thumbnail was the board's `coverThumbnail`
  - If so, pick the next item in the board that has a thumbnail as the new cover (or set `coverThumbnail: undefined` if none)
- In `components/BoardCard.tsx`: the cover thumbnail already renders as a full background with a white/dark overlay. Improve the overlay opacity: use `bg-white/70 dark:bg-gray-800/70` (slightly more opaque) so the thumbnail shows through more clearly. Also add a subtle bottom gradient `from-transparent to-white/90 dark:to-gray-800/90` at the bottom of the card for better text contrast.
- Add a "Change cover" option: in the board detail page, tapping the board emoji should open a mini sheet with the 4 most recent clip thumbnails as selectable covers plus a "No cover" option.

---

## Completed Tasks

*(Phases A, B, C, D, E/F, and G largely complete — see git history for details)*
