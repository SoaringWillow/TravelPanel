# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Current Project Status (as of 2026-06-08)

**What's built:**
- Full clip flow: iOS Share Extension → `/share` page → Claude AI extraction (spots + substance)
- Map view with clustering, tag-colored pins, hover labels
- Board organization + board detail view with mini-map
- AI trip planner (streaming NDJSON) with sourced-tip citations and plan versioning
- Substance/wisdom layer: extraction, display in detail card, threaded into plans
- Browser extension (Chrome/Safari Manifest V3) for desktop clipping
- Claude Vision fallback for Xiaohongshu/anti-scraping platforms
- On-trip GPS mode: pulsing blue dot, auto-centre, nearest-clip distance
- Post-trip timeline: chronological diary with vertical spine
- Shared boards v1: URL-encoded read-only sharing + one-tap import
- Proactive resurfacing: 4-signal smart card (proximity, inbox pile, plan nudge, rediscovery)
- Data export: full JSON backup download from Collections page
- Enrichment retry queue (3 retries, exponential backoff)
- Full-text search across clips
- Onboarding seed boards with dismiss option
- Plan export (PDF + .ics calendar)
- PostHog analytics (dormant until key provided)
- Supabase cloud sync (scaffolded, dormant until keys provided)
- AI cost guard (rate limits per session/day)
- Resource banner for missing env vars

**Key gaps for a beautiful, fully functional iOS app:**
1. No haptic feedback on iOS (Capacitor Haptics not wired)
2. Safe area handling is inconsistent (some pages use pt-12 instead of safe-area-inset-top)
3. No custom app icon (default Capacitor placeholder)
4. No splash/loading screen beyond the default
5. Share page success is functional but not delightful enough for the #1 user action
6. No privacy policy or App Store metadata
7. No offline indicator
8. Dark mode not supported (light-only)
9. Inbox has no virtual scrolling — lags at 200+ items
10. No "what to do next" empty-state CTA on first launch (seed boards show, but no walkthrough)
11. Subtitle/description copy is generic — needs travel-brand voice
12. No push notification support (local notifications for proximity reminders)

---

## Recommended Execution Order

`D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → E1 → E2 → E3 → F1 → F2`

---

## PHASE D — iOS Polish & Native Feel

### D1 — Haptic Feedback (Capacitor Haptics)
**Status**: `[x]` Done  
**Why**: iOS apps feel cheap without haptics. Every save, every plan generation, every success state should vibrate gently. This is a 30-minute task that dramatically improves perceived quality.  
**Files to change**: `lib/haptics.ts` (new), `app/share/page.tsx`, `app/plan/[boardId]/page.tsx`, `components/InboxCard.tsx`  
**What to do**:
- Install `@capacitor/haptics` (already in package.json if not, add it)
- Create `lib/haptics.ts`: `lightTap()`, `successVibration()`, `errorVibration()` — each wraps `Haptics.impact()` and no-ops gracefully outside Capacitor
- Wire `lightTap()` on every button press that saves data (board chip in share page, delete in InboxCard)
- Wire `successVibration()` on clip save success (stage==='done' in share page), plan generation complete
- Wire `errorVibration()` on enrichment failure (3 retries exhausted)

### D2 — Consistent Safe Area Insets
**Status**: `[x]` Done  
**Why**: On iPhone 14/15 with Dynamic Island, `pt-12` (48px) clips the notch on some pages and leaves too much padding on others. Must use CSS env(safe-area-inset-top).  
**Files to change**: `app/globals.css`, all page files with `pt-12` or `pt-safe` classes  
**What to do**:
- Add to `globals.css`: `.safe-top { padding-top: max(16px, env(safe-area-inset-top)); }` and `.safe-bottom { padding-bottom: max(16px, env(safe-area-inset-bottom)); }`
- Replace ALL hardcoded `pt-12` on page headers with `safe-top` class (check: page.tsx, share/page.tsx, boards/page.tsx, boards/[id]/page.tsx, inbox page, timeline/page.tsx)
- The NavBar already sits at `bottom-0` — add `pb-[env(safe-area-inset-bottom)]` to its inner padding so tab labels aren't cut off on iPhone X+
- Test by checking the pages compile without TypeScript errors

### D3 — Share Page Delight Upgrade
**Status**: `[ ]` Not started  
**Why**: The iOS Share Sheet is THE product moat. The save flow must feel instant and magical, not just functional. Currently the success state is a static checkmark.  
**Files to change**: `app/share/page.tsx`  
**What to do**:
- Redesign the success stage: animate a confetti burst (use `canvas-confetti` npm package) that fires once when `stage === 'done'`
- Make the check icon animate in with a draw-on stroke animation using CSS `stroke-dashoffset` on an SVG circle + checkmark (no library needed)
- Show the board name the clip was saved to in large, bold text: "✈️ Saved to Tokyo!"
- Show substance count immediately: "Found 4 tips" (or animate it counting up if >0)
- Add a pulsing ring animation to the success icon
- Install `canvas-confetti` if not present (`npm install canvas-confetti @types/canvas-confetti`)

### D4 — Dark Mode Support
**Status**: `[ ]` Not started  
**Why**: ~70% of iPhone users run Dark Mode. A light-only app feels unfinished on iOS.  
**Files to change**: `app/globals.css`, `tailwind.config.js`, all components  
**What to do**:
- Add `darkMode: 'class'` to `tailwind.config.js` (use class strategy to avoid flash on SSR)
- Add dark mode CSS variables to `globals.css` under `@media (prefers-color-scheme: dark)` or `.dark` class — map: `--background: 224 71.4% 4.1%`, `--foreground: 210 20% 98%`, etc.
- Create `lib/theme.ts` with `initTheme()` that reads `localStorage.getItem('theme')` or `window.matchMedia('prefers-color-scheme: dark')` and applies `.dark` to `document.documentElement`
- Call `initTheme()` in `app/layout.tsx`
- Update the most-visible components to use semantic color classes (`bg-background`, `text-foreground`) instead of hardcoded `bg-white`/`text-gray-900`
- Focus on: NavBar, top bars, InboxCard, BoardCard, LocationDetailCard, share page

### D5 — Offline Indicator
**Status**: `[ ]` Not started  
**Files**: new `components/OfflineBanner.tsx`, `app/layout.tsx`  
**What to do**:
- Create `OfflineBanner` component that listens to `navigator.onLine` + `online`/`offline` events
- When offline: slide down a yellow banner "You're offline — clips will be saved when connection returns"
- When back online: show "Back online ✓" for 2 seconds then auto-hide
- Add to `app/layout.tsx` so it appears on all pages
- The import route should gracefully show "Saved (enrichment pending — will retry when online)" when offline

### D6 — Inbox Virtual Scrolling
**Status**: `[ ]` Not started  
**Why**: `useSavedItems` loads ALL clips into memory and renders them all. At 200+ items this causes noticeable lag on mobile.  
**Files to change**: `app/inbox/page.tsx`, possibly new `hooks/useVirtualList.ts`  
**What to do**:
- Install `@tanstack/react-virtual` (`npm install @tanstack/react-virtual`)
- In the inbox page, replace the flat `items.map(...)` render with `useVirtualizer` from `@tanstack/react-virtual`
- Use `overscan: 5` to pre-render 5 items above/below the viewport
- The virtualizer needs a fixed item height estimate — use `estimateSize: () => 120` (InboxCard height)
- Preserve search filter: when search is active, filter the items array before passing to virtualizer

### D7 — App Icon + Splash Screen
**Status**: `[ ]` Not started  
**Why**: The app ships with the default Capacitor icon (gray square). App Store requires custom icons and a branded splash.  
**Files to change**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `capacitor.config.ts`, possibly `public/`  
**What to do**:
- Generate app icons using Python/Pillow: an indigo (#4f46e5) rounded square with a white ✈️ airplane icon centered. Generate all required iOS sizes: 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024 (App Store). Save to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Update `Contents.json` in that folder to reference the new files
- For the web splash: add a `<meta name="apple-mobile-web-app-capable">` and splash screen meta tags in `app/layout.tsx`
- Create a branded splash HTML canvas image at `public/splash.png` (1290x2796 for iPhone 14 Pro Max) — same indigo background + white airplane + "TravelPanel" wordmark

### D8 — iOS Keyboard & Input Polish
**Status**: `[ ]` Not started  
**Files**: `app/share/page.tsx`, `components/ImportSheet.tsx`, `components/CreateBoardModal.tsx`  
**What to do**:
- Add `inputMode="url"` to URL input fields (shows URL keyboard on iOS)
- Add `returnKeyType="done"` equivalent: `onKeyDown` handler that blurs on Enter for inputs in modals
- Prevent the keyboard from pushing the share page layout — add `interactive-widget: resizes-content` to the viewport meta tag in `app/layout.tsx`
- For text inputs in modals, add `autoCapitalize="none"` on URL fields and `autoCapitalize="words"` on board name fields
- Add `enterKeyHint="go"` on URL inputs and `enterKeyHint="done"` on search/name inputs

---

## PHASE E — App Store Readiness

### E1 — Privacy Policy + About Page
**Status**: `[ ]` Not started  
**Files**: new `app/privacy/page.tsx`, new `app/about/page.tsx`, `components/NavBar.tsx`  
**What to do**:
- Create `/privacy` page with a clear privacy policy: what data is stored (locally only, no cloud without Supabase key), what APIs are called (Anthropic for extraction, PostHog for analytics if key provided), no data sold to third parties
- Create `/about` page with: app version, GitHub link, feedback email (`jiangnan027@gmail.com`), attributions (MapLibre, OpenFreeMap, Anthropic)
- Add a subtle "About / Privacy" link to the bottom of the Collections page (below the board grid)

### E2 — App Store Metadata Package
**Status**: `[ ]` Not started  
**Files**: new `APP_STORE.md` (documentation only)  
**What to do**:
- Create `APP_STORE.md` with ready-to-paste App Store metadata:
  - App name: "TravelPanel — Travel Planner"
  - Subtitle (30 chars): "Clip. Organize. Plan. Go."
  - Description (4000 chars): full copy explaining the clip flow, substance extraction moat, and trip planner
  - Keywords (100 chars): travel planner, trip planner, travel inspiration, travel diary, itinerary maker
  - Support URL, Marketing URL placeholders
  - What's New (in-app purchases copy template)
  - 6 screenshot descriptions for App Store Connect

### E3 — Error Monitoring Integration (Sentry)
**Status**: `[ ]` Not started  
**Why**: PostHog tracks events but not JavaScript errors. Sentry catches unhandled exceptions with stack traces.  
**Files**: `app/layout.tsx`, `next.config.js`, new `lib/sentry.ts`  
**What to do**:
- Install `@sentry/nextjs` (`npm install @sentry/nextjs`)
- Run `npx @sentry/wizard -i nextjs` equivalent setup manually: add `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Create `lib/sentry.ts` with a `captureError(err, context)` wrapper that no-ops if `NEXT_PUBLIC_SENTRY_DSN` is missing
- Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local.example`
- Add the Sentry Webpack plugin to `next.config.js` (conditional on DSN being present)
- Wire `captureError` in the top-level error boundary in `app/layout.tsx`

---

## PHASE F — Growth & Engagement Features

### F1 — "Vibe Search" (Semantic Search Upgrade)
**Status**: `[ ]` Not started  
**Why**: Current search is keyword-only (matches title/description/tags). A user searching "minimalist cafe" won't find a clip tagged "coffee" unless those words appear in the text. Semantic search fixes this.  
**Approach**: Client-side embedding using `@xenova/transformers` (runs in-browser, no API needed)  
**Files**: new `lib/embeddings.ts`, `components/SearchBar.tsx`, `lib/db.ts`  
**What to do**:
- Install `@xenova/transformers` and use the `Xenova/all-MiniLM-L6-v2` model (runs entirely in-browser via WASM)
- Add an `embedding?: number[]` field to `SavedItem` in `lib/types.ts` and `lib/db.ts`
- Create `lib/embeddings.ts` with `embedText(text: string): Promise<number[]>` and `cosineSim(a, b)` — lazy-loads the model on first call
- After enrichment succeeds, generate an embedding for `title + description + tags + substance` and store it
- Update `SearchBar` to offer a toggle "Smart Search" mode: when active, embed the query and sort results by cosine similarity instead of substring match

### F2 — Trip Sharing (Social Export)
**Status**: `[ ]` Not started  
**Why**: Users want to share trip plans, not just boards. A shareable trip plan URL (or PDF social card) drives organic growth.  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/exportPlan.ts`, new `app/trip/page.tsx`  
**What to do**:
- Add a "Share plan" button to the plan view (next to the existing Export button)
- Encode the trip plan as a URL-safe payload (similar to C3 board sharing) at `/trip?p=[token]`
- The `/trip` read-only view shows: overview, day-by-day itinerary, sourced tips with clip attribution, a small map
- On iOS, the Share button uses `navigator.share` with the URL and a preview image (generate a canvas preview showing day count, location names, board emoji)

---

## Blocked Tasks

### B4 — Embedding/Vibe Search (Supabase pgvector)
**Status**: `[ ]` Blocked on Supabase keys  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Note**: F1 above implements an alternative client-side embedding approach that doesn't need Supabase

---

## Completed Tasks

*(All Phase A, most Phase B, all Phase C tasks are done. See git log for implementation details.)*

### Phase A — Bug-Free MVP ✅
A1 Substance Extraction, A2 Enrichment Retry Queue, A3 PostHog Analytics, A4 AI Cost Guard, A5 Resource Banner, A6 Pin Clustering, A7 Full-Text Search, A8 Onboarding Seed Boards, A9 Plan Export, A10 Multi-Version Plans, A11 Substance in Detail Card, A12 Substance in Trip Plans

### Phase B — Cloud Sync + Auth (partial)
B1 Supabase (scaffolded/dormant), B2 Browser Extension ✅, B3 Xiaohongshu Vision Fix ✅, B5 Cloud Backup Export ✅

### Phase C — On-Trip Mode ✅
C1 GPS Mode, C2 Post-Trip Timeline, C3 Shared Boards v1, C4 Proactive Resurfacing
