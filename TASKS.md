# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Project status (as of 2026-06-07)

All Phase A–C tasks are complete. Phase B4 is blocked on Supabase credentials.
The app can clip, enrich (with vision for Xiaohongshu), plan, export, share, and
show nearby clips via GPS. The web layer is solid.

The **next horizon** is making this feel like a world-class native iOS app:
fast, polished, delightful haptics, dark mode, a great onboarding, and production
readiness (analytics working, rate limits visible, error tracking active).

---

## ⭐ Recommended Execution Order (Phase D–F)

`D1 → D2 → D3 → D4 → D5 → D6 → E1 → E2 → E3 → F1 → F2 → F3`

---

## PHASE D — iOS Polish & Native Feel

### D1 — Dark Mode
**Status**: `[ ]` Not started
**Files**: `app/layout.tsx`, `tailwind.config.js`, all pages and components
**What to do**:
- Add `dark:` variant classes to every major surface (bg, text, border, shadow)
- Update `tailwind.config.js` with `darkMode: 'class'`
- Detect system preference via `prefers-color-scheme` media query in layout
- Store user override in `localStorage` (dark / light / system)
- Add a theme toggle button to `app/settings/page.tsx`
- Ensure the map popup and marker labels remain readable in dark mode
- Test: Settings → Dark → all pages look correct; back to System follows OS

### D2 — Haptic Feedback (iOS)
**Status**: `[ ]` Not started
**Files**: `components/MapView.tsx`, `app/share/page.tsx`, `components/NearbyPanel.tsx`, new `lib/haptics.ts`
**What to do**:
- Create `lib/haptics.ts` with a `haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error')` helper
- Use Capacitor Haptics plugin (`@capacitor/haptics`) under the hood; no-op in browser
- Add `haptic('medium')` on: pin tap on map, Quick Clip saved, board created
- Add `haptic('success')` on: enrichment complete, plan generated, export done, share link copied
- Add `haptic('warning')` on: rate limit hit, enrichment failed
- Add `haptic('light')` on: filter tab switch, search start, panel open/close
- Install: `npm install @capacitor/haptics` and sync Capacitor

### D3 — Onboarding Walkthrough
**Status**: `[ ]` Not started
**Files**: new `components/OnboardingWalkthrough.tsx`, `app/layout.tsx` or `app/page.tsx`
**What to do**:
- Create a 4-step modal walkthrough shown only on first launch (gate with `tp_onboarding_done` localStorage flag)
- Step 1: "Welcome to TravelPanel" — hero illustration (SVG travel doodle), brief value prop
- Step 2: "Clip from anywhere" — show the Share Sheet icon, explain iOS Share button → TravelPanel flow; show browser extension option for desktop
- Step 3: "AI extracts the wisdom" — show a sample clip card with locations + substance items highlighted
- Step 4: "Plan your trip" — show the plan view with sourced itinerary, CTA "Let's go"
- Dismissable at any step; "Skip" link bottom-left, "Next →" button bottom-right
- Respects dark mode; uses framer-motion for smooth step transitions
- Each step has a visual illustration built from inline SVG or a styled div (no external images)

### D4 — Pull-to-Refresh on Inbox and Boards
**Status**: `[ ]` Not started
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, new `components/PullToRefresh.tsx`
**What to do**:
- Implement a pull-to-refresh gesture on the scroll containers in inbox and boards
- On release: re-run the enrichment retry queue (check for `pending`/`failed` items) and reload boards
- Show a subtle spinner at the top of the list while refreshing
- Works on both mobile web and within the Capacitor native shell
- Implementation: use `touchstart`/`touchmove`/`touchend` events on the scroll container; threshold 60px of overscroll

### D5 — Swipe-to-Delete on Inbox Cards
**Status**: `[ ]` Not started
**Files**: `components/InboxCard.tsx`
**What to do**:
- Add left swipe gesture to `InboxCard` revealing a red trash icon behind it
- Swipe past 80% of card width confirms delete (with a short haptic); partial swipe snaps back
- Implementation: use framer-motion's `drag` constraint on the x axis; background layer with Trash2 icon
- Show an undo toast for 3 seconds after delete (restore item to IndexedDB if tapped)
- On iOS Capacitor, the gesture should not conflict with the system back-swipe (only activate if swipe starts in the card centre, not the left 20px edge)

### D6 — Empty State Illustrations
**Status**: `[ ]` Not started
**Files**: new `components/EmptyState.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/timeline/page.tsx`
**What to do**:
- Create a reusable `EmptyState` component with: inline SVG illustration, title, subtitle, optional CTA button
- Design 4 SVG illustrations (simple, monochrome, travel-themed):
  - `inbox-empty`: a clipboard with a compass icon
  - `no-search-results`: a magnifying glass with a question mark
  - `no-boards`: a folded map
  - `no-timeline`: a calendar with a pin
- Replace plain text empty states in inbox, boards, timeline with the illustrated component
- SVGs should animate in (fade + slight upward float) using framer-motion
- Respects dark mode (stroke color flips via CSS variable)

---

## PHASE E — Monetization & Growth

### E1 — Pro Paywall UI (no payments yet)
**Status**: `[ ]` Not started
**Files**: new `components/ProGate.tsx`, `app/settings/page.tsx`, `app/api/plan/route.ts`
**What to do**:
- Create `components/ProGate.tsx`: a bottom sheet modal that fires when a Pro feature is hit
- Shows: "You've used X of 5 free plans this month" with a progress bar
- CTA: "Upgrade to Pro — unlimited plans, cloud sync, priority AI" (no Stripe yet; "Join waitlist" button)
- "Join waitlist" sends a POST to `/api/notify/route.ts` to email jiangnan027@gmail.com with the user's session timestamp
- Integrate into `app/api/plan/route.ts` to block after 5 plans/month (already rate-limited; just surface the ProGate UI on the client plan page)
- Also gate: plan PDF export (jspdf) behind "Pro — coming soon" tooltip

### E2 — Referral Share Card
**Status**: `[ ]` Not started
**Files**: new `app/refer/page.tsx`, `app/settings/page.tsx`
**What to do**:
- Create `/refer` page: a beautiful "share card" users can share to invite friends
- Card shows: TravelPanel logo, "I use TravelPanel to plan smarter trips", referral URL (`https://travelpanel.app?ref=<userId>`)
- `<userId>` is a stable hash of a random UUID stored in localStorage (`tp_user_id`)
- Three share options: Copy link, Share (Web Share API), Download as PNG (use html2canvas or CSS-based screenshot)
- Track referral opens: when `?ref=<userId>` is present on first visit, store in localStorage and POST to `/api/notify` 
- Add "Invite friends" link in Settings page

### E3 — App Store Screenshot Generator
**Status**: `[ ]` Not started
**Files**: new `app/screenshots/page.tsx`
**What to do**:
- Create a hidden page at `/screenshots` (not in NavBar) for generating App Store screenshots
- Shows 5 iPhone-frame mockups (375×812px, iPhone 14 Pro proportions) displaying key screens:
  1. Map view with pins and one open detail card
  2. Clip detail with substance/wisdom section
  3. Plan view with sourced itinerary and map
  4. Nearby GPS mode with the sliding panel
  5. Share page (import from another user)
- Use real seed data (the Tokyo seed board) for consistency
- Each mockup has a caption bar above (white/dark background, App Store style)
- Page is print-optimised (`@media print`) so `Cmd+P → Save as PDF` gives ready screenshots
- Add a "Download All" button that triggers print

---

## PHASE F — Scale & Performance

### F1 — IndexedDB Query Optimisation
**Status**: `[ ]` Not started
**Files**: `lib/db.ts`, `hooks/useSavedItems.ts`
**What to do**:
- Profile the time to load 500+ items (measure with `console.time`)
- Add pagination to `useSavedItems`: load first 50 items on mount, load more on scroll (virtual list or "Load more" button)
- Use IndexedDB cursor with `by-date` index to load in reverse-chronological order without loading all items into memory
- Add a `totalCount` to the hook so the UI shows "42 / 200 clips" without loading all
- Ensure search still works across all items (use a separate all-items query only when query is non-empty)

### F2 — Image Lazy Loading & WebP
**Status**: `[ ]` Not started
**Files**: `components/InboxCard.tsx`, `components/NearbyPanel.tsx`, `components/LocationDetailCard.tsx`, `app/shared/page.tsx`
**What to do**:
- Add `loading="lazy"` and `decoding="async"` to all `<img>` tags
- Add `onError` fallback to every thumbnail `<img>` that shows a platform-colored placeholder div
- Add a skeleton shimmer (animated gray gradient) while images are loading (use a `useState` on each img)
- Lazy-load the MapView component with a skeleton placeholder (already uses `dynamic`, ensure fallback looks good)
- Optimize thumbnail URLs: if the URL contains `?` (query string), append `&w=400` for potential resizing CDN headers

### F3 — CI/CD Setup (GitHub Actions)
**Status**: `[ ]` Not started
**Files**: new `.github/workflows/ci.yml`
**What to do**:
- Create a GitHub Actions workflow that runs on every push to `main` and every PR
- Steps: checkout → install (`npm ci`) → type-check (`npx tsc --noEmit` via next build) → lint (`npm run lint`)
- Cache: `node_modules` via `actions/cache` with `package-lock.json` as key
- The workflow must NOT run the full `next build` (requires API keys); only type-check and lint
- Add a build status badge to the README
- Target: < 90 second CI run

---

## PHASE B (remaining)

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Blocked — needs Supabase pgvector (from B1)
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")
**Unblock**: Once Supabase keys are provided, activate B1, create the `embeddings` table in Supabase,
embed on clip save, and wire the search bar to vector similarity query.

---

## Completed Tasks

*(Claude marks tasks [x] and moves summaries here when done)*

### Phase A — All complete ✅
A1 Substance Extraction · A2 Enrichment Retry · A3 PostHog Analytics · A4 AI Cost Guard ·
A5 Resource Request Notifications · A6 Pin Clustering · A7 Full-Text Search ·
A8 Onboarding Seed Boards · A9 Plan Export · A10 Multi-Version Plans ·
A11 Substance in Clip Detail · A12 Substance in Trip Plans

### Phase B — Mostly complete
B1 Supabase Scaffold [~] · B2 Browser Extension [x] · B3 Xiaohongshu Vision [x] ·
B4 Embedding Search [ ] BLOCKED · B5 Cloud Backup Export [x]

### Phase C — All complete ✅
C1 GPS Trip Mode · C2 Journey Timeline · C3 Shared Boards v1 · C4 Proactive Resurfacing
