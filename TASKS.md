# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Recommended Execution Order (revised 2026-06-01)

All Phase A and Phase B tasks are complete. The next goal is a **beautiful, fully functional iOS app** — this means Phase C (on-trip UX + iOS polish) comes before Phase D (cloud/Pro).

`C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9 → C10 → D1 → D2 → D3`

Phase C focuses on features that make TravelPanel irreplaceable on a real trip. Phase D activates the cloud sync scaffolding (already built in B1) and launches Pro.

---

## PHASE A — Bug-Free MVP (Completed)

All A tasks are done: substance extraction, enrichment retry, analytics, cost guard, resource banners, pin clustering, full-text search, onboarding seed boards, plan export (PDF + .ics), multi-version plans, substance wisdom view, substance threaded into trip plans.

---

## PHASE B — Cloud Sync + Browser Extension (Completed)

All B tasks are done: Supabase scaffolded (dormant until keys), Chrome/Safari browser extension, Xiaohongshu Claude Vision fix, Claude-powered vibe/semantic search, cloud backup export + settings page.

---

## PHASE C — On-Trip Mode + iOS Polish (Current Sprint)

### C1 — On-Trip Mode: "I Just Landed" View
**Status**: `[ ]` Not started  
**Why**: This is the highest-frequency use case — users check the app every few hours during a trip. It's white space no competitor owns. The Phase C moat.  
**Files to create/change**: `app/ontrip/page.tsx`, `app/ontrip/[tripId]/page.tsx`, `components/OnTripCard.tsx`, update `app/plan/[boardId]/page.tsx` to add "Start Trip" button  
**What to do**:
- Add a "Start Trip" button on any saved trip plan view (`app/plan/[boardId]/page.tsx`). This sets `trip.status = 'active'` and records `startedAt` in the Trip IndexedDB record.
- Add a new `status?: 'planning' | 'active' | 'completed'` field to the `Trip` type in `lib/types.ts` and migrate in `lib/db.ts`.
- Create `app/ontrip/page.tsx` — the on-trip dashboard. If there's an active trip, redirect to `/ontrip/[tripId]`. If not, show a list of saved plans with "Start" buttons.
- Create `app/ontrip/[tripId]/page.tsx`:
  - Show the current day's activities (based on `startedAt` date + elapsed days)
  - Each activity shows: time, location name, duration, tips, sourced tips
  - A "Walking directions" button that opens Apple Maps / Google Maps with coordinates
  - A "Mark visited ✓" button per activity (see C2)
- Add "On Trip" tab to `components/NavBar.tsx` (replace or add 5th item with a `Compass` icon linking to `/ontrip`). Update `NavBarProps` type.
- Style: card-based, large tap targets, high contrast for outdoor sunlight readability

### C2 — Location Check-In (Mark Visited)
**Status**: `[ ]` Not started  
**Depends on**: C1  
**Files to change**: `lib/types.ts`, `lib/db.ts`, `app/ontrip/[tripId]/page.tsx`  
**What to do**:
- Add `visitedActivityIds?: string[]` to the `Trip` type (or add an `activityId` field to DayPlan activities). Each activity needs a stable ID: generate them as `day-${dayNum}-activity-${index}` during plan creation.
- Update `lib/types.ts` → `Activity` gets an optional `id?: string`; update `app/api/plan/route.ts` to assign IDs to activities.
- Add `markActivityVisited(tripId, activityId)` to `lib/db.ts`.
- In the on-trip view: tapping "Mark visited ✓" calls `markActivityVisited` and styles the card with a green checkmark + strikethrough. Visited activities collapse by default; tap to expand.
- Progress indicator at top: "Day 2 — 3 of 7 stops visited" with a progress bar (indigo).

### C3 — Offline Plan Cache (Essential for Travelers)
**Status**: `[ ]` Not started  
**Why**: Travelers lose signal constantly. An uncached plan is unusable in a foreign city without data.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `lib/db.ts`, `lib/types.ts`  
**What to do**:
- Plans already persist in IndexedDB (via `saveTrip`), so the plan data itself is offline. The gap is the map tiles and the UI confirming "this is available offline."
- Add a `cachedAt?: number` timestamp to the `Trip` type. When a plan is generated, set `cachedAt = Date.now()`.
- Add an "Offline ready" badge to the plan view when `cachedAt` is set: a small green pill showing "✓ Available offline."
- On the plan view, ensure the trip plan JSON is always read from IndexedDB first (it should be already via `getTripsForBoard`). If no trip exists, show the "Generate Plan" UI.
- Add a "Download for offline" button that explicitly calls `saveTrip` with the current plan + sets `cachedAt`. Show a brief toast "Saved for offline use."
- In `app/ontrip/[tripId]/page.tsx`, ensure the entire page renders from IndexedDB only (no API calls). Add a top banner if the device is offline: "You're offline — showing saved plan."

### C4 — YouTube Transcript Extraction
**Status**: `[ ]` Not started  
**Why**: YouTube is the second-biggest source of travel content. Currently Claude only sees the title and meta description — transcript gives 10× more substance.  
**Files to change**: `app/api/import/route.ts`  
**What to do**:
- Add a `fetchYouTubeTranscript(url: string): Promise<string | null>` function inside `app/api/import/route.ts`.
- Approach: extract the video ID from the URL, then fetch `https://www.youtube.com/watch?v=<id>` with the existing `fetchPageData` approach + also extract the `ytInitialData` JSON embedded in the page.
- From `ytInitialData`, parse `captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl`. Fetch that URL to get a WebVTT/ttml caption file.
- Parse the caption file: strip timestamps and tags, collapse runs of whitespace, limit to 4000 chars.
- If transcript is successfully fetched, append it to the `textContent` passed to Claude in the extraction prompt under a `## Transcript` section.
- Graceful fallback: if `ytInitialData` parse fails or captions are unavailable, fall through to existing title+description extraction.
- The entire transcript fetch is server-side (no CORS issue); no API key required.

### C5 — Weather + Festival Enrichment for Trip Plans
**Status**: `[ ]` Not started  
**Why**: A plan for Tokyo in late March without flagging Cherry Blossom season, 40% price surge, and 3-hour queue times is not useful. This is a structural differentiator vs. chatbot travel apps.  
**Files to change**: `app/api/plan/route.ts`, possibly new `lib/enrichPlan.ts`  
**What to do**:
- Create `lib/enrichPlan.ts` with a `getContextualEnrichment(destinations: string[], travelDates: string): Promise<EnrichmentContext>` function.
- `EnrichmentContext` = `{ warnings: string[], events: string[], bestTimes: string[] }` — a simple struct with inline-injectable strings.
- The function calls Claude Haiku with a prompt like: "For a traveler visiting [destinations] in [dates], list: (1) any major festivals or public holidays that would cause crowd surge or closures, (2) seasonal weather context, (3) any price-surge periods. Be specific and factual. Return only information you're confident about."
- In `app/api/plan/route.ts`, call `getContextualEnrichment` early in the route handler (before the itinerary generation). Pass the result into the final itinerary prompt as a `## Real-World Context` section.
- The planner prompt should be updated to say: "When an activity is affected by the context above, include a brief ⚠️ warning inline in its tips array, e.g. '⚠️ Cherry Blossom peak — book tickets 2 months ahead.'"
- Add a `travel_dates?: string` field to the plan generation request body (alongside `preferences`). Update the plan page UI to show a date range picker before generation.

### C6 — Smart Inbox Auto-Sort (AI Board Suggestion)
**Status**: `[ ]` Not started  
**Why**: Users save clips without thinking about organization. Auto-sort turns the inbox from a pile into a curated collection without the user doing anything.  
**Files to change**: `app/share/page.tsx`, new `app/api/sort/route.ts`  
**What to do**:
- Create `app/api/sort/route.ts`: POST `{ itemTitle, itemDescription, itemTags, boards: [{id, name, emoji}] }` → `{ boardId: string | null, confidence: number }`.
- Uses Claude Haiku. Prompt: "Given this clip and these boards, which board should this clip go in? Return the board ID with highest confidence, or null if none fit well. Only return a board ID if confidence > 0.7."
- After a clip is saved in `app/share/page.tsx`, if the user has ≥2 boards, call `/api/sort` in the background with the enriched item data.
- When a suggestion comes back with confidence ≥ 0.7: show a subtle bottom toast — "Move to [emoji] [name]? [Yes] [No thanks]". If user taps Yes, call `addItemToBoard`. Dismisses after 5s automatically.
- Track: `clip_auto_sorted` event in analytics.

### C7 — Plan Iteration via Natural Language
**Status**: `[ ]` Not started  
**Why**: Users want to tweak plans without regenerating from scratch. "Make Day 2 more relaxed" or "Remove the shopping stops" should work instantly.  
**Files to change**: `app/plan/[boardId]/page.tsx`, `app/api/plan/route.ts`  
**What to do**:
- Add a natural language input bar below the plan output: a text field with placeholder "Tweak this plan… (e.g. 'make Day 2 more relaxed')" and a "→" submit button.
- On submit, call `/api/plan` again but with two additional fields: `existingPlan: TripPlan` (the current plan JSON) and `revision: string` (the user's request).
- In `app/api/plan/route.ts`, detect when `revision` + `existingPlan` are present. Build a modified prompt: "You have an existing trip plan (JSON below). The user wants the following revision: '${revision}'. Produce an updated plan that incorporates this change while keeping everything else the same."
- The revised plan is saved as a NEW version (same board, incremented name: "Version 2", "Version 3") using the existing multi-version system from A10.
- The input bar should be visible only when a plan is already generated. After submission, show the same streaming loading state as a fresh plan generation.

### C8 — Visible Reasoning in Plan Stream (Agent UX)
**Status**: `[ ]` Not started  
**Why**: Showing the thinking builds trust and matches 圆周旅记's UX — the key competitive signal that makes users feel a knowledgeable friend is helping them, not an algorithm.  
**Files to change**: `app/api/plan/route.ts`, `components/PlannerAgent.tsx`, `app/plan/[boardId]/page.tsx`  
**What to do**:
- Extend the NDJSON stream types: add `{ t: 'thinking'; message: string }` alongside existing `step` and `plan` types. Update `lib/types.ts` `PlanStreamMessage`.
- In `app/api/plan/route.ts`, emit `{ t: 'thinking' }` messages at key moments: after loading clips ("📎 Loaded 23 clips across 8 locations"), during clustering ("🗺 Grouping by neighborhood — found Shinjuku, Shibuya, Harajuku clusters"), before enrichment ("🌸 Checking seasonal context for March dates"), before final generation ("✍️ Writing your 5-day itinerary with 14 sourced tips").
- In `components/PlannerAgent.tsx`, render `thinking` messages as a subtle animated ticker above the main step list — small, monospace-style text in gray, cycling through recent messages.
- In the plan view, the thinking messages should fade out once the final plan arrives, leaving only the plan content.
- Style: thinking messages are displayed in a `bg-gray-50 rounded-xl` box with a pulsing dot (`animate-pulse`) to convey active processing.

### C9 — Multilingual UI (Chinese / 中文)
**Status**: `[ ]` Not started  
**Why**: The target user base is bilingual Chinese speakers (EN + 中文). Chinese UI strings are the single highest-leverage localization given the Xiaohongshu/WeChat/Douyin clip sources.  
**Files to change**: `app/layout.tsx`, all major components, new `lib/i18n.ts`, new `locales/en.json`, `locales/zh.json`  
**What to do**:
- Install `next-intl`: `npm install next-intl`.
- Create `locales/en.json` and `locales/zh.json` with all user-facing strings. Key strings to cover: all NavBar labels, all empty states, all button labels, all toast messages, all plan-related copy.
- Create `lib/i18n.ts`: a lightweight `useT(key: string): string` hook that reads from the active locale JSON without the full next-intl middleware (to avoid routing complexity). Store the selected locale in localStorage (`travelPanelLocale`).
- In `app/layout.tsx`: initialize locale from localStorage on first render.
- Add a language toggle in `app/settings/page.tsx`: two buttons "EN" / "中文" that set the locale.
- Update all major components to use `useT()` for every user-facing string. Focus first on: NavBar, InboxPage, share/page.tsx (the critical capture flow), plan view, InboxCard, LocationDetailCard.
- zh.json priority strings: all NavBar labels, share page copy ("Save to:", "Inbox", "Return to app"), plan view CTAs, empty states.

### C10 — Wisdom Tab (Per-Board Substance Library)
**Status**: `[ ]` Not started  
**Why**: At 200+ saves, the substance layer becomes a personal travel knowledge base. The "Wisdom" tab is the payoff — browse and search tips/warnings from all your clips in one place.  
**Files to change**: `app/boards/[id]/page.tsx`, new `components/WisdomTab.tsx`  
**What to do**:
- In `app/boards/[id]/page.tsx`, add a tab switcher: "Clips" | "Wisdom" | "Map" (or add Wisdom alongside existing tabs if they exist).
- Create `components/WisdomTab.tsx`:
  - Receives a list of `SavedItem` (the board's items)
  - Flattens all `item.substance` arrays across all items into a single list, each entry tagged with its source item title
  - Groups by type: Tips (💡), Warnings (⚠️), Opinions (💬), Wisdom (🧠), Context (🌍), Recommendations (⭐)
  - Each substance item shows: type icon + content + "from: [clip title]" in small gray text
  - If `source_quote` is present, show it as a subtle italic blockquote below the content
  - Add a search input at the top: filter substance items by keyword
  - Empty state: "No tips extracted yet. Save some clips to see your travel wisdom here."
- Performance: memo the substance aggregation to avoid recalculating on every render.

---

## PHASE D — Cloud Sync + Pro Launch (Next Sprint)

### D1 — Supabase Auth UI (Activate B1 Scaffolding)
**Status**: `[ ]` Not started  
**Needs**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from user  
**Files to change**: `app/settings/page.tsx`, new `components/AuthSheet.tsx`  
**What to do**:
- In `app/settings/page.tsx`, add a "Sign in / Sync" section that renders when `cloudEnabled` is false (showing "Add keys to enable") and a sign-in UI when keys are present.
- Create `components/AuthSheet.tsx`: a bottom sheet with magic-link email input and Google OAuth button, using `signInWithEmail()` and `signInWithGoogle()` from `lib/supabase.ts`.
- On successful sign-in, show the user's email + a "Sync now" button. Call `syncNow()` from `lib/cloudSync.ts`.
- Wire `syncNow()` on app focus (`visibilitychange` event) and on auth state change.
- Show a sync status indicator: last synced timestamp in settings.

### D2 — Full Cloud Sync Activation (Multi-Device)
**Status**: `[ ]` Not started  
**Needs**: Supabase project set up + schema.sql run  
**Files to change**: `lib/cloudSync.ts`, `app/layout.tsx`  
**What to do**:
- Run `supabase/schema.sql` on a Supabase project. Add `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` to Vercel env vars.
- In `app/layout.tsx`, wire `onAuthChange` callback: when session becomes non-null, call `syncNow()`.
- Add a `window.addEventListener('focus', syncNow)` call in `app/layout.tsx` for on-app-focus sync.
- In settings, show a "Last synced: 2 minutes ago" timestamp.
- Test: save on one device, open another → clips appear within 30s.
- Edge case: demo/seed items (`.isDemo = true`) must be excluded from cloud sync (already guarded in `cloudSync.ts`).

### D3 — Pro Tier Paywall UI
**Status**: `[ ]` Not started  
**Why**: Revenue enables the 12-month vision. Pro gates features users actually pay for.  
**Files to change**: `app/settings/page.tsx`, `lib/rateLimits.ts`, `components/UpgradePrompt.tsx`  
**What to do**:
- Create `components/UpgradePrompt.tsx`: a bottom sheet shown when a rate limit is hit. Shows what the limit is, what Pro unlocks, and a "Get Pro" CTA (for now: links to a Tally/Typeform waitlist page).
- Pro features (gate behind `isProUser` flag in localStorage until Stripe is wired):
  - Unlimited plan generations per day (vs. 5 free)
  - Unlimited enrichments per hour (vs. 10 free)
  - Cloud sync (vs. local-only)
  - Priority plan generation (Opus model vs Haiku)
- In `app/settings/page.tsx`, add a "TravelPanel Pro" card showing the current plan (Free / Pro), and a "Upgrade" button that opens the upgrade sheet.
- Add `isProUser()` check in `lib/rateLimits.ts`: if `localStorage.getItem('travelpanel_pro') === 'true'`, bypass all limits.
- Track: `upgrade_cta_clicked`, `upgrade_sheet_viewed` events.

---

## PHASE E — Platform + Polish (Future)

### E1 — CookPanel Spike
**Status**: `[ ]` Not started  
**What to do**: Extract `@clip-engine/*` workspace (Turborepo). Build 10% of CookPanel (recipe clip → ingredient list output) to validate shared infrastructure viability.

### E2 — Home Screen Widget (iOS)
**Status**: `[ ]` Not started  
**What to do**: Capacitor + WidgetKit to show today's on-trip activities on the iOS home screen.

### E3 — Real-Time Shared Boards
**Status**: `[ ]` Not started  
**What to do**: Supabase Realtime channels for live collaborative board editing. Pro feature.

### E4 — Discovery / AI Board Suggestions
**Status**: `[ ]` Not started  
**What to do**: Based on clipping history, proactively suggest "You might want to save this type of content" — opt-in, never algorithmic feed.

---

## Completed Tasks

### Phase A (all done)
- A1 Substance Extraction ✓
- A2 Enrichment Retry Queue ✓
- A3 PostHog Analytics ✓
- A4 AI Cost Guard ✓
- A5 In-App Resource Request Notifications ✓
- A6 Pin Clustering ✓
- A7 Full-Text Search ✓
- A8 Onboarding Seed Boards ✓
- A9 Plan Export (PDF + Calendar) ✓
- A10 Multi-Version Plan Support ✓
- A11 Substance in Clip Detail (Wisdom view) ✓
- A12 Substance Threaded into Trip Plans (sourced itineraries) ✓

### Phase B (all done)
- B1 Supabase Scaffolding (dormant until keys) ✓
- B2 Browser Extension (Chrome/Safari) ✓
- B3 Xiaohongshu Fix (Claude Vision) ✓
- B4 Vibe/Semantic Search (Claude query expansion) ✓
- B5 Cloud Backup Export + Settings Page ✓
