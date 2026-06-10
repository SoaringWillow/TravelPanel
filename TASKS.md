# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.
> **Ultimate goal**: A beautiful, fully functional iOS app that lets users capture travel inspiration from social apps, extract structured wisdom from posts, and generate sourced multi-day itineraries — all with native iOS feel.

---

## Phase A — Complete ✅
All Phase A tasks (A1–A12) are done. The two-layer extraction moat (spots + substance), enrichment retry, search, onboarding, export, and sourced trip planning are all implemented.

---

## PHASE B — iOS Native Polish (Current Sprint)

### B1 — Haptic Feedback on Key Actions
**Status**: `[x]` Done  
**Why**: Without haptics, the app feels like a website, not an iOS app. Haptic feedback is the single highest-ROI native-feel improvement.  
**Files to change**: Install `@capacitor/haptics`, create `lib/haptics.ts`, add calls to key interactions  
**What to do**:
- Run `npm install @capacitor/haptics`
- Create `lib/haptics.ts` with a `haptic(style: 'light'|'medium'|'heavy'|'success'|'warning'|'error')` wrapper that no-ops in browser
- Add haptic feedback to:
  - Clip saved successfully → `success`
  - Plan generated → `success`
  - Board created → `medium`
  - Delete clip/board → `warning` (on confirm button press)
  - Import button FAB tap → `light`
  - Tab bar navigation taps → `light`
  - Error states → `error`
- The wrapper must no-op gracefully when Capacitor is not available (web browser)

### B2 — Swipe-to-Delete on Clip Cards
**Status**: `[ ]` Not started  
**Why**: iOS users expect swipe-to-delete. A long-press → confirm dialog is clunky. Swipe reveal is the native pattern.  
**Files to change**: `components/InboxCard.tsx`  
**What to do**:
- Add swipe-left gesture to `InboxCard` using CSS transforms + touch event handlers (no external lib needed)
- Reveal a red delete action behind the card on swipe left beyond 80px threshold
- Snap back on release if not past threshold; show delete zone if past threshold
- Tapping revealed delete zone: call existing delete handler + haptic `warning`
- Works in both Inbox grid and board detail card list
- Swipe right cancels / snaps back with spring animation

### B3 — Pull-to-Refresh on Inbox and Boards
**Status**: `[ ]` Not started  
**Why**: Standard iOS interaction for refreshing content. Users will instinctively try it.  
**Files to change**: `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Implement a custom pull-to-refresh using touch events on the scroll container
- Show a spinner/indicator when pull exceeds 60px threshold
- On release past threshold: trigger enrichment retry queue + haptic `medium`
- Snap back with spring easing after release
- Must not interfere with normal scrolling

### B4 — Keyboard Dismiss & Safe Area on Import Sheet
**Status**: `[ ]` Not started  
**Why**: The URL import sheet sits behind the keyboard on small screens. Typing a URL then tapping Save is awkward when the button is obscured.  
**Files to change**: `components/ImportSheet.tsx` (or wherever the import modal lives), relevant CSS  
**What to do**:
- Use `visualViewport` API to detect keyboard height and slide the sheet up accordingly
- Dismiss keyboard on tapping outside the text input area
- Add a "Done" button to the keyboard toolbar (using `inputAccessoryView` equivalent in PWA: sticky toolbar above keyboard)
- Ensure the Save/Import button is always visible above the keyboard
- Add `enterKeyHint="send"` to the URL input so the keyboard shows a "go" action key
- Test: open sheet → type URL → keyboard appears → Save button still visible

### B5 — Offline Fallback for Map Tiles
**Status**: `[ ]` Not started  
**Why**: If OpenFreeMap CDN is unreachable (airplane mode, bad signal), the map is blank with no explanation. This is a core screen.  
**Files to change**: `components/MapView.tsx`  
**What to do**:
- Detect tile load errors via MapLibre's `map.on('error', ...)` handler
- After 3+ tile errors within 5 seconds, show an overlay: "Map tiles unavailable — showing pin locations only"
- Render a plain `#e8e4dc` beige canvas as fallback background
- Keep all pins/clusters visible even without tile textures
- Re-attempt tile load on network reconnect (`window.addEventListener('online', ...)`)
- Show a subtle "Offline" badge on the map when in fallback mode

### B6 — Manual Drag Reorder of Plan Activities
**Status**: `[ ]` Not started  
**Why**: Auto-generated plans are a starting point. Users want to drag activities to reorder them within a day or move them between days. This is the #1 requested trip planning feature.  
**Files to change**: `app/plan/[boardId]/page.tsx`, relevant sub-components  
**What to do**:
- Add drag-and-drop reorder within each day's activity list using native HTML5 drag API with touch fallback (touch events)
- Show drag handle icon on each activity card (6 dots / `GripVertical` from lucide-react)
- Visual: dragged card becomes semi-transparent; drop target shows insertion line
- Allow moving activities between days (drag to different day section header)
- Persist reordered plan to the saved trip in IndexedDB (update the relevant plan variant)
- Haptic `light` on drag start, `medium` on drop

### B7 — Deep Link to Plan Day
**Status**: `[ ]` Not started  
**Why**: Sharing a plan with a friend or picking up where you left off should land on the right day.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/CapacitorBridge.tsx`  
**What to do**:
- Add `?day=N` query param support to the plan page URL (N is 1-indexed day number)
- On load with `?day=2`, auto-scroll to and highlight day 2
- Add a "Copy link to Day X" context menu option on each day header (copies deep link to clipboard)
- CapacitorBridge: handle `travelpanel://plan?boardId=X&day=Y` deep link and route accordingly
- Haptic `light` on link copy

### B8 — Fuzzy Search with Tag Filters
**Status**: `[ ]` Not started  
**Why**: Text search is exact-match only. "Coffe" won't find "Coffee". And there's no way to filter by tag category (food, nature, etc.).  
**Files to change**: `components/SearchBar.tsx`, `app/inbox/page.tsx`  
**What to do**:
- Install `fuse.js` for fuzzy text search (lightweight, zero deps)
- Replace current `includes()` search with Fuse.js index over title + description + tags + substance content
- Add horizontal scrollable tag filter pills below search bar: "All" + unique tags from all clips
- Active filter pill highlighted in indigo; tapping deselects
- Combined filter: fuzzy text AND selected tag must both match
- Show match count: "12 clips" or "3 of 48 clips" when filtered
- Persist active filters to sessionStorage (survive tab navigation but not app restart)

### B9 — Settings Page
**Status**: `[ ]` Not started  
**Why**: The app has no settings surface. Users have no way to manually trigger sync, see their clip count, manage rate limits, or export their data.  
**Files**: new `app/settings/page.tsx`, update bottom nav  
**What to do**:
- Create a Settings page accessible from a gear icon in the top-right of the Boards or Inbox screen (or as a 4th tab)
- Sections:
  - **Account**: email display (placeholder until auth), "Sign in with Apple/Google (coming soon)"
  - **Data**: clip count, boards count, "Export all data as JSON" button (triggers full IndexedDB dump as downloadable JSON)
  - **Cloud Sync**: "Sync status" (shows last sync time or "Not set up"), "Set up cloud sync" CTA → links to CLAUDE docs
  - **Rate Limits**: shows "X of 10 enrichments used today" and "Y of 5 plans generated today" with reset times
  - **App Info**: version, "About TravelPanel", "Send feedback" mailto link
- "Export all data as JSON": serialize all items + boards + trips from IndexedDB → `Blob` → trigger download link

### B10 — Plan Streaming Error Recovery
**Status**: `[ ]` Not started  
**Why**: If `/api/plan` streaming fails mid-way (network drop, API error), the plan page shows an error state with no recovery path. Users have to navigate away and back to retry.  
**Files to change**: `app/plan/[boardId]/page.tsx`  
**What to do**:
- Add a "Retry" button to the error state in the plan generation UI
- Retry should re-trigger the same generation request (same board, same params)
- Add exponential backoff: first retry immediate, second after 2s, third after 4s
- Show "Attempt 2 of 3" indicator during retries
- After 3 failures, show: "Plan generation failed. Check your connection and try again." with a final manual retry button
- Haptic `error` on failure, `success` on eventual success

---

## PHASE C — Visual Excellence

### C1 — Clip Card Visual Redesign
**Status**: `[ ]` Not started  
**Why**: Cards are functional but generic. Travel apps live or die by visual appeal. Cards need to breathe, show imagery, and feel premium.  
**Files to change**: `components/InboxCard.tsx`  
**What to do**:
- Add support for a `thumbnailUrl` field on clips (already stored or can be extracted from OG metadata)
- When thumbnail available: show full-bleed image in top 40% of card, title overlays at bottom with gradient scrim
- When no thumbnail: use a gradient background based on the dominant tag category color (food=warm amber, nature=sage green, culture=indigo, adventure=sky blue)
- Tags rendered as small pills in bottom-left, substance count badge in top-right
- Platform icon (YouTube/Instagram/etc.) as small badge overlaying thumbnail top-left
- Card height: 160px in 2-col grid; expands gracefully
- Add a subtle box-shadow + scale(1.01) on touch/hover

### C2 — Animated Onboarding Flow
**Status**: `[ ]` Not started  
**Why**: First launch shows empty boards. The seed boards help, but there's no guided moment that explains the product's value.  
**Files**: new `components/OnboardingFlow.tsx`, update `app/page.tsx`  
**What to do**:
- 3-step animated intro shown on very first app launch (localStorage flag `onboarding_v2_seen`)
- Step 1: "Save travel inspiration" — animated share sheet mockup sliding in from bottom
- Step 2: "AI extracts the wisdom" — animated card appearing with substance items populating
- Step 3: "Generate your trip" — animated day plan appearing
- Each step: full-screen overlay, white card, icon + heading + 1-sentence description, "Next" button
- Last step: "Start exploring" → dismisses and shows seed boards
- Skip button on every step
- Smooth slide/fade transitions between steps using Framer Motion

### C3 — Plan View Visual Polish
**Status**: `[ ]` Not started  
**Why**: The plan view is data-rich but visually dense. Day strips need visual hierarchy and the sourced tips need to feel special.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `components/DayStripCard.tsx` (if exists)  
**What to do**:
- Day headers: large date + day number in a colored strip (Day 1 = indigo, Day 2 = violet, Day 3 = rose, cycling)
- Activity cards: left accent border in day color, title in 17px semibold, time estimate + activity type icon
- Sourced tips: distinct visual treatment — italic quote style, subtle teal/green background, "— from your clip: [Title]" attribution in smaller text
- Map and day list should scroll together (sticky day selector tabs at top, map inset shows route for selected day)
- "Generate new version" button: secondary, not primary — don't compete with viewing the plan

### C4 — Empty States with Illustrations
**Status**: `[ ]` Not started  
**Why**: Empty Inbox, empty board, and empty search results show plain text. These are high-frequency states for new users and should feel intentional.  
**Files**: Various page components  
**What to do**:
- Create SVG illustrations (simple, line-art style) for:
  - Empty inbox: person looking at horizon with a + hint
  - Empty search: magnifying glass with no results
  - Empty board: corkboard with pinhole marks
  - Empty plan: blank calendar with a sparkle
- Each empty state: illustration (120px tall) + heading + sub-text + optional CTA button
- Use consistent indigo/violet palette matching app theme
- Illustrations as inline SVG components for zero network requests

### C5 — Micro-Animations & Transitions
**Status**: `[ ]` Not started  
**Why**: The app needs the "alive" feeling. List items should animate in, cards should spring, transitions between pages should feel native.  
**Files**: Layout components, page transitions  
**What to do**:
- Page transitions: use Framer Motion `AnimatePresence` with a slide-from-right (forward nav) / slide-from-left (back nav) pattern
- List item stagger: inbox clips animate in with 30ms stagger on initial load
- FAB: spring scale on press; rotate 45° to show X on modal open
- Tab switching: slide indicator animates between tabs (already done partially — verify and enhance)
- Map pins: drop animation on first appearance (from y: -20 to y: 0, spring easing)
- Success state: confetti burst (canvas-based, lightweight) when first plan is generated

---

## PHASE D — Cloud & Data

### D1 — Cloud Sync Activation (Supabase)
**Status**: `[ ]` Not started  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — code is ready (B1 scaffolded), just needs wiring  
**Files**: `app/settings/page.tsx` (from B9), `lib/cloudSync.ts`, `app/layout.tsx`  
**What to do**:
- In Settings page: add "Cloud Sync" section with a "Connect" button
- On connect: open a modal explaining what syncs (clips, boards, plans) and data privacy
- Wire `syncNow()` on: app resume (Capacitor `appStateChange` event), after any clip save, after plan generation
- Show sync status badge: green dot = synced, orange = syncing, red = error
- Conflict resolution: last-write-wins with a "Your local data is newer — push to cloud?" prompt when diverged
- Block on: user must provide Supabase keys to env vars

### D2 — Browser Extension (Chrome + Safari)
**Status**: `[ ]` Not started  
**Why**: Not everyone uses iOS. A browser extension lets desktop users clip travel content from their laptop.  
**Files**: new `extension/` directory  
**What to do**:
- Create a Manifest V3 Chrome extension (also works in Safari via Safari Web Extensions)
- Extension popup: shows TravelPanel logo + "Save this page to TravelPanel" button
- On click: sends current tab URL + title to `https://[app-url]/api/import` with API key auth
- Success: popup shows "Saved to TravelPanel ✓" + "View in app" link
- Keyboard shortcut: `Cmd+Shift+S` / `Ctrl+Shift+S`
- Popup uses the same indigo brand color
- Manifest: `manifest.json`, `popup.html`, `popup.js`, `background.js`, `icons/`

### D3 — Xiaohongshu / Image-Based Extraction (Claude Vision)
**Status**: `[ ]` Not started  
**Why**: Xiaohongshu (Little Red Book) has anti-scraping that returns empty content via URL alone. The iOS Share Sheet can pass the screenshot/image payload instead.  
**Files**: `app/share/page.tsx`, `app/api/import/route.ts`  
**What to do**:
- Update Share Extension (`ios/App/ShareExtension/ShareViewController.swift`) to also capture image attachments and pass them as base64 in the URL scheme payload
- Update `app/share/page.tsx` to extract `imageData` from URL params
- Update `app/api/import/route.ts` to accept an optional `imageData: string` field
- When `imageData` is present, send it to Claude as a vision message: "Extract travel locations and wisdom from this screenshot of a travel post"
- Merge vision-extracted data with any URL-scraped data (union, deduplicate)
- Add a "From image" badge on cards extracted via vision

### D4 — Semantic / Vibe Search
**Status**: `[ ]` Not started  
**Needs**: Supabase pgvector (from D1) + OpenAI embeddings or Claude embeddings  
**Why**: Fuzzy text search (B8) is limited. "Peaceful cafe with natural light" should find a clip tagged "coffee shop" with substance "quiet corner by the window."  
**Files**: new `lib/embeddings.ts`, `app/api/search/route.ts`, update `components/SearchBar.tsx`  
**What to do**:
- Generate text embeddings for each clip's description + substance content on save (use `text-embedding-3-small` from OpenAI or Claude's embeddings)
- Store embeddings in Supabase pgvector column
- Add a "Vibe search" toggle in the search bar (sparkle icon)
- When vibe search active: POST to `/api/search` with query text → embed → cosine similarity against stored embeddings → return top-K results
- Show "Vibe match" badge on results from semantic search
- Fallback to fuzzy search (B8) if Supabase unavailable

### D5 — Cloud Backup Export (Full Data Download)
**Status**: `[ ]` Not started  
**Why**: Users have no way to back up or migrate their data. Device wipe = all clips gone.  
**Files**: `app/settings/page.tsx` (from B9), new `lib/exportData.ts`  
**What to do**:
- "Export all data" button in Settings: dumps all IndexedDB contents (items, boards, trips) as pretty-printed JSON
- File name: `travelpanel-backup-YYYY-MM-DD.json`
- On iOS Capacitor: use `Filesystem.writeFile` + `Share.share` to open iOS share sheet with the file
- On web: use `Blob` URL download
- Include schema version in export for future import compatibility
- "Import data" button: accepts the exported JSON file and merges into current IndexedDB (dedup by ID)

---

## PHASE E — Monetization & Growth

### E1 — Pro Tier Paywall (RevenueCat)
**Status**: `[ ]` Not started  
**Why**: Current rate limits (10 enrichments/day, 5 plans/day) are client-side only and trivially bypassed. A real paywall both monetizes and controls API costs.  
**Files**: new `lib/purchases.ts`, update rate limit checks  
**What to do**:
- Install `@revenuecat/purchases-capacitor`
- Create `lib/purchases.ts` wrapping RevenueCat: `isProUser()`, `purchasePro()`, `restorePurchases()`
- Define one product: "TravelPanel Pro" monthly subscription ($4.99/mo)
- Pro benefits: unlimited enrichments, unlimited plans, cloud sync, vibe search
- Show upgrade prompt when free limits hit (not a blocker — shows a "Upgrade to Pro" bottom sheet)
- Paywall screen: list 3 key Pro features with icons, price, Subscribe button, "Restore purchases" link

### E2 — Referral & Social Share
**Status**: `[ ]` Not started  
**What to do**:
- "Share your plan" button on completed trip plans → generates a read-only plan preview URL
- Share sheet (iOS): native `Share.share()` with plan summary + app store link
- Referral tracking: if user comes from a share link and installs app, original user gets 7-day Pro trial
- Plan preview page: `app/plan/[boardId]/preview/page.tsx` — read-only, no auth required

### E3 — App Store Assets & Metadata
**Status**: `[ ]` Not started  
**Why**: The app needs App Store listing assets before it can be submitted.  
**Files**: new `app-store/` directory  
**What to do**:
- Create `app-store/metadata.md` with: app name, subtitle, description (170 chars), keywords, category
- Create `app-store/screenshots/` directory with spec comments for each required screenshot size (6.7", 6.1", iPad 12.9")
- Write App Store description copy emphasizing the substance-over-spots moat
- Privacy Policy: create `app/privacy/page.tsx` with a basic privacy policy (required by App Store)
- Support URL: create `app/support/page.tsx` with FAQ + contact email

---

## Backlog / Future

- **F1**: On-Trip GPS Mode — nearest saved pins while traveling, haptic alert when near a saved spot
- **F2**: Post-Trip Timeline — photo + note journal linked to plan activities
- **F3**: Shared Boards — invite travel companions to a collaborative board
- **F4**: Proactive Resurfacing — "You saved a Kyoto clip 3 months ago — cherry blossom season is now"
- **F5**: AI Chat over Clips — "What did I save about restaurants in Kyoto?" conversational interface
- **F6**: Watch App — quick glance at today's plan activities from Apple Watch

---

## Completed Tasks

### Phase A (all done)
- A1 — Substance Extraction (2-layer clip schema) ✅
- A2 — Enrichment Retry Queue ✅
- A3 — Error Tracking (PostHog) ✅
- A4 — AI Cost Guard ✅
- A5 — In-App Resource Request Notifications ✅
- A6 — Pin Clustering at Low Zoom ✅
- A7 — Full-Text Search on Clips ✅
- A8 — Onboarding Seed Boards ✅
- A9 — Plan Export (PDF + Calendar) ✅
- A10 — Multi-Version Plan Support ✅
- A11 — Surface Substance in Clip Detail ✅
- A12 — Thread Substance into Trip Plans ✅
