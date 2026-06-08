# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## Current Status (as of 2026-06-08)

All Phase A–C tasks complete. The app has:
- ✅ 2-layer extraction (spots + substance) with Claude Vision support for Xiaohongshu
- ✅ Trip planner with substance-cited itineraries, PDF/ICS export, multi-version plans
- ✅ GPS trip mode with auto-visit logging and timeline
- ✅ Board sharing (URL + .tpboard file), cloud backup export
- ✅ Browser extension (Chrome MV3), proactive resurfacing banner
- ✅ PostHog analytics, cost guard, enrichment retry queue, onboarding seed boards
- 🔲 Supabase auth/sync scaffolded — dormant until keys provided
- 🔲 B4 (Embedding/Vibe Search) — blocked on Supabase pgvector

**North Star**: Weekly clips per active user — proxy for habit formation.

---

## ⭐ Recommended Execution Order

`D1 → D2 → D3 → E1 → E2 → F1 → F2 → G1 → G2 → G3 → H1 → H2`

---

## PHASE D — iOS Native Excellence (Make it feel like a real iOS app)

### D1 — Haptic Feedback
**Status**: `[x]` Done
**Why**: The app has no haptic feedback anywhere. On iOS, haptics are the difference between "web app" and "native app" feel. Every key action needs haptics.
**Files to change**: `package.json`, new `lib/haptics.ts`, `app/share/page.tsx`, `app/page.tsx`, `app/plan/[boardId]/page.tsx`, `components/NavBar.tsx`
**What to do**:
- Install `@capacitor/haptics` (already in Capacitor ecosystem, just needs install)
- Create `lib/haptics.ts`:
  ```ts
  import { Capacitor } from '@capacitor/core';
  export async function hapticSuccess() { /* Haptics.notification({ type: NotificationType.Success }) */ }
  export async function hapticMedium() { /* Haptics.impact({ style: ImpactStyle.Medium }) */ }
  export async function hapticLight() { /* Haptics.impact({ style: ImpactStyle.Light }) */ }
  export async function hapticWarning() { /* Haptics.notification({ type: NotificationType.Warning }) */ }
  ```
  All functions no-op gracefully on web (check `Capacitor.isNativePlatform()`)
- Wire haptics:
  - `hapticSuccess()` on clip save complete in `app/share/page.tsx`
  - `hapticMedium()` on plan generation complete in plan page
  - `hapticLight()` on nav tab tap in `components/NavBar.tsx`
  - `hapticLight()` on board create and item delete confirmations
  - `hapticWarning()` on enrichment failure shown to user
- Run `npm install @capacitor/haptics && npx cap sync ios`

### D2 — Local Proximity Notifications
**Status**: `[ ]` Not started
**Why**: Users enable GPS trip mode but there's no notification when approaching a saved place. This is the killer feature of on-trip mode — a tap-on-shoulder "you're 150m from that ramen spot you saved in February."
**Files to change**: `package.json`, `components/CapacitorBridge.tsx`, `app/page.tsx`
**What to do**:
- Install `@capacitor/local-notifications`
- In `CapacitorBridge.tsx`, on mount, call `LocalNotifications.requestPermissions()` (only once — check `localStorage.getItem('notifPermAsked')`)
- In `app/page.tsx`, modify `handleUserLocation`:
  - When an item is within 200m AND its nearest location hasn't been notified in the last 4 hours (track in `sessionStorage` with key `notified-${itemId}-${locationName}`)
  - Schedule a local notification: title `📍 ${item.title}`, body `${formatDistance(distKm)} away · ${item.substance[0]?.content ?? 'Tap to see tips'}`
  - On notification tap, deep-link to `/?flyTo=${lat},${lng}&itemId=${item.id}`
- Run `npm install @capacitor/local-notifications && npx cap sync ios`
- **iOS requires**: add `NSLocationWhenInUseUsageDescription` to Info.plist if not present (check first)

### D3 — Offline Mode Banner + Operation Queue
**Status**: `[ ]` Not started
**Why**: The app silently breaks offline (enrichment API fails, no user feedback). Users need to know they're offline, and clips saved offline should auto-enrich when reconnected.
**Files to change**: new `hooks/useNetworkStatus.ts`, new `components/OfflineBanner.tsx`, `app/layout.tsx` or `app/share/page.tsx`, `lib/enrichItem.ts`
**What to do**:
- Create `hooks/useNetworkStatus.ts`:
  ```ts
  export function useNetworkStatus() {
    const [online, setOnline] = useState(navigator.onLine);
    useEffect(() => {
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
      return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);
    return online;
  }
  ```
- Create `components/OfflineBanner.tsx`: amber bar at the top of the screen, text "You're offline — saved clips will enrich when you reconnect", only shows when `!online`
- In `app/share/page.tsx`, if `!navigator.onLine` when user submits URL, save the clip with `enrichmentStatus: 'pending'` and skip the enrichment call; show toast "Clip saved — will extract info when back online"
- In `components/CapacitorBridge.tsx` (or a new effect in layout), listen to `window.addEventListener('online', ...)` and trigger the existing retry queue when reconnected
- Mount `OfflineBanner` in `app/layout.tsx` below the children

### D4 — Pull-to-Refresh on Inbox and Boards
**Status**: `[ ]` Not started
**Why**: On iOS, pull-to-refresh is a fundamental UX pattern. Without it, users don't know how to refresh stale data. Also useful to trigger the enrichment retry queue manually.
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`, new `components/PullToRefresh.tsx`
**What to do**:
- Create `components/PullToRefresh.tsx`: a wrapper that detects touch drag-down gesture, shows a spinner, and calls a provided `onRefresh()` callback. Use CSS `transform` for the pull animation. No library — keep it 80 lines.
  - Track `touchStart`, `touchMove` delta; trigger at 70px pull distance
  - Show `RefreshCw` (lucide) spinner while refreshing
  - Resolves after `onRefresh()` promise settles
- Wrap the scrollable content area in Inbox page with `<PullToRefresh onRefresh={async () => { router.refresh(); await new Promise(r => setTimeout(r, 600)); }}>` 
- Same pattern in Boards page
- **Note**: Must account for the existing `overflow-y-auto` container — PullToRefresh detects scroll position = 0 before activating

### D5 — Swipeable Onboarding Intro (First Run)
**Status**: `[ ]` Not started
**Why**: New users land on an empty map with no context. The current `OnboardingSeed` banner is functional but not delightful. A 3-screen intro explains the value prop before showing the app.
**Files to change**: new `components/OnboardingIntro.tsx`, `app/page.tsx` or `app/layout.tsx`
**What to do**:
- Create `components/OnboardingIntro.tsx`: full-screen overlay (fixed inset-0 z-[9999]) shown only if `!localStorage.getItem('onboardingDone')`
- Three slides, swipeable horizontally (use CSS scroll snapping, no library):
  1. **"Save anywhere"** — phone emoji + text "Share any travel post from Instagram, YouTube, or Xiaohongshu — TravelPanel extracts locations and tips automatically."
  2. **"Remember the wisdom"** — brain emoji + "We don't just save pins. We extract the actual tips: best time to visit, what to avoid, insider recommendations."
  3. **"Plan in seconds"** — rocket emoji + "Turn your saved clips into a day-by-day AI itinerary that cites your own sources."
- Bottom: dot indicators, "Next →" button, "Skip" link on first two screens, "Get started" on last screen
- On "Get started", set `localStorage.setItem('onboardingDone', '1')` and dismiss
- Use `framer-motion` `AnimatePresence` for slide transitions if already imported; otherwise CSS
- Show BEFORE `OnboardingSeed` runs (check `onboardingDone` not set)

---

## PHASE E — Platform Expansion (More clip sources = more weekly clips)

### E1 — Instagram + YouTube Support
**Status**: `[ ]` Not started
**Why**: Instagram and YouTube are the #1 and #2 sources of travel inspiration for the target audience, yet they're not explicitly detected. Currently they fall through as `'other'` with no branded badge. Adding them unlocks the browser extension's full value for English-speaking users.
**Files to change**: `lib/types.ts`, `lib/parse-url.ts`, `app/inbox/page.tsx`, `browser-extension/popup.js`, `app/api/import/route.ts`
**What to do**:
- In `lib/types.ts`, add `'instagram' | 'youtube'` to the `Platform` union type
- In `lib/parse-url.ts`:
  - Detect `instagram.com` (posts: `/p/`, `/reel/`, profiles) → `'instagram'`
  - Detect `youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/` → `'youtube'`
  - Add to `PLATFORM_LABELS`: `instagram: 'Instagram'`, `youtube: 'YouTube'`
  - Add colors to `PLATFORM_COLORS` if that map exists; otherwise add it (instagram: `#E1306C`, youtube: `#FF0000`)
- In `app/inbox/page.tsx`, add Instagram and YouTube to `PLATFORM_FILTERS` array
- In `browser-extension/popup.js`, add Instagram and YouTube to the platform detection list with their brand colors
- In `app/api/import/route.ts`, update the Claude extraction prompt to handle Instagram and YouTube specifically:
  - Instagram: extract location tags, caption tips, place mentions, "@" tagged locations
  - YouTube: extract place names from title/description, timestamps mentioning locations, spoken tips
- Test: create a seed demo clip for each platform in `lib/seedData.ts` (or verify existing ones cover it)

### E2 — Smart Trip Suggestion CTA
**Status**: `[ ]` Not started
**Why**: Users save 5+ clips to a board but don't realize they have enough to generate a trip. A proactive "You're ready to plan!" nudge converts passive savers into active planners — directly improving the North Star metric.
**Files to change**: `app/boards/[id]/page.tsx`
**What to do**:
- When `boardItems.length >= 5` AND no existing plan versions exist for this board (check `localStorage.getItem(`plans-${boardId}`)` or query the trips store) AND user hasn't dismissed the nudge today (`localStorage.getItem(`tripNudgeDismissed-${boardId}-${date}`)`)
- Show a dismissible banner above the items grid (below the Plan button):
  ```
  ✨ You have 5 saved places — enough for a great trip!
  [Generate itinerary →]   [×]
  ```
  - Banner: indigo gradient background, Sparkles icon
  - Clicking "Generate itinerary →" navigates to `/plan/${boardId}`
  - Clicking × sets `localStorage.setItem(`tripNudgeDismissed-${boardId}-${date}`, '1')` and hides for the day
- Detect the dominant city from `boardItems[].locations[].name` (most common city substring) and use it in the copy: "You have 5 places saved in Tokyo…"
- Keep it to 30 lines total — no new component file needed, inline in board detail page

### E3 — Trip Plan Share-as-Image
**Status**: `[ ]` Not started
**Why**: The trip plan is valuable content but can only be exported as PDF or ICS. A one-tap "share as image" for Instagram/WeChat stories is the viral loop — other users see it and ask "how did you make this?"
**Files to change**: `app/plan/[boardId]/page.tsx`, new `lib/exportImage.ts`
**What to do**:
- Install `html2canvas` (lightweight, 60KB)
- Create `lib/exportImage.ts` with `exportPlanAsImage(plan: TripPlan, boardName: string): Promise<Blob>`:
  - Creates an off-screen `<div>` (1080×1920px) with inline styles (no Tailwind — html2canvas struggles with it)
  - Layout: gradient background (#4F46E5 → #7C3AED), large destination name, trip dates, days listed with top activities (2 per day), "Made with TravelPanel" watermark at bottom
  - Calls `html2canvas(div, { scale: 1, useCORS: true, logging: false })` → `canvas.toBlob()`
  - Cleans up the temp div
- In plan page, add "Share as image" button next to PDF/ICS export buttons (Camera icon)
- On click: show a loading spinner, call `exportPlanAsImage()`, then use the Web Share API (`navigator.share({ files: [file] })`) if available, else trigger download
- Gracefully degrade: if `navigator.share` is not available, just download the PNG

---

## PHASE F — Intelligence & Search

### F1 — Vibe Search (Client-Side, No Server Needed)
**Status**: `[ ]` Not started
**Why**: B4 (embedding search) was blocked on Supabase pgvector. But we can build a lightweight client-side version using the Claude API to generate embeddings on-demand and cosine similarity in-browser. Works offline after first generation. No pgvector needed.
**Files to change**: new `lib/vectorSearch.ts`, `app/api/embed/route.ts`, `app/inbox/page.tsx` or new `components/VibeSearch.tsx`
**What to do**:
- Create `app/api/embed/route.ts`: POST `{ texts: string[] }` → calls `anthropic.embeddings.create()` (if Anthropic adds embeddings API) OR use a free alternative: `openai.embeddings.create({ model: 'text-embedding-3-small', input: texts })` (fallback: use a simple TF-IDF approach without any API)
  - **Pragmatic fallback**: Use Transformers.js (`@xenova/transformers`) with `all-MiniLM-L6-v2` running fully in-browser (WASM). No API key needed.
- Create `lib/vectorSearch.ts`:
  - `generateEmbedding(text: string): Promise<number[]>` — calls the embed route or Transformers.js
  - `cosineSimilarity(a: number[], b: number[]): number`
  - `vibeSearch(query: string, items: SavedItem[]): SavedItem[]` — embeds query, compares against cached item embeddings (stored in IndexedDB `embeddings` store as `{ id, vector }`)
  - Cache embeddings: only regenerate for items that don't have one yet
- Add a "Vibe search" mode toggle to `SearchBar.tsx`: when active, label changes to "Search by vibe…" and debounced query uses `vibeSearch` instead of `searchItems`
- Example queries that should work: "hidden cafes with local vibe", "scenic mountain hikes", "cheap street food"
- **Note**: Transformers.js first load is ~25MB WASM — lazy-import behind the toggle to avoid blocking initial load

### F2 — Clip Deduplication Warning
**Status**: `[ ]` Not started
**Why**: Users frequently save the same spot from different posts. Duplicates clutter the map and confuse the trip planner. A simple similarity check prevents this.
**Files to change**: `app/share/page.tsx`, new `lib/deduplicate.ts`
**What to do**:
- Create `lib/deduplicate.ts`:
  - `findSimilarItems(newItem: Partial<SavedItem>, existing: SavedItem[]): SavedItem | null`
  - Check 1: exact URL match → definite duplicate
  - Check 2: if any location in `newItem.locations` is within 50m of a location in an existing item with the same platform → likely duplicate
  - Check 3: Levenshtein distance < 0.2 on titles (normalized) → probable duplicate
  - Return the most similar existing item, or null
- In `app/share/page.tsx`, after enrichment completes, call `findSimilarItems` against all existing items
- If a duplicate is found, show a bottom sheet: "Looks like you already have this saved" with thumbnail of existing clip, two buttons: "Keep both" and "Open existing"
- "Keep both" proceeds normally; "Open existing" discards the new clip and navigates to the map with the existing item highlighted

---

## PHASE G — Auth, Sync & Social

### G1 — Sign-In UI (Activates Supabase Scaffolding)
**Status**: `[ ]` Not started
**Why**: `lib/supabase.ts` and `lib/cloudSync.ts` are fully scaffolded but dormant. The missing piece is a sign-in surface. Once a user logs in, data is safe and sync activates automatically.
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
**Files to change**: `app/settings/page.tsx`, new `components/SignInSheet.tsx`, `lib/cloudSync.ts`
**What to do**:
- Create `components/SignInSheet.tsx`: bottom sheet with:
  - Magic link input (email → `supabase.auth.signInWithOtp({ email })`)
  - "Continue with Google" button (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
  - Dismissible via backdrop tap
- In `app/settings/page.tsx`:
  - If `cloudEnabled` is false: show a "Sign in required" notice with a link to add Supabase keys
  - If `cloudEnabled` is true AND not signed in: show "Sync to cloud" section with a "Sign in" button that opens `SignInSheet`
  - If signed in: show avatar + email + "Signed in as X", "Sign out" button, and "Sync now" button that calls `syncNow()`
- In `lib/cloudSync.ts`, wire `syncNow()` to be called:
  - On `supabase.auth.onAuthStateChange` when event is `'SIGNED_IN'`
  - On app focus (`document.addEventListener('visibilitychange')` when `document.visibilityState === 'visible'`)
- Keep it graceful: if `cloudEnabled` is false, all the above is hidden and the settings page shows the "Local only" notice it currently shows

### G2 — Public Trip Showcase Page
**Status**: `[ ]` Not started
**Why**: The current share flow requires the recipient to import the board into their own TravelPanel. A public read-only view at `/s/[id]` lets anyone see the trip without installing the app — a viral discovery surface.
**Files to change**: new `app/s/[boardId]/page.tsx`, `app/boards/[id]/page.tsx`
**What to do**:
- Create `app/s/[boardId]/page.tsx`: a server-renderable (or static) page that:
  - Reads the board payload from the URL `?data=` param (same base64 encoding used by existing share links)
  - Shows: board name + emoji, map with all pins (read-only MapView), list of clips with thumbnails + substance counts
  - CTA: "Save to TravelPanel →" button that navigates to `/boards/import?data=...`
  - Works without JavaScript (SSR) for SEO + social preview cards
  - OG meta tags: `og:title = "${board.name} — TravelPanel"`, `og:description = "${clips.length} saved places"`
- In `app/boards/[id]/page.tsx`, update `encodeShareLink` to use `/s/` path instead of `/boards/import` for the shareable URL
- The existing `/boards/import?data=` path still works as a direct import link

### G3 — Privacy Policy + App Store Metadata
**Status**: `[ ]` Not started
**Why**: Required for App Store submission. Apple rejects apps without a privacy policy URL. Also improves trust signals for new users.
**Files to change**: new `app/privacy/page.tsx`, `app/layout.tsx`
**What to do**:
- Create `app/privacy/page.tsx`: a clean, minimal privacy policy page covering:
  - Data stored locally on device (IndexedDB)
  - Data sent to Anthropic API (URL content for extraction — no PII)
  - Optional cloud sync via Supabase (user's own data, user-controlled)
  - No sale of data, no third-party ad tracking
  - Contact email: jiangnan027@gmail.com
  - Last updated: today's date
- Add `<link rel="canonical" ...>` and basic OG tags to `app/layout.tsx` if not present
- Add a footer link to `/privacy` in `app/settings/page.tsx`
- Add `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` meta tags to layout if not present

---

## PHASE H — Performance & Polish

### H1 — Image Lazy Loading + Thumbnail Optimization
**Status**: `[ ]` Not started
**Why**: The inbox and boards pages render all clip thumbnails at once. With 50+ clips, this causes layout jank and excessive network requests on mobile.
**Files to change**: `components/InboxCard.tsx`, `components/BoardCard.tsx`, `components/ResurfaceBanner.tsx`
**What to do**:
- Add `loading="lazy"` to all `<img>` tags in InboxCard, BoardCard, ResurfaceBanner
- Add `decoding="async"` to the same images
- Add a blurred placeholder: before the img loads, show the card's dominant color (derive from tags: food=orange, nature=green, etc.) with a subtle shimmer animation
- Use `onError` handler on all images: if thumbnail fails to load, fall back to the emoji placeholder div that already exists in each card
- In `components/InboxCard.tsx`, wrap the thumbnail in a `relative` container with `aspect-video` to prevent layout shift

### H2 — Animated Tab Transitions
**Status**: `[ ]` Not started  
**Why**: Navigating between tabs currently has an instant cut. On iOS, page transitions are a core part of the premium feel. Even a simple 150ms fade-slide makes the app feel 10x more native.
**Files to change**: `app/layout.tsx`, possibly a new `components/PageTransition.tsx`
**What to do**:
- Create `components/PageTransition.tsx` using `framer-motion`:
  ```tsx
  export function PageTransition({ children }: { children: React.ReactNode }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    );
  }
  ```
- Wrap each page's root element with `<PageTransition>` in: `app/page.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/settings/page.tsx`
- Use `AnimatePresence` with `mode="wait"` in `app/layout.tsx` wrapping `{children}` (requires passing `pathname` as key to trigger re-animation on route change — use `usePathname()`)
- Keep transitions under 200ms so they feel snappy, not sluggish

---

## PHASE B (Remaining)

### B4 — Embedding/Vibe Search (Server-Side)
**Status**: `[ ]` Blocked  
**Needs**: Supabase pgvector (from B1) — keys must be provided  
**What to do**: Once Supabase is active, upgrade F1's client-side vibe search to use pgvector for persistent, cross-device semantic search. Embed all existing clips on migration. Enable semantic search across all clips, not just in-memory ones.

---

## Completed Tasks

### Phase A (all done)
A1 Substance Extraction · A2 Enrichment Retry · A3 PostHog Analytics · A4 AI Cost Guard · A5 Resource Notifications · A6 Pin Clustering · A7 Full-Text Search · A8 Onboarding Seed Boards · A9 Plan Export (PDF+ICS) · A10 Multi-Version Plans · A11 Wisdom View · A12 Substance-Cited Plans

### Phase B (mostly done)
B1 Supabase Scaffolding (dormant) · B2 Browser Extension · B3 Xiaohongshu Vision Fix · B5 Cloud Backup Export

### Phase C (all done)
C1 On-Trip GPS Mode · C2 Post-Trip Timeline · C3 Shared Boards · C4 Proactive Resurfacing
