# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-05-31)

The moat is **Substance over Spots**. A1 made the app *extract* substance, but it's
currently invisible (only a count badge) and the trip planner throws it away. The two
highest-value tasks are surfacing substance (A11) and threading it into plans (A12) —
do these before clustering/search polish.

`A11 → A12 → A3 → A7 → A8 → A6 → A9 → A10`

(A3 is NOT blocked — it no-ops without a key. Build it now; it just stays dormant
until `NEXT_PUBLIC_POSTHOG_KEY` is provided.)

---

## PHASE A — Bug-Free MVP (Current Sprint)

### A1 — Substance Extraction (2-layer clip schema) 🔴 HIGHEST PRIORITY
**Status**: `[x]` Done  
**Why**: This is the #1 strategic moat. Currently `api/import/route.ts` only extracts spots (locations + coordinates). It must ALSO extract substance: tips, warnings, opinions, "go in the morning"-style wisdom from the post content.  
**File to change**: `app/api/import/route.ts`  
**What to do**:
- Extend the Zod schema to add a `substance` array alongside `locations`
- Each substance item: `{ type: 'tip'|'warning'|'opinion'|'wisdom'|'context'|'recommendation', content: string, applies_to?: string, source_quote?: string }`
- Update the Claude prompt to explicitly ask for both layers
- Update the DB schema in `lib/db.ts` to store `substance: SubstanceItem[]` on `SavedItem`
- Update `lib/types.ts` with the `SubstanceItem` type
- Update `components/InboxCard.tsx` to show substance count badge (e.g. "3 tips")

### A2 — Enrichment Retry Queue 🔴 HIGH PRIORITY
**Status**: `[x]` Done  
**Why**: Enrichment is currently fire-and-forget. Items silently fail to enrich (no error, no retry). Users see empty cards. This is a retention killer.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`, possibly a new `lib/retryQueue.ts`  
**What to do**:
- On enrichment failure, set `enrichmentStatus: 'failed'` and increment `retryCount`
- Create a retry mechanism: on app load, find items with `status: 'failed'` and `retryCount < 3`, re-attempt enrichment with exponential backoff (2s, 4s, 8s)
- Show a subtle "Retrying..." indicator on failed cards
- After 3 failures, show a "Failed to extract info" state with a manual retry button

### A3 — Error Tracking (PostHog)
**Status**: `[x]` Done  
**Needs**: `NEXT_PUBLIC_POSTHOG_KEY` env var (free tier) — but NOT a blocker; wrappers no-op without it  
**Files to change**: `app/layout.tsx`, new `lib/analytics.ts`  
**What to do**:
- Install `posthog-js`
- Create `lib/analytics.ts` with `track(event, props)` and `identify(userId)` wrappers that no-op if key is missing
- Add PostHog provider to `app/layout.tsx`
- Track key events: `clip_saved`, `plan_generated`, `board_created`, `search_performed`
- If `NEXT_PUBLIC_POSTHOG_KEY` is missing, trigger resource request notification (see A5)

### A4 — AI Cost Guard
**Status**: `[x]` Done  
**Why**: Heavy users can spike API spend with no ceiling. No visibility into per-user cost.  
**Files to change**: `app/api/plan/route.ts`, `app/api/import/route.ts`  
**What to do**:
- Add a simple per-session rate limit: max 10 enrichments per hour (track in localStorage), max 5 plan generations per day (track in IndexedDB)
- When limit is hit, show a friendly message: "You've hit the daily plan limit. Upgrade to Pro for unlimited plans — coming soon."
- Log token usage per request to console in dev mode (foundation for cost tracking)

### A5 — In-App Resource Request Notifications
**Status**: `[x]` Done  
**Files**: new `components/ResourceBanner.tsx`, new `app/api/notify/route.ts`  
**What to do**:
- Create a banner component that checks for missing env vars and shows what's needed
- Create `app/api/notify/route.ts` that sends an email via Resend to jiangnan027@gmail.com when a resource is needed
- Env vars to check: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`
- If `RESEND_API_KEY` is missing, fall back to a mailto: link
- **NOTE**: Ask user for `RESEND_API_KEY` to enable email notifications (free tier: 100 emails/day)

### A6 — Pin Clustering at Low Zoom
**Status**: `[x]` Done  
**Files to change**: `components/MapView.tsx`  
**What to do**:
- Enable MapLibre's built-in cluster layer on the locations source
- Show count badge on clustered pins
- On click of cluster, zoom in to reveal individual pins
- Individual pin color should reflect tag category (food=orange, nature=green, culture=purple, etc.)

### A7 — Full-Text Search on Clips
**Status**: `[x]` Done  
**Files**: new `components/SearchBar.tsx`, `app/page.tsx` or `app/inbox/page.tsx`  
**What to do**:
- Add a search bar to the main board/inbox view
- Client-side search across clip title + description + tags + substance content (if present)
- Debounced (300ms), highlights matching text
- Empty state: "No clips match '[query]'. Try a different search."
- Foundation for embedding search in Phase B

### A8 — Onboarding Seed Boards
**Status**: `[x]` Done  
**Files**: new `lib/seedData.ts`, `app/page.tsx`  
**What to do**:
- Create 3 seed boards with real-looking clip data (Tokyo, Kyoto, Bali or similar)
- Each seed board has 4–6 clips with locations, tags, and substance items
- Show these on first launch (detect via a `hasSeenOnboarding` flag in localStorage)
- User can dismiss ("I'll add my own clips") or keep them
- Seed data should showcase the substance layer: each clip has at least 2 substance items

### A9 — Plan Export (PDF + Calendar)
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, new `lib/exportPlan.ts`  
**What to do**:
- Add Export button to the plan view
- PDF: use `jspdf` to generate a clean print-layout PDF with day-by-day itinerary
- Calendar: generate `.ics` file (RFC 5545) with one event per activity, including location coordinates for Apple Maps deep link
- Both exports include source citations from substance items

### A10 — Multi-Version Plan Support
**Status**: `[x]` Done  
**Files**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`  
**What to do**:
- Allow saving a named plan variant ("Relaxed pace", "Budget version")
- Store multiple plans per board in IndexedDB (`trips` store)
- Show plan version selector at top of plan view
- "Regenerate" creates a new version (doesn't overwrite current)

### A11 — Surface Substance in Clip Detail (the "Wisdom view") 🔴 HIGHEST PRIORITY
**Status**: `[x]` Done  
**Why**: A1 extracts substance but `LocationDetailCard` never shows it — the moat is invisible. This is the payoff for the count badge users already see.  
**Files to change**: `components/LocationDetailCard.tsx`, possibly a new `components/SubstanceList.tsx`  
**What to do**:
- Add a "Wisdom" section to the detail card rendering `item.substance`
- Group by type with an icon/color per type: tip 💡, warning ⚠️, opinion 💬, wisdom 🧠, context 🌍, recommendation ⭐
- Show `content`; if `source_quote` present, show it as a subtle italic citation under the content
- Extract a reusable `SubstanceList` so the plan view (A12) can reuse it
- Empty state: don't render the section if `substance` is empty

### A12 — Thread Substance into Trip Plans (sourced itineraries) 🔴 HIGHEST PRIORITY
**Why**: The strategic promise is "the trip planner generates an itinerary that *cites the source clips inline*." Currently `/api/plan` builds `contentSummary` from only `title/activities/tags` — substance is dropped, so plans can't cite wisdom. This wires the moat end-to-end.  
**Status**: `[x]` Done  
**Files to change**: `app/api/plan/route.ts`, `lib/types.ts` (Activity/DayPlan), `components/DayStripCard.tsx` or plan view  
**What to do**:
- Include each item's `substance` (with source title) in the `contentSummary` passed to the planner
- Update the planner prompt: when an activity is informed by a clip's tip/warning, surface that wisdom in the activity's `tips` and note which saved clip it came from
- Add an optional `sourcedTips?: { content: string; sourceTitle: string }[]` to the `Activity` type so citations render distinctly from generic tips
- In the day plan UI, render sourced tips with a "from your clip: <title>" attribution
- Keep it graceful: items without substance still plan fine

---

## PHASE B — Cloud Sync + Auth (Next Sprint)

### B1 — Supabase Setup
**Status**: `[~]` Scaffolded, dormant until keys  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (request from user)  
**Done** (no-op-until-keyed, same pattern as PostHog A3 — activates the moment keys are pasted):
- `lib/supabase.ts` — lazy client + auth (magic link, Google OAuth, session, auth-change sub); `cloudEnabled` flag
- `supabase/schema.sql` — Postgres mirror of IndexedDB (items/boards/trips as JSONB) + per-user RLS + indexes
- `lib/cloudSync.ts` — `pushToCloud`/`pullFromCloud`/`syncNow`, last-write-wins, demo content excluded
- `.env.local.example` — documents the two Supabase vars
- `@supabase/supabase-js` added to deps + lockfile
**Remaining to fully activate** (next session, once keys exist): create Supabase project, run `schema.sql`,
add a sign-in UI surface, wire `syncNow()` on auth + app focus, enable Google provider in the dashboard.

### B2 — Browser Extension
**Status**: `[x]` Done  
**What to do**: Chrome/Safari extension that clips the current page URL into TravelPanel

### B3 — Xiaohongshu Fix (Claude Vision)
**Status**: `[x]` Done  
**What to do**: Accept image payload from iOS Share Sheet, use Claude Vision to extract metadata + substance

### B4 — Embedding/Vibe Search
**Status**: `[ ]` Not started  
**Needs**: Supabase pgvector (from B1)  
**What to do**: Embed clip descriptions + substance text, enable semantic search ("minimalist cafe Tokyo")

### B5 — Cloud Backup Export
**Status**: `[x]` Done  
**What to do**: "Download all my data" as JSON from the account settings page

---

## PHASE C — iOS Polish & Product Depth (Current Sprint)

> **Goal**: Make the app feel premium and native on iOS. These tasks close the gap between
> "functional" and "beautiful and fully functional." Prioritise D1–D6 before deeper features.
>
> **Recommended order**: `D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8 → D9`

### D1 — Skeleton Loading Screens
**Status**: `[x]` Done  
**Why**: IndexedDB queries take 50–200 ms. The current state is a flash of empty content before items appear, which feels janky and cheap.  
**Files to change**: `components/InboxCard.tsx`, `app/inbox/page.tsx`, `app/boards/page.tsx`  
**What to do**:
- Create a `SkeletonCard` component: a `div` with rounded corners and a CSS `animate-pulse` shimmer matching InboxCard dimensions
- Show 4–6 skeleton cards in the inbox list while `loading === true`
- Show 3 skeleton tiles in the boards grid while loading
- Skeleton should include the thumbnail placeholder, title bar, and tag strip shapes

### D2 — Duplicate Detection on Save
**Status**: `[x]` Done  
**Why**: Users who share the same URL twice (e.g. resharing a link later) get silent duplicates. Discovered at ~30+ clips, ruins trust in organisation.  
**Files to change**: `app/share/page.tsx`, `lib/db.ts`  
**What to do**:
- In `lib/db.ts`, add `getItemByUrl(url: string): Promise<SavedItem | undefined>` — scans the `items` store for a matching `url` field
- In `share/page.tsx`, before showing the board picker, call `getItemByUrl(rawUrl)`
- If a match exists: show a "Already saved" inline banner: `"You saved this to [Board] on [date]. Save again or skip?"` with two buttons: **Skip** (close) and **Save Anyway** (continue normally)
- If no match: show the normal board picker

### D3 — Smart Board Suggestion (Auto-categorise)
**Status**: `[x]` Done  
**Why**: Users pick boards manually. A lightweight AI pass can suggest the right board based on tags + title, reducing friction for power users.  
**Files**: `app/share/page.tsx`, new `lib/suggestBoard.ts`  
**What to do**:
- Create `lib/suggestBoard.ts`: given `{ title, tags, substance }` and a list of existing `Board[]`, use simple keyword overlap (no API call) to score each board name against the clip's tags and title
- Score = number of tag matches + 2× if the board name appears in the title/description
- If top score ≥ 2: show that board chip with a `✦ Suggested` label in the picker
- Do NOT auto-save — just highlight the suggestion so the user picks faster
- No AI call needed; pure client-side string matching

### D4 — Wisdom Board Tab
**Status**: `[ ]` Not started  
**Why**: Substance extraction (A1) and the Wisdom detail view (A11) exist, but there's no way to browse ALL the wisdom from a board in one place — the strategic "third surface."  
**Files**: `app/boards/[id]/page.tsx`, `components/SubstanceList.tsx`  
**What to do**:
- Add a tab bar to the board detail page: **Clips** | **Map** | **Wisdom**
- Wisdom tab: aggregate all `substance` items from every clip in the board
- Group by `type` with header labels: Tips · Warnings · Opinions · Wisdom · Context · Recommendations
- Each item shows `content`, `applies_to` (if present), and a `source_quote` in italic below
- Tapping a substance item shows which clip it came from (clip title as a tap target that opens LocationDetailCard)
- Empty state: "No wisdom yet — clips with tips and advice will appear here after enrichment."

### D5 — Plan Natural Language Refinement
**Status**: `[ ]` Not started  
**Why**: Users want to iterate on plans ("Make it more budget-friendly", "Add more food") but currently must regenerate from scratch. Natural language modifiers compound the plan value.  
**Files**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`  
**What to do**:
- Add a text input at the bottom of a generated plan: `"Refine this plan…"` placeholder
- On submit: append the modifier as a new `preferences` string and re-run the planner, passing it as a named variant (e.g. "Relaxed pace version")
- The new variant is saved as a separate `Trip` record via the existing multi-version support (A10)
- Show "Refining…" with a spinner; reveal the new plan in the version selector when done
- Input should suggest 3 quick chips: `"More relaxed"` · `"Budget-friendly"` · `"Add food stops"`

### D6 — Seasonal Enrichment Warnings in Plans
**Status**: `[ ]` Not started  
**Why**: Plans currently have no real-world context. A plan for Tokyo in late March misses the Sakura season impact. This is a top strategic differentiator.  
**Files**: new `lib/enrichData.ts`, `app/api/plan/route.ts`  
**What to do**:
- Create `lib/enrichData.ts` with a static dataset of major travel events (no API needed):
  - Structure: `{ location: string, country: string, event: string, startMM: number, startDD: number, endMM: number, endDD: number, type: 'festival'|'season'|'holiday'|'weather', warning: string, severity: 'info'|'caution'|'warning' }[]`
  - Include: Cherry Blossom Japan (Mar 20–Apr 15), Golden Week Japan (Apr 29–May 6), Typhoon Season Japan/Taiwan (Jul–Oct), Songkran Thailand (Apr 13–15), Diwali India (Oct–Nov), Chinese New Year (variable, Jan–Feb), Monsoon SE Asia (May–Oct), Mardi Gras NOLA (Feb), Christmas markets Europe (Dec)
- In `app/api/plan/route.ts`, extract destination countries/cities from clip locations. If travel dates are present in preferences string, check for overlapping events
- Prepend any matching warnings to the planner system prompt: `"⚠️ Context: user's trip dates overlap with [Event] — flag this in the plan output as an inline advisory"`
- In the plan output, events appear as `⚠️ Cherry Blossom season (Mar 25–Apr 14): accommodation typically 40% above average` inline with relevant activities

### D7 — Pull-to-Refresh on Inbox
**Status**: `[ ]` Not started  
**Files**: `app/inbox/page.tsx`  
**What to do**:
- Detect a downward drag gesture at the top of the inbox list
- On trigger: re-query IndexedDB, re-run the pending retry queue (same logic as A2)
- Show a spinner at the top during the refresh
- Use the `touchstart`/`touchmove`/`touchend` events to track the drag delta; trigger at 60px overscroll
- On Capacitor, show a subtle bounce animation on the scroll container

### D8 — App Icon at All Required iOS Sizes
**Status**: `[ ]` Not started  
**Why**: The Xcode project currently only has one icon size. App Store submission requires 13+ sizes.  
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`  
**What to do**:
- Add a `generate-icons.mjs` script in the `ios/` directory that uses `sharp` (installable via npm) to resize the existing 512×512 PNG AppIcon to all required iOS sizes:
  - 20×20, 40×40, 60×60 (notification)
  - 29×29, 58×58, 87×87 (settings)
  - 76×76, 152×152 (iPad)
  - 83.5×83.5 @2x = 167×167 (iPad Pro)
  - 120×120, 180×180 (iPhone home screen)
  - 1024×1024 (App Store)
- Update `Contents.json` with all entries pointing to the generated files
- Add `npm run ios:icons` script to `package.json`

### D9 — Privacy Policy Page
**Status**: `[ ]` Not started  
**Why**: Required for App Store submission. Apple will reject without it.  
**Files**: new `app/privacy/page.tsx`  
**What to do**:
- Create a clean, minimal `/privacy` page
- Content sections: What we collect (nothing server-side in v1; clips stored locally in IndexedDB on your device), How AI works (URLs sent to Anthropic Claude for extraction; no personal data attached), Third-party services (PostHog analytics — optional, no-op without key; Resend email — only if RESEND_API_KEY is set), Data deletion (clear your IndexedDB via Settings → Export and delete), Contact
- Add a "Privacy Policy" link in the Settings page footer

---

## PHASE D — On-Trip Mode & Memory (Next Sprint)

### C1 — On-Trip GPS Mode
**Status**: `[ ]` Not started  
**Files**: new `app/trip/[id]/page.tsx`, new `components/OnTripView.tsx`  
**What to do**:
- Add a "Start Trip" button on the plan view that enters on-trip mode for that plan
- On-trip view: shows today's activities as a vertical timeline, current time highlighted
- GPS "I'm here" button: uses `navigator.geolocation` to find the closest remaining activity stop
- Walking time estimate to next pin: straight-line distance → ÷ 80m/min walking speed
- "Done" tap marks an activity as visited (stored in the Trip record)
- Day selector at top to jump to tomorrow

### C2 — Post-Trip Timeline
**Status**: `[ ]` Not started  
**Files**: `app/boards/[id]/page.tsx`  
**What to do**:
- On a board that has a completed trip (all activities checked), offer "View trip summary"
- Timeline view: activities in chronological order with visited timestamps
- Simple visual: a vertical line with dots for each stop, like a Polarsteps journey

### C3 — Shared Boards v1 (Read-Only Link)
**Status**: `[ ]` Not started  
**Files**: `app/boards/[id]/share/page.tsx` (new), `app/api/board-share/route.ts` (new)  
**What to do**:
- "Share board" button on the board detail page generates a signed URL: `/boards/[id]/share?token=<hash>`
- The share token is a HMAC of `boardId + salt` stored in localStorage
- Anyone with the link can view the board's clips and map (read-only, no substance or notes)
- No server needed: the token is verified client-side; the board data loads from the original IndexedDB origin (requires Supabase B1 to be cross-device, but works as a "share what I'm viewing" for same-device until then)

### C4 — Proactive Resurfacing Banner
**Status**: `[ ]` Not started  
**Files**: `app/page.tsx`, `app/inbox/page.tsx`  
**What to do**:
- On app open, check if any board's clip tags contain a location that the user has searched or planned for recently
- If a board has ≥5 clips and no plan yet: show a banner `"You have 12 Tokyo saves. Ready to plan your trip? →"`
- Dismissible per-board, stored in localStorage
- Shown at most once per 7 days per board

---

## PHASE E — App Store Launch (Final Sprint)

### E1 — TestFlight Build Checklist
**Status**: `[ ]` Not started  
**Files**: `ios/App/ShareExtension/XCODE_SETUP.md`  
**What to do**:
- Write a complete, step-by-step TestFlight submission checklist in `ios/App/TESTFLIGHT.md`:
  - Xcode version + CocoaPods version requirements
  - Bundle ID and App Group setup
  - Share Extension target wiring (see XCODE_SETUP.md)
  - Capacitor server URL (set to deployed Vercel URL)
  - Archive → Distribute → App Store Connect upload flow
  - Required metadata: screenshots, description, keywords, support URL, privacy URL
- Minimum viable metadata template (copy-paste ready for App Store Connect)

### E2 — App Store Screenshot Templates
**Status**: `[ ]` Not started  
**Files**: new `marketing/screenshots/`  
**What to do**:
- Create 5 conceptual screenshot captions for the App Store listing (each becomes a device frame + caption image):
  1. "Save travel inspiration in 2 taps" — shows the iOS Share Sheet → board picker
  2. "AI extracts locations and tips automatically" — shows InboxCard with substance badges
  3. "Organize into beautiful boards" — shows boards page with emoji + clip thumbnails
  4. "Plan your trip with AI" — shows the streaming plan generation
  5. "Export to calendar. Pack your bags." — shows the plan export dialog
- These are text-only specs for a designer; include recommended device frames (iPhone 15 Pro, iPhone SE)

### E3 — Multilingual: Chinese UI Strings
**Status**: `[ ]` Not started  
**Why**: 40%+ of target users come from Xiaohongshu/WeChat. A Chinese UI removes friction for the largest user segment.  
**Files**: new `lib/i18n.ts`, all UI components  
**What to do**:
- Create `lib/i18n.ts` with a `t(key)` function and a `LanguageContext`
- Default: detect browser language; fallback to `en`
- Translate the 40 highest-frequency UI strings to Simplified Chinese: all nav labels, button text, empty states, share page, error messages
- Add a language toggle in Settings (🇺🇸 / 🇨🇳)
- Do NOT translate dynamic AI-generated content (plans, clip titles)

---

## Completed Tasks

*(Claude marks tasks [x] and moves them here when done)*
