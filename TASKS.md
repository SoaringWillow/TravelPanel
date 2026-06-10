# TravelPanel — Task Queue v2

> **Ultimate Goal**: Beautiful, fully functional iOS app — travel inspiration clipper + AI trip planner that feels premium, native, and delightful on iPhone.
>
> All Phase A tasks are complete (as of 2026-06-10). This queue focuses on iOS-native polish, visual excellence, and full-stack functionality to reach App Store quality.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases unless explicitly noted.

---

## ⭐ Execution Order

`D1 → D2 → D3 → D4 → E1 → E2 → E3 → E4 → E5 → F1 → F2 → F3 → F4 → G1 → G2 → G3 → G4 → H1 → H2 → H3 → H4 → I1 → I2 → I3 → I4 → I5`

---

## PHASE D — iOS Native Experience

### D1 — Skeleton Loading Screens
**Status**: `[x]` Done
**Why**: The current loading states use spinners — unprofessional on mobile. Skeleton screens show the shape of content while loading, reducing perceived wait time.
**Files changed**: `components/ui/skeleton.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`
**What was done**:
- Created reusable `Skeleton` component with animated shimmer (`animate-pulse`)
- Added `InboxCardSkeleton` and `BoardCardSkeleton` exported from skeleton.tsx
- Replaced the spinner in Inbox and Boards page with 4-card skeleton grids that match actual content shape

### D2 — Pull-to-Refresh in Inbox + Boards
**Status**: `[ ]` Not started
**Why**: iOS users expect pull-to-refresh. Currently there's no way to force-refresh — new shares from the Share Extension may not appear until a full reload.
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `hooks/useSavedItems.ts`, `hooks/useBoards.ts`
**What to do**:
- Add a pull-to-refresh gesture handler using touch events (`touchstart`, `touchmove`, `touchend`)
- Show a spinner/refresh indicator when pulled > 60px down from the top of the scroll container
- On release, call the existing `refresh()` functions from `useSavedItems` and `useBoards`
- Animate the spinner rotation to track pull distance (not just snap-to-refresh)
- On refresh completion, also call `resetStuck()` from `useEnrichmentRetry` to reset items stuck in `processing` > 5 min
- Works in both PWA and Capacitor (no native plugin needed — pure touch events)
- Add a `usePullToRefresh(containerRef, onRefresh)` hook in `hooks/usePullToRefresh.ts` so both pages share the same logic

### D3 — Safe Area + Viewport Polish
**Status**: `[ ]` Not started
**Why**: On iPhone (notch/Dynamic Island), content bleeds into unsafe areas. The bottom nav overlaps content on home-indicator devices.
**Files to change**: `components/NavBar.tsx`, `app/globals.css`, `app/layout.tsx`
**What to do**:
- Add `viewport-fit=cover` to the `<meta name="viewport">` tag in `app/layout.tsx`
- In `app/globals.css`, define CSS variables:
  ```css
  :root {
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }
  ```
- Update `NavBar.tsx`: add `padding-bottom: calc(0.75rem + var(--safe-bottom))` to the nav container
- Update all page headers (Inbox, Boards, Plan) to add `padding-top: calc(3rem + var(--safe-top))` instead of the fixed `pt-12`
- Update `app/page.tsx` (map view) to ensure the FAB and header don't overlap the notch area
- Ensure plan view and full-screen map also respect safe areas
- Test the computed value renders correctly by checking CSS variables in the browser inspector

### D4 — Haptic Feedback on Key Actions
**Status**: `[ ]` Not started
**Why**: Native apps feel more alive with haptics. Small change, outsized perceived-quality impact on iPhone.
**Files to change**: `app/share/page.tsx`, `components/ImportSheet.tsx`, `app/inbox/page.tsx`, new `lib/haptics.ts`
**What to do**:
- Install `@capacitor/haptics`: run `npm install @capacitor/haptics` and add to `ios/App/App/package.json` via `npx cap sync`
- Create `lib/haptics.ts`: thin wrapper that no-ops in browser context:
  ```ts
  const isCapacitor = () => typeof window !== 'undefined' && !!(window as any).Capacitor;
  export async function hapticLight() { if (isCapacitor()) { const { Haptics, ImpactStyle } = await import('@capacitor/haptics'); await Haptics.impact({ style: ImpactStyle.Light }); } }
  export async function hapticSuccess() { if (isCapacitor()) { const { Haptics } = await import('@capacitor/haptics'); await Haptics.notification({ type: 'SUCCESS' }); } }
  export async function hapticError() { if (isCapacitor()) { const { Haptics } = await import('@capacitor/haptics'); await Haptics.notification({ type: 'ERROR' }); } }
  ```
- Fire `hapticSuccess()` when a clip is saved in `app/share/page.tsx` (on board selection → save)
- Fire `hapticLight()` on delete confirmation dialogs (before the destructive action)
- Fire `hapticError()` when enrichment fails and the error state is shown
- Fire `hapticSuccess()` when plan generation step `done` is received

### D5 — App Launch Performance (Bundle Optimization)
**Status**: `[ ]` Not started
**Why**: Capacitor serves the static `out/` directory. Heavy bundles slow cold start — critical for App Store quality.
**Files to change**: `next.config.js`, `app/layout.tsx`, components that import heavy libraries
**What to do**:
- Lazy-load heavy imports using Next.js dynamic import:
  - `MapView` in `app/page.tsx`: `const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })`
  - `jspdf` in `lib/exportPlan.ts`: move to dynamic `import('jspdf')` inside the export function (already used at runtime — make it an async import)
  - PostHog provider in `app/layout.tsx`: wrap in `dynamic(() => import('@/components/AnalyticsProvider'), { ssr: false })`
- In `app/layout.tsx`, add `<link rel="preconnect" href="https://api.anthropic.com">` and `<link rel="dns-prefetch" href="https://api.anthropic.com">`
- Verify `next.config.js` has `output: 'export'` and `images: { unoptimized: true }` (required for Capacitor static build)
- Add `compress: true` to `next.config.js` for gzip on the dev server
- Run `npx @next/bundle-analyzer` to verify improvements; document the before/after bundle sizes in a comment in `next.config.js`

---

## PHASE E — Visual Design Polish

### E1 — Design System Tokens (Brand Identity)
**Status**: `[ ]` Not started
**Why**: Current UI uses ad-hoc Tailwind classes with inconsistent colors, shadows, and border-radius. Design tokens make every component consistent.
**Files to change**: `tailwind.config.js`, `app/globals.css`, key components
**What to do**:
- In `tailwind.config.js`, extend colors with semantic brand tokens:
  ```js
  brand: { DEFAULT: '#4f46e5', light: '#818cf8', faint: '#eef2ff' },
  surface: { DEFAULT: '#ffffff', raised: '#f9fafb', overlay: '#f3f4f6' },
  substance: {
    tip: '#f59e0b',      // amber
    warning: '#ef4444',  // rose/red
    wisdom: '#8b5cf6',   // violet
    opinion: '#0ea5e9',  // sky
    context: '#10b981',  // emerald
    recommendation: '#4f46e5', // indigo
  }
  ```
- Add three box-shadow utilities via `theme.extend.boxShadow`: `card` (subtle), `modal`, `elevated`
- Create `components/ui/card.tsx` primitive: `<Card>`, `<CardHeader>`, `<CardContent>` — thin wrappers with the standard rounded-2xl + shadow-sm + border styling; all card-shaped components should import this
- Audit `InboxCard.tsx`, `BoardCard.tsx`, `LocationDetailCard.tsx` and replace raw Tailwind color values with the new tokens where they match

### E2 — Animated Clip Card Detail (Hero Expand)
**Status**: `[ ]` Not started
**Why**: Opening a clip card is jarring — `LocationDetailCard` appears instantly with no spatial relationship to the card. A hero expand animation provides spatial context.
**Files to change**: `components/InboxCard.tsx`, `components/LocationDetailCard.tsx`, `app/page.tsx`, `app/inbox/page.tsx`
**What to do**:
- Use Framer Motion's `layoutId` to animate the card thumbnail → detail hero transition:
  - `InboxCard`: wrap thumbnail in `<motion.div layoutId={`card-thumb-${item.id}`}>`
  - `LocationDetailCard`: wrap its hero image in the same `layoutId`
- Add `AnimatePresence` around the detail panel mount/unmount in the parent pages
- The detail panel also animates from the bottom on mobile (slide-up, 280ms spring) and from the right on desktop (slide-in, 220ms ease)
- Back button dismisses with reverse animation
- Fallback: if no thumbnail exists, use a color-swatch that expands (brand indigo gradient)
- Cap total animation at 300ms so it never feels sluggish

### E3 — Dark Mode (System-Adaptive)
**Status**: `[ ]` Not started
**Why**: Most iOS users use dark mode. The white/gray palette is harsh in dark environments — a major quality signal.
**Files to change**: `tailwind.config.js`, `app/globals.css`, all major components
**What to do**:
- Change `tailwind.config.js` from `darkMode: ['class']` to `darkMode: 'media'` (system-adaptive, no manual toggle needed in v1)
- In `app/globals.css`, add `@media (prefers-color-scheme: dark)` overrides for CSS variables:
  - Background: `#0a0a0a`, Surface: `#1a1a1a`, Border: `#2a2a2a`, Primary text: `#f5f5f5`, Muted: `#888`
- Audit ALL components and add `dark:` Tailwind variants:
  - Card backgrounds: `bg-white` → add `dark:bg-zinc-900`
  - Text: `text-gray-900` → add `dark:text-gray-100`; `text-gray-500` → add `dark:text-gray-400`
  - Borders: `border-gray-100` → add `dark:border-zinc-800`; `border-gray-200` → add `dark:border-zinc-700`
  - Input/search backgrounds: → add `dark:bg-zinc-800 dark:text-gray-200`
- Map: detect `prefers-color-scheme` in `MapView.tsx` and switch to a dark MapLibre style (use `https://tiles.openfreemap.org/styles/dark` or equivalent)
- NavBar: background goes from `bg-white` to `dark:bg-zinc-950`

### E4 — Beautiful Empty States
**Status**: `[ ]` Not started
**Why**: Empty states are the first thing new users see. Currently they're just emoji + text — a missed opportunity to communicate value.
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `app/plan/[boardId]/page.tsx`, new `components/ui/empty-state.tsx`
**What to do**:
- Create `components/ui/empty-state.tsx` with props: `icon: React.ReactNode`, `title: string`, `description: string`, `action?: { label: string; onClick: () => void }`
- Inline SVG icons (no external dep) for each state — simple line-art in brand colors:
  - Inbox empty: compass / map-pin motif with a soft radial gradient
  - Boards empty: 3×3 grid of dots with one highlighted
  - Search empty: magnifier with a dashed circle
  - Plan idle: folded map with a dotted travel route
- Inline each icon as a small SVG (40×40) with a subtle animation (gentle bob or rotation using framer-motion `animate` loop)
- Replace all existing empty state JSX in the three pages with `<EmptyState ...>` component calls
- On Boards empty state, include "Load demo boards" as secondary action (calls `seedDemoData` from `lib/seedData.ts`)

### E5 — Substance Type Visual Language
**Status**: `[ ]` Not started
**Why**: The `SubstanceList` shows text with emoji icons, but type distinction isn't strong enough on mobile. Color-coded chips are scannable at a glance.
**Files to change**: `components/SubstanceList.tsx`, `components/LocationDetailCard.tsx`, `app/plan/[boardId]/page.tsx`, `components/InboxCard.tsx`
**What to do**:
- Define a `SUBSTANCE_STYLE` map (type → `{ bg, text, border, icon: LucideIcon }`):
  - `tip` → amber-50 / amber-700 / amber-200 / `Lightbulb`
  - `warning` → red-50 / red-700 / red-200 / `AlertTriangle`
  - `wisdom` → violet-50 / violet-700 / violet-200 / `Brain` (or `Sparkles`)
  - `opinion` → sky-50 / sky-700 / sky-200 / `MessageCircle`
  - `context` → emerald-50 / emerald-700 / emerald-200 / `Globe`
  - `recommendation` → indigo-50 / indigo-700 / indigo-200 / `Star`
- Update `SubstanceList.tsx` to use these styled chips instead of raw emoji — each chip shows icon + content + optional `source_quote` as italic sub-text
- In `InboxCard.tsx` (done state): replace the current `💡 N tips` text with up to 3 colored mini-chips showing type icons only (no text) — acts as a visual summary row
- In plan view: sourced tips get the `recommendation` chip style with "from your clip: [title]" attribution below it
- Empty substance → hide the section entirely (already done; verify)

---

## PHASE F — Cloud Sync + Authentication

### F1 — Supabase Auth Activation
**Status**: `[ ]` Not started
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase project
**Files to change**: `lib/supabase.ts`, `lib/cloudSync.ts`, new `components/AuthModal.tsx`, `app/layout.tsx`
**What to do**:
- Create `components/AuthModal.tsx` with two CTA buttons: "Continue with Magic Link" + "Continue with Google"
- Wire auth UI to the existing `lib/supabase.ts` auth functions (`signInWithMagicLink`, `signInWithGoogle`)
- Show "Sign in to sync across devices" entry point on the Account page (Phase F3)
- On successful auth: call `syncNow()` from `lib/cloudSync.ts` — pushes all local items/boards/trips to Supabase
- If `NEXT_PUBLIC_SUPABASE_URL` is missing: skip auth entirely and show "Cloud sync coming soon" placeholder — same graceful no-op pattern as PostHog
- Persist session via `Capacitor.Preferences` so the user stays signed in after app restart
- On sign-in, identify the user in PostHog: `identify(user.id)` from `lib/analytics.ts`

### F2 — Sync Status Indicator
**Status**: `[ ]` Not started
**Files to change**: `components/NavBar.tsx`, `lib/cloudSync.ts`, new `hooks/useSyncStatus.ts`
**What to do**:
- Create `hooks/useSyncStatus.ts` exposing `{ status: 'idle'|'syncing'|'error'|'offline', lastSyncAt: Date|null, pendingCount: number }`
- Show a small cloud icon in the NavBar header area (top-right or bottom of the nav):
  - Idle: cloud-check (gray) — "Synced"
  - Syncing: cloud with pulse animation
  - Error: cloud-x (red) — tap to retry
  - Offline: cloud-off (gray) — "Offline"
- Tap the icon to open a mini popover: "Last synced: 2 min ago" + "Sync now" button + pending count if > 0
- Listen to `navigator.onLine` events — trigger sync when coming back online
- If Supabase is not configured, hide the indicator entirely

### F3 — Account Settings Page
**Status**: `[ ]` Not started
**Files**: new `app/account/page.tsx`, update `components/NavBar.tsx`
**What to do**:
- Add "Account" as the 5th NavBar tab (icon: `User` from lucide-react), replacing or repurposing the current tab set
- Account page sections:
  1. **Profile**: avatar circle (initials from email, indigo background), email address, "Sign out" button
  2. **Usage**: "X of 5 daily plans used" progress bar (resets at midnight), "X of 10 hourly enrichments used"
  3. **Data**: "X clips · Y boards · Z trips saved" — counts from IndexedDB
  4. **Export**: "Download backup" button → calls `exportAllData()` from F4
  5. **Import**: file picker → calls `importData(json)` from F4
  6. **Danger zone**: "Delete all data" button (requires typing "DELETE" to confirm)
  7. **About**: app version (from `package.json`), privacy policy link, terms link
- If not signed in: show "Sign in to sync" banner at the top with `AuthModal` trigger

### F4 — Full Data Export + Import (JSON Backup)
**Status**: `[ ]` Not started
**Files**: new `lib/exportData.ts`, `app/account/page.tsx`
**What to do**:
- Create `lib/exportData.ts`:
  ```ts
  export async function exportAllData(): Promise<void>
  // Reads all items/boards/trips from IndexedDB
  // Packages as { version: 2, exportedAt: ISO, items: [], boards: [], trips: [] }
  // Triggers download of travelpanel-backup-YYYY-MM-DD.json

  export async function importData(json: unknown): Promise<{ imported: number; skipped: number }>
  // Validates schema (zod)
  // On conflict (same id): last-write-wins by savedAt/updatedAt
  // Returns counts for user feedback
  ```
- Use `zod` to validate the import JSON before writing to IndexedDB — reject silently malformed data
- After import, call `router.refresh()` to reflect the restored data
- Show a toast: "Restored 47 clips, 3 boards, 12 trips" (use the existing toast pattern or add one)
- Demo/seed items (where `isDemo: true`) are excluded from the export

---

## PHASE G — Capture Excellence

### G1 — Xiaohongshu / WeChat Vision Fix
**Status**: `[ ]` Not started
**Why**: Thumbnails from Chinese platforms are CORS-blocked. iOS Share Extension can send the *screenshot image* alongside the URL — Claude Vision can extract from the image.
**Files to change**: `ios/App/ShareExtension/ShareViewController.swift`, `app/api/import/route.ts`, `app/share/page.tsx`
**What to do**:
- Update `ShareViewController.swift` to capture image attachments from the share payload (NSItemProvider type `public.image`)
- Write the image as base64 JPEG (max 1024×1024 resized) to App Group shared storage under key `pendingImage`
- In `app/share/page.tsx`: on load, read `pendingImage` from App Group (via `Capacitor.Preferences` or a custom plugin); include in the fetch to `/api/import` as `imageData: string` body field
- In `app/api/import/route.ts`: if `imageData` is present, include a `{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } }` block in the Claude message alongside text
- Update the Claude prompt: "This screenshot is from a social post. Extract visible location names, coordinates, tips, and warnings from both the caption text AND what's visible in the image."
- Clear `pendingImage` from App Group after reading it once
- Fallback: if no image, existing text extraction runs as-is

### G2 — Manual Clip Creation (Fallback Form)
**Status**: `[ ]` Not started
**Why**: When URL extraction fails (private accounts, anti-scraping), users have no fallback — the habit breaks. A manual form preserves it.
**Files to change**: `components/ImportSheet.tsx`, new `components/ManualClipForm.tsx`, `app/api/import/route.ts`
**What to do**:
- After a failed import (enrichment status `failed` after the import attempt), show "Couldn't extract from this link" error state + "Add manually instead" button in `ImportSheet`
- Create `components/ManualClipForm.tsx` with fields:
  - Title (text, required)
  - Location (text input → Nominatim geocode on blur: `https://nominatim.openstreetmap.org/search?q=...&format=json`)
  - Note / tips (textarea, optional — becomes a `wisdom` substance item)
  - Tags (comma-separated chip input, optional)
- On save: create a `SavedItem` with `enrichmentStatus: 'done'`, `platform: 'other'`, `locations` from geocoded result, `substance` from the note
- Also add a pencil ✏️ edit button to the completed `InboxCard` that opens `ManualClipForm` pre-filled — lets users correct extraction errors
- Geocode is client-side, no API key, no rate limits (Nominatim fair-use: max 1 req/sec)

### G3 — YouTube Chapter / Description Extraction
**Status**: `[ ]` Not started
**Why**: YouTube travel vlogs are content-rich. Current scraper gets only title. Descriptions contain chapter timestamps and location names.
**Files to change**: `app/api/import/route.ts`, `lib/parse-url.ts`
**What to do**:
- In `lib/parse-url.ts`: add YouTube URL detection and video ID extraction (handle `youtu.be/ID`, `?v=ID`, `/shorts/ID`)
- Fetch YouTube oEmbed: `https://www.youtube.com/oembed?url=URL&format=json` (no API key required) to get title + author
- Fetch the video page HTML (existing fetch logic) — parse the `ytInitialData` JSON embedded in the page to extract the description text and chapters
- Pass description (up to 3000 chars) to Claude alongside the OG title — descriptions often contain "00:23 Fushimi Inari Shrine - go early at 6am to avoid crowds" style chapters
- Map chapter-like lines (containing timestamps `HH:MM` or `MM:SS`) to `activities` entries with the timestamp as a note
- Add a `"From YouTube chapters"` tag to extracted activities
- Fallback: if `ytInitialData` is not present, use only OG title + description

### G4 — Safari Web Extension (Desktop Capture)
**Status**: `[ ]` Not started
**Why**: iOS Share Sheet covers mobile. Desktop users (trip planning at a computer) need a way to clip.
**Files**: new `safari-extension/` directory at project root
**What to do**:
- Create a minimal Manifest V3 compatible browser extension:
  ```
  safari-extension/
    manifest.json       — name, version, permissions: [activeTab, storage]
    popup.html          — import UI (single button + status text)
    popup.js            — fetches current tab URL + OG title, POSTs to /api/import
    content.js          — injected to grab OG meta tags from the page
    icons/              — 48, 96, 128px icons (use existing brand assets)
  ```
- The popup POSTs `{ url, title }` to the deployed Vercel URL (stored in `storage.sync.settings.apiBase`)
- Shows "Saving..." → "Saved! N spots found" or "Failed — open TravelPanel to retry"
- First-run: shows a settings prompt for the Vercel URL (required for the extension to know where to send clips)
- Works in both Chrome (via Chromium compatibility) and Safari (via `xcrun safari-web-extension-converter`)

---

## PHASE H — Advanced Intelligence

### H1 — Weather Context in Trip Plans
**Status**: `[ ]` Not started
**Needs**: No API key — uses open-meteo.com free tier
**Files to change**: `app/api/plan/route.ts`, `lib/types.ts`, `components/DayStripCard.tsx`
**What to do**:
- Compute the centroid lat/lng from all board items' locations (average of all coords)
- Fetch `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weathercode&forecast_days=14` (free, no key)
- Add `weather?: { condition: string; tempHighC: number; tempLowC: number; precipChance: number; icon: string }` to the `DayPlan` type in `lib/types.ts`
- Pass weather per-day to the planner prompt: "Day 2 forecast: light rain (60%). Prefer indoor/covered activities."
- The Claude planner references this to adjust activity ordering (museums on rainy days, outdoor sites on sunny days)
- In `DayStripCard.tsx`, show a weather chip on each day tab: uses WMO weather code to emoji map (e.g. code 0 → ☀️, 61 → 🌧️)
- If forecast is beyond 16 days: weather field is omitted; the UI shows nothing (graceful absence)
- Convert temperatures based on user locale: show °F if `navigator.language` starts with `en-US`, else °C

### H2 — Semantic "Vibe" Search
**Status**: `[ ]` Not started
**Files**: new `lib/vibeSearch.ts`, `components/SearchBar.tsx`
**What to do**:
- **Phase 1 (no Supabase required)**: Add a vibe-mode toggle to `SearchBar` (sparkle ✨ icon button):
  - When toggled, search query is matched against a hand-crafted tag taxonomy:
    ```ts
    const VIBES: Record<string, string[]> = {
      romantic:    ['restaurant', 'sunset', 'rooftop', 'garden', 'view', 'wine', 'cozy'],
      adventurous: ['hiking', 'waterfall', 'canyon', 'cliff', 'boat', 'dive', 'trek'],
      foodie:      ['restaurant', 'market', 'street food', 'cafe', 'ramen', 'sushi'],
      cultural:    ['temple', 'museum', 'shrine', 'history', 'art', 'traditional'],
      nature:      ['park', 'forest', 'beach', 'mountain', 'lake', 'wildlife'],
    };
    ```
  - Score each item: sum of matching vibe-tags found in `item.tags + item.activities + item.substance content`
  - Sort by score descending; show "Vibe match" badge on results
- Search bar shows "🔍 Keyword" / "✨ Vibe" toggle state
- "romantic sunset cafe" → matches items with restaurant/sunset/view tags even if those words aren't in title
- Phase 2 (Supabase pgvector): embed substance text on save, enable cosine similarity — add as a follow-up task when F1 is complete

### H3 — Shareable Trip Link
**Status**: `[ ]` Not started
**Needs**: Supabase (from F1) for persistence
**Files**: new `app/share/trip/[shortId]/page.tsx`, new `app/api/share/trip/route.ts`
**What to do**:
- Add "Share plan" button to the plan complete view in `app/plan/[boardId]/page.tsx`
- `POST /api/share/trip`: generates a `nanoid(8)` short ID, stores the trip plan JSON in a Supabase `shared_trips` table (columns: `id`, `short_id`, `plan_json`, `board_name`, `created_at`, `expires_at` = now+30 days); returns the short URL
- Public page `app/share/trip/[shortId]/page.tsx`: SSR page that fetches the plan from Supabase by short ID and renders a read-only itinerary (no auth required)
- Public page shows: board name header, day tabs, activity cards, sourced tips — but hides personal clip URLs and notes
- "Copy to TravelPanel" button: deep-links to `travelpanel://import-plan?shortId=X` (or opens the PWA URL)
- If Supabase is not configured: "Share" button is hidden; no API route needed
- Trip expires automatically via a Supabase cron/pg_cron rule (or just filter on `expires_at < now()` in the fetch)

### H4 — AI Chat with Your Clips
**Status**: `[ ]` Not started
**Files**: new `app/chat/page.tsx`, new `app/api/chat/route.ts`, update `components/NavBar.tsx`
**What to do**:
- Add "Chat" as a NavBar tab (message-circle icon) — replaces or extends the current 4-tab layout
- Chat page: scrollable message list + fixed bottom text input + send button
- `POST /api/chat`: streaming chat endpoint using Claude
  - System prompt includes all user clips as context: title + substance items (truncated to 100 chars each) + top 3 tags per item — keeps prompt under 4K tokens for typical libraries
  - Uses `claude-haiku-4-5` by default; auto-escalates to `claude-sonnet-4-6` if the query contains words like "plan", "itinerary", "compare", "summarize"
  - Example queries Claude should handle: "What Japanese onsen spots did I save?", "Any warnings about Bali?", "Plan a day in Kyoto from my clips"
- Each Claude response can include `[source: clip title]` inline citations; parse and render these as tappable links that open `LocationDetailCard`
- Message history persisted in IndexedDB (`chat_messages` store, last 50 messages)
- Clear button resets session

---

## PHASE I — App Store Ready

### I1 — App Icon + Launch Screen
**Status**: `[ ]` Not started
**Files**: `ios/App/App/Assets.xcassets/`, `public/icons/`, `public/manifest.json`
**What to do**:
- Design icon concept: compass rose overlapping a location pin, brand indigo (#4f46e5) fill, white details, on a white or indigo background
- Generate all iOS required sizes programmatically using a Node script `scripts/generate-icons.js` (uses `sharp` npm package):
  - 20×20, 29×29, 40×40, 58×58, 60×60, 76×76, 80×80, 87×87, 120×120, 152×152, 167×167, 180×180, 1024×1024
- Place outputs into `ios/App/App/Assets.xcassets/AppIcon.appiconset/` + update `Contents.json`
- PWA icons: 192×192, 512×512 → update `public/manifest.json` references
- Launch screen: update `LaunchScreen.storyboard` to use brand indigo background + centered "TravelPanel" wordmark (white text, SF Pro Display 28pt Bold)
- Update `capacitor.config.ts` splash screen: `backgroundColor: '#4f46e5'`, `showSpinner: false`

### I2 — Crash Reporting (Sentry)
**Status**: `[ ]` Not started
**Needs**: `NEXT_PUBLIC_SENTRY_DSN` env var (free tier at sentry.io)
**Files**: `app/layout.tsx`, new `lib/sentry.ts`, new `app/global-error.tsx`, `next.config.js`
**What to do**:
- Install `@sentry/nextjs`: `npm install @sentry/nextjs`
- Create `lib/sentry.ts` no-op wrapper (same pattern as PostHog — skips if DSN missing):
  ```ts
  export function captureException(err: unknown, ctx?: Record<string, unknown>) {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    // dynamic import Sentry and call captureException
  }
  ```
- Add `app/global-error.tsx` React error boundary that calls `captureException` and shows a friendly "Something went wrong — tap to reload" recovery UI
- In `app/api/import/route.ts` and `app/api/plan/route.ts`: wrap catch blocks to call `captureException(err, { url })`
- Add `sentry.client.config.ts` at project root (required by `@sentry/nextjs`)
- In dev mode, Sentry is disabled (check `NODE_ENV === 'development'`)

### I3 — Privacy Policy + Terms Page
**Status**: `[ ]` Not started
**Files**: new `app/privacy/page.tsx`, new `app/terms/page.tsx`, `app/account/page.tsx`
**What to do**:
- Required for App Store submission (Apple requires privacy policy URL)
- `app/privacy/page.tsx` — plain English, covers:
  - What's collected: URLs saved by the user, device info for crash reporting if Sentry key is set, usage analytics if PostHog key is set
  - What's NOT collected: no data is sold, no advertising, no 3rd party tracking by default
  - Data storage: local-first (IndexedDB on device); optional cloud sync (Supabase) if user signs in
  - Contact: jiangnan027@gmail.com
- `app/terms/page.tsx` — plain English, covers:
  - TravelPanel is a personal productivity tool; content belongs to the user
  - AI extraction is best-effort; results may be inaccurate
  - Service provided as-is; no warranty
- Link both pages from the Account page footer and from `app/layout.tsx` meta (`<link rel="privacy-policy" href="/privacy">`)
- Each page < 600 words; styled consistently with the app (brand indigo links, same font)

### I4 — App Store Screenshots Flow (Dev Tool)
**Status**: `[ ]` Not started
**Files**: new `app/screenshots/page.tsx`, new `scripts/seed-for-screenshots.ts`
**What to do**:
- Create dev-only route `app/screenshots/page.tsx` that renders the app seeded with rich demo data, in specific viewport sizes (375×812 for iPhone 14 Pro), with UI state frozen for screenshotting
- 5 required screenshot scenarios:
  1. Map view: 15+ clustered pins over a city, one selected with detail card open
  2. Inbox: 6 clips in the grid with varied platforms + substance chips
  3. Clip detail: `LocationDetailCard` open showing all substance type chips (tip/warning/wisdom)
  4. Plan generating: the 6-step streaming animation mid-flight (screenshot the `clustering` step)
  5. Day itinerary: day 2 of a 5-day plan with activities, sourced tips, weather chip
- `scripts/seed-for-screenshots.ts`: populates IndexedDB with 20 rich demo clips using the seed data pattern from `lib/seedData.ts`
- Route is excluded from static export: add `if (process.env.NODE_ENV !== 'development') notFound()` at top
- Add `SCREENSHOTS.md` with step-by-step instructions for capturing with Xcode simulator

### I5 — Performance Audit and Virtual Scrolling
**Status**: `[ ]` Not started
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, `components/InboxCard.tsx`, possibly `next.config.js`
**What to do**:
- Install `@tanstack/react-virtual`: `npm install @tanstack/react-virtual`
- In `app/inbox/page.tsx`: if `filtered.length > 50`, switch from a flat `div` grid to a virtualised list using `useVirtualizer` from `@tanstack/react-virtual`
  - Estimate row height: 280px per card in a 2-column grid
  - The virtual scroller renders only the visible rows + 3 overscan rows above/below
  - Below 50 items, keep the existing AnimatePresence grid (animations are more important than virtualisation at low counts)
- Add `React.memo` to `InboxCard` and `BoardCard` with a custom equality check (`prev.item.id === next.item.id && prev.item.enrichmentStatus === next.item.enrichmentStatus`)
- Add `React.memo` to `MapView` (already pure-rendering from props)
- Verify the Lighthouse Performance score on the deployed Vercel URL improves to > 85

---

## Completed Tasks (Phase A — done 2026-06-10)

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
