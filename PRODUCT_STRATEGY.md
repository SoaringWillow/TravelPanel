# TravelPanel: Product Strategy & Roadmap

> Last updated: May 2026. Maintained as a living document. Revise when strategic direction shifts, not after every feature ship.

---

## Executive Summary

**Thesis**: The moat is the clip action, not the AI plan. TravelPanel's defensible advantage is that a user can share from any social app in 2 taps and have their save instantly extracted, titled, and organized — and that corpus of organized saves compounds in value the longer they use the app. Everything else (planning, map, export) is downstream value from the clip corpus the user builds.

**Top 6 strategic bets:**
1. **Substance over Spots.** Every clip carries two layers — a geographic skeleton (pins) AND the actual content (warnings, tips, opinions, mistakes-to-avoid). Competitors throw away the substance and keep only pins. We extract, store, and surface substance as first-class data. This is the deepest moat in the document.
2. Nail the iOS Share Sheet flow before building anything else — it is the product
3. Build an enrichment layer that injects real-world signals (festivals, weather, prices) into the planner, bridging the gap that social media guides can't close
4. Extract the Clip Engine as modular shared infrastructure, then launch CookPanel as the first sibling vertical
5. Add full-text + embedding hybrid search across both spots AND substance — the hidden "killer feature" users discover when they have 200+ saves
6. Own the on-trip execution moment ("I just landed, what's my day?") — the white space no competitor has touched

**Top 5 non-bets (v1):**
1. In-app booking or affiliate commissions
2. Social feed or public itinerary sharing
3. AI chatbot as front door (generic "what to do in Paris" is commodity)
4. Third language before 50K DAU
5. React Native rewrite before Capacitor is tried

**12-month goal**: TravelPanel is the default travel inspiration manager for 5,000 weekly active users, with a measurable clip-to-plan conversion rate and a Pro tier generating sustainable revenue.

**North Star metric**: Weekly clips per active user. Proxy for habit formation and the ambient organization promise.

---

## Part I: Current State Assessment

### What the MVP Does Well

The MVP has a tight, credible core loop. The share-target flow (`app/share/page.tsx`) is fast and frictionless — a three-stage UI (board picker → saving → done) that auto-dismisses, with enrichment firing in the background via keepalive POST. This is the right UX decision: don't make the user wait for enrichment to complete.

The Claude extraction (`app/api/import/route.ts`) is well-structured. Zod schema validation on Claude output means location extraction is reliably typed, not brittle string parsing. The streaming NDJSON planner (`app/api/plan/route.ts`) keeps UX responsive during long generation — users see progress, not a blank screen. This detail will matter significantly in user testing.

The local-first architecture (IndexedDB v2 via `lib/db.ts`) is correct for a travel app where users plan on planes and in low-signal zones. Offline-first reduces server costs and latency, and is a strategic asset: the user's clip corpus is always available, always fast.

### Where the MVP Is Weak

**Silent enrichment failures**: Enrichment is fire-and-forget with zero retry. Items silently fail to enrich — no error toast, no retry queue, no visual indicator. Users will see empty cards and blame the app, not the network.

**Chinese platform coverage is blocked**: Xiaohongshu (RED) and WeChat images return empty due to anti-scraping. `FUTURE_NOTES.md` flags "try harder CSS selectors" — this is a dead end. The fix is accepting the iOS Share Sheet image payload and using Claude Vision to describe it.

**No full-text search**: Only indexed-field queries exist. At 200+ saves, users will hit the "wait, where did I save that Tokyo cafe?" wall and find nothing. This becomes a retention cliff — the app goes from "helpful" to "unusable."

**Planner lacks real-world enrichment**: No festival calendar, no weather signals, no price-surge awareness. A plan for Tokyo in late March will recommend an itinerary without flagging Sakura season, 2× accommodation prices, and 3-hour queue wait times.

**No export or backup**: Users lose all data on device wipe. After 6 months of clipping, this is existential. Export (PDF, calendar, JSON) must exist before marketing to power users.

**Planner clustering relies entirely on Claude**: No distance matrix, no TSP optimization. Works for 10–20 locations; will produce visibly bad routes at 50+.

**Empty app on first launch**: New user sees a blank globe and bounces. No demo boards, no onboarding seed, no social proof of what the populated app looks like.

### Tech Debt Registry

| Issue | Severity | Effort |
|---|---|---|
| Fire-and-forget enrichment, no retry | High | 1–2h |
| Silent error handling throughout DB/API | High | 2–4h |
| No error tracking (Sentry/PostHog) | High | 1h |
| No analytics (North Star is unmeasurable) | High | 1h |
| No AI cost ceiling per user | High | 2–3h |
| Chinese platform thumbnails blocked | Medium | 4–8h |
| No full-text search | High (by month 3) | 4–8h |
| No export/backup | High (by month 2) | 3–4h |
| No test suite | Medium | Ongoing |
| next-pwa sw.js churn on builds | Low | Medium |

---

## Part II: Competitive Landscape

### 圆周旅记 (Yuanzhou Lüji)

China's most technically impressive travel planner. Standouts: a streaming agent UX with visible reasoning chains ("thinking about how to cluster your locations..."), geographic clustering that groups by neighborhood and district (Shibuya vs Shinjuku vs Harajuku, not just "Tokyo"), and multi-day route visualization with transport modes between stops.

What it gets right: streaming agent UX makes users feel like a knowledgeable friend is actively thinking. District-aware clustering is more useful than GPS-only distance grouping. The progressive disclosure of reasoning builds trust.

What it lacks (critical):
- **Spot-only extraction**. 圆周旅记 reduces every input to a list of locations. The actual content of source posts — warnings, opinions, "best time to go," "skip the official tour" — is discarded. The plan output is geographic but informationally hollow.
- It's a planning tool, not a capture tool. Users must manually enter destinations. No ambient organization from social feed clipping.

**Lesson**: Build visible reasoning into the plan-generation streaming UX. Show the thinking, not just the output. **AND**: do not make the same spot-only mistake — extract substance alongside spots from the very first clip.

### Romy

A beautifully designed trip board app. Romy's main innovation is a block-based itinerary builder — draggable time blocks, rich cards per place, polished day-view. Very well-designed output.

Critical weakness — the **spot-extraction trap**: Share a YouTube video titled "35 mistakes to avoid when visiting Hawaii" and Romy returns ~9 incidental pins from the video. The content of the video — the actual 35 mistakes, which is the *entire point* of saving the video — is discarded. This is worse than not clipping the video at all, because the user feels confident their wisdom is captured when in fact only the geographic skeleton was preserved. Romy has converted a piece of substance into a list of irrelevant Google Maps stars.

Other weaknesses: Romy is manual-first; AI is surface-level autofill rather than generative planning; the "blocks" metaphor is closer to a Google Calendar than a travel intelligence layer.

**Lesson**: The block/timeline view for day plans is the right mental model for plan output — take the visual language. **AND**: the spot-extraction trap is the single biggest gap in the competitive set. The clip's content matters more than its coordinates. Building substance extraction is a structural moat that requires Romy to rearchitect, not just ship a feature.

### Wanderlog

Best-in-class for group coordination: shared editing, voting on places, Google Maps integration, flight/hotel import. Feature-complete as a collaborative tool.

Weakness: spreadsheet vibe. Wanderlog feels like shared Google Docs for travel. It lacks the inspiration capture layer (no "save from Instagram") and lacks opinionated AI (every place is treated as equal, regardless of travel style fit).

**Lesson**: Collaboration is real demand, but v3+ for us. Do not build the spreadsheet; build the taste layer.

### Polarsteps

Post-trip storytelling: GPS background tracking → beautiful visual journey log. Strong on memory; not a planning competitor. Their UX for the "visual journey" output is worth borrowing for plan export design.

**Lesson**: The "here's what your trip looked like" end-screen is a product moment worth building in Phase C.

### Layla / Mindtrip / Bemo / GuideGeek

The 2024–26 AI travel chatbot wave. All four are essentially: "tell me what to do in Paris" → AI-generated itinerary with links. None have solved the capture problem. All are session-based — you ask, get a plan, leave. None accumulate user-specific intent over time.

The saturation of this space is a positive signal: it confirms that plan-generation output is commodity. The differentiation is upstream. Our killer question is not "what should I do in Tokyo?" — it's "turn my 40 Tokyo saves from the last 6 months into a real, personalized plan."

**Lesson**: We are not in the chatbot travel category. Do not position for it or design for it.

### Mafengwo / Xiaohongshu (RED)

The source platforms where inspiration lives in China. Neither has a save-to-plan loop. RED has a "collect" feature but it is basic — no AI, no organization, no planning. These platforms are an inspiration layer, not a planning tool. Their users are actively looking for something to do with their saves.

**Lesson**: The gap is not that these platforms lack content. It is that none of them close the loop between "save this post" and "turn your saves into an actionable plan."

### mymind

Cross-domain "save anything" AI organizer. mymind's core design principle: zero manual organization, everything sorted by AI. Strong retention among knowledge workers. No travel-specific output layer.

**Lesson**: The ambient organization promise is the right product promise. Apply it to travel specifically. The demo is the same — save for 3 months, open the app, boards have organized themselves.

### Google Maps Lists

The default. Every user already has access. It is bad enough to leave room: no social capture, no AI organization, no narrative trip planning output. But it has one advantage: every location in the world has exact coordinates and rich metadata.

**Lesson**: Do not fight Google Maps on data quality. Fight on experience: save from social in 2 taps → get a real, personalized plan enriched with real-world context.

---

## Part III: Strategic Positioning

### The Funnel and Where We Live

```
INSPIRATION → SAVE → ORGANIZE → PLAN → EXECUTE → REMEMBER
   RED/IG        ↑ We own      ↑             ↑ White space
                 these two
```

- **Inspiration**: RED, Instagram, TikTok, YouTube. We integrate as a destination, not a competitor.
- **Save + Organize**: We own this. No competitor does both well.
- **Plan**: We do this; Layla/Mindtrip/圆周旅记 also do this. Our plan is grounded in your specific saves and enriched with real-world context.
- **Execute**: On-trip "what's next?" mode. Nobody owns this well.
- **Remember**: Polarsteps owns post-trip story; we can add a lightweight memory mode in Phase C.

### The Ambient Organization Promise

The killer demo is not "here's a plan I generated in 10 seconds." The killer demo is:

> Open TravelPanel after 3 months. You saved 127 things from Instagram, YouTube, and RED without ever thinking about where they went. Tap the Japan board. There are tabs for Kyoto, Osaka, and Tokyo — organized by city, then neighborhood, tagged by vibe. You haven't touched this app to organize anything. It just happened.

This is the product promise. Every feature decision should ask: does this make the ambient organization promise more real, or is this a distraction?

### Enrichment as the Key Differentiator

Social media travel content is structurally incomplete. A RED post about a Tokyo cafe has the address and aesthetic. It does not have: the price spike during Sakura season, the 45-minute queue on Sundays, the fact that it is cash-only, the weather suitability of the travel window. The trip planner must close this gap.

The `@clip-engine/enrich` module injects real-world signals at plan-generation time:

- **Festival and event calendar**: Major annual events (Cherry Blossom season, Golden Week, Diwali, Mardi Gras, Carnival, Christmas markets) with historical price-surge multipliers and crowd-density signals.
- **Weather suitability window**: "October is ideal; July is typhoon season in Okinawa."
- **Travel-surge periods**: School holidays, public holiday clusters, backpacker peak season.
- **Entry conditions**: Visa requirements and known advisories for the destination.

Enrichment signals are surfaced inline in the plan output — not in a separate "info panel" but as actionable warnings within the itinerary: `⚠️ Tokyo Cherry Blossom peak is Apr 1–14 — accommodation is typically 40% above average on your dates. Consider early March or late April instead.`

User toggle: **"My clips only"** ↔ **"Clips + trusted online context"**. Default is enrichment on. Each signal is dismissible, and the user can ask the planner to re-route around constraints.

This is the differentiation that the chatbot travel apps cannot copy by adding a feature — it requires a clip corpus to be meaningful. Layla can tell you about Golden Week. TravelPanel tells you that Golden Week overlaps with *your* specific trip dates and *your* specific saved accommodation neighborhoods.

### The Clip Action Is Not Optional

The share-sheet flow is not a convenience feature. It is the product. If the save flow breaks, becomes slower, or becomes more awkward, retention collapses within weeks. Every infrastructure decision should be measured against its effect on capture friction.

### Substance over Spots — The Deepest Moat

Every clip carries two distinct kinds of value:

- **Spots** — geographic skeleton: locations, addresses, coordinates. What Romy and 圆周旅记 extract.
- **Substance** — the actual content: warnings, opinions, tips, "go in the morning," cash-only flags, "skip the official tour, do this instead," "first-timer mistakes," seasonal advice, contextual rules.

Competitors throw away the substance and keep only the spots. This is a category of failure, not a missing feature. A YouTube video titled "35 mistakes to avoid when visiting Hawaii" is structurally not about spots — it's about wisdom. Reducing it to 9 incidental pins is worse than not clipping it at all, because the user is given false confidence that their research is captured.

**TravelPanel extracts both layers from every clip and stores substance as first-class data.**

```
Clip extraction output:
{
  spots:     [...locations, lat/lng, addresses...],
  substance: [{
    type: 'tip' | 'warning' | 'opinion' | 'wisdom' | 'context' | 'recommendation',
    content: "Arrive before 8am or you'll wait 40+ minutes",
    applies_to: { spot_id?, region?, season?, trip_phase? },
    source_quote: "...the line wraps around the block by 8:30..."
  }]
}
```

**Three downstream consequences:**

1. **Sourced plans.** Every plan element cites the clip(s) it came from. The plan UI surfaces source attribution inline: *"Day 2 morning — Bear Pond Espresso. **Tip from your IG save by @tokyoeats**: 'arrive at 8am to skip the line.'"* Plans become a synthesis of the user's specific saves, attributable line by line — not a black-box AI generation that the user has to trust blindly.

2. **Substance-only plan elements.** Some clips contribute only substance (no associated spot). The planner surfaces them as advisories: *"Day 1 — don't rent a car at the airport; rideshare is more reliable when jet-lagged. **From your YouTube clip 'Hawaii first-timer mistakes.'**"* This is the thing Romy structurally cannot do.

3. **The Wisdom view (third primary surface).** Beyond Map and Plan, every board has a "**Wisdom**" tab — the substance library, browsable and searchable. Users can ask their corpus: "What did I learn about Tokyo from my saves?" and get a synthesized briefing with citations back to source clips. This is the post-200-saves retention feature: at scale, your clip corpus becomes a personal knowledge base, not just a pin collection.

**Why this is structurally defensible**: The spot-extraction model is baked into the data schema and product surface of every competitor. Adding substance later requires re-architecting the extraction layer, the storage schema, and the plan-output UX simultaneously. We have the chance to build it as the foundation, before the competitive set realizes the gap exists.

---

## Part IV: User Personas & Journeys

**Sarah (28) — The Pre-Trip Researcher**
Pain: Planning 10 days in Japan. Has 200 browser tabs, a Pinterest board she cannot search, and a Notes app full of copied links. Planning feels like a second job.
With TravelPanel v2: Clips from Instagram and YouTube over 6 months of casual browsing. Two weeks before the trip, opens TravelPanel, finds a Japan board organized by city. Taps "Plan Trip" → streaming itinerary that flags Golden Week crowds and suggests adjusting dates. Exports to calendar. Done.

**Mei (24) — The Constant Curator**
Pain: Saves 5+ things per day but cannot find them again. Pinterest's algorithm buries her saves under algorithmic content. Notes app is chaos.
With TravelPanel v2: Share Sheet becomes her default for travel inspiration. After 3 months, boards are emergent. She can find the Tokyo cafe with the red awning by typing "minimalist cafe Tokyo" — vibe search via embedding retrieval makes it findable.

**Alex (35) — The Group Trip Organizer**
Pain: Planning with 4 friends across timezones. Wanderlog is too spreadsheet-like. WhatsApp polls do not scale.
With TravelPanel v3: Shared boards. Alex creates the board; friends clip into it from their own feeds. AI mediates the group constraints: "Sarah wants relaxed pace; Tom wants adventure — here's a plan that balances both."

**David (40) — The Returning Traveler**
Pain: Has been to Tokyo three times; cannot remember which ramen spot was from 2022 vs 2019.
With TravelPanel v2: Trip timeline on his board. "Tokyo 2022" is a separate memory view. AI surfaces the Shinjuku ramen when he starts planning the 2026 return.

---

## Part V: UX/UI Vision & Design Principles

### Seven Core Principles

1. **Capture in 1 tap. Organize in 0 taps. Plan in 1 sentence.** Every interaction is measured against this.
2. **Substance is first-class.** Clips are content, not bookmarks. Tips, warnings, and opinions live alongside the map pin — and are surfaced in the plan, not buried in the source URL.
3. **Plans are sourced.** Every recommendation in a plan cites the clip it came from — by author, by quoted snippet, by tappable link back to the original. No black-box AI synthesis. The user can always trace any suggestion to their own research.
4. **Make the corpus feel like a collection, not a database.** Boards should feel editorial — a curated magazine spread, not a spreadsheet.
5. **Surface intelligence without demanding attention.** AI works silently; insights emerge when users open the app, not as interruptions.
6. **Show your reasoning.** When the planner clusters or suggests, explain briefly: "These 4 cafes are all in Shinjuku → grouped into Day 2 afternoon." Let users correct it; each correction is a training signal.
7. **The plan is a gift moment.** User invested effort saving; receiving the plan should feel like opening something. The streaming animation, the copy, the pacing matter as much as the itinerary data.

(Implicit: mobile-first capture; desktop-native planning. Inspiration happens on phones at midnight. Itinerary review happens on big screens with multiple tabs.)

### Specific UX Upgrades (v1 → v2)

- **Search-first inbox**: A search bar across all clips by title, description, vibe, tags. Full-text + embedding hybrid. The "wait, where did I save that?" problem is solved — including vague queries like "that rooftop bar in Osaka."
- **Smart inbox auto-sort**: New saves go to the right board without prompting (except when confidence is low, where a single prompt is shown and the choice is remembered forever).
- **Pin clustering at low zoom**: MapLibre cluster layer with count badge. Zoom reveals individual pins. Required before any marketing.
- **Plan iteration via natural language**: "Regenerate with more free time," "More budget-conscious," "Remove Day 3 and extend Day 1." No modals, no forms.
- **Enrichment warnings inline**: Festival, weather, and price signals embedded in plan text — not a separate modal.
- **Proactive resurfacing**: "You saved this 8 months ago and have a trip to Japan coming up — want to include it?" Push notification in Phase B+.
- **Empty-state onboarding**: 3 seed boards ("Tokyo 10 Days," "Weekend in Kyoto," "Europe Highlights") pre-populated so the app is never blank on first launch. These are the demo that converts new users.

### Anti-Patterns to Avoid

- **Pinterest's infinite scroll rabbit hole**: TravelPanel is not a discovery feed. Arrivals are intentional.
- **Wanderlog's spreadsheet vibe**: Builds task-anxiety, not travel excitement.
- **TripIt's email-parsing brittleness**: We do not parse confirmation emails; we clip from social.
- **AI chatbot as front door**: Don't make users type a question as the primary action. Clips are the primary input; the chatbot is a modifier after clips exist.
- **Generic Settings page bloat**: Every preference should surface contextually, not in a graveyard Settings screen.

### Design Inspirations

- **Linear**: Speed as a feature — every interaction feels instant
- **Things 3**: The joy of the capture moment
- **Polarsteps**: How trips become visual stories after the fact
- **Apple Photos Memories**: Proactive resurfacing that feels like a gift, not surveillance
- **mymind**: The ambient AI organization promise, zero-folder
- **Raycast**: Command palette power for frequent users

---

## Part VI: Feature Roadmap

### Phase A — Bug-Free MVP + Tier-1 Polish (Now → Month 1)

Goal: Reliable, embarrassment-free, testable on real iOS devices.

- Retry queue for failed enrichments: 3 attempts, exponential backoff, dismissible error toast
- Duplicate detection on save (same URL → offer to skip or save to different board)
- Error tracking: PostHog errors or Sentry (1h setup — non-negotiable before marketing)
- Basic product analytics: PostHog event tracking on clip, plan, search, board create
- Pin clustering at low zoom (MapLibre cluster layer + count badge)
- Multi-version plan support: save/name plan variants, regenerate without losing current version
- Plan export: PDF snapshot + `.ics` calendar file
- Onboarding seed boards (3 demo boards, pre-populated, shown on first launch)
- Full-text search on clips: title + tags scan (IndexedDB acceptable for <500 items)
- AI cost guard: cap plan generations at 5/day free, track per-user AI spend via PostHog

### Phase B — Cloud Sync + Auth + Native Capture (Months 1–3)

Goal: Multi-device, browser extension, true iOS Share Extension.

- Supabase: magic link + Google OAuth, Postgres for clip metadata sync, Storage for thumbnails
- Capacitor wrap: package PWA as iOS app, enable true Share Extension (not web share target)
- Browser extension: 1-click clip from Chrome/Safari desktop
- Xiaohongshu fix: accept Share Sheet image attachment → Claude Vision description + AI-generated metadata (4–8h effort, immediately improves 30%+ of clips for Chinese-platform users)
- Cloud backup export: "Download all my data" as JSON (critical trust feature before Pro launch)
- Embedding search: Supabase pgvector for vibe search; "minimalist cafe Tokyo" retrieves the right clip
- Multilingual: Chinese UI strings as first additional language

### Phase C — On-Trip Mode + Post-Trip Memory (Months 3–6)

Goal: Own the execution and memory moments.

- On-trip mode: GPS-aware "what's next?" view — current day plan with walking directions to next pin
- Offline plan: full itinerary cached for offline use before departure date
- Check-in to locations: user marks visited; plan updates to highlight remaining stops
- Post-trip timeline: automatic journal from check-ins + (opt-in) photos
- Shared boards v1: invite collaborator with view-only access; Pro upgrade for edit access
- Proactive resurfacing: "You're flying to Tokyo in 3 days — here are your 47 Tokyo clips"

### Phase D — Discovery + Pro Launch (Months 6–12)

Goal: First revenue, first sibling vertical.

- Pro tier launch (features determined by Phase A–C usage data)
- Discovery seed: suggest places based on save history and travel style (opt-in, never algorithmic feed)
- CookPanel spike: extract `@clip-engine/*` workspace; build 10% of CookPanel to validate viability
- Collaboration v2: real-time shared editing of boards and plans

### Phase E — Clip Engine Platform (Month 12+)

Goal: Multi-vertical infrastructure as competitive moat.

- Extract `@clip-engine/*` as npm monorepo workspace (Turborepo)
- CookPanel v1 full launch sharing the engine (grocery list + meal plan output layer)
- Brand decision: evaluate if "Panel" family brand has enough recognition to consolidate
- Consider Convex if reactive multi-device sync requirements outgrow Supabase Realtime

---

## Part VII: Technical Architecture Evolution

### v1 — Today (Local-Only PWA)

```
Next.js 14 App Router + TypeScript
IndexedDB (idb v8) — local source of truth, no auth
Claude claude-sonnet-4-6 via @ai-sdk/anthropic + Vercel AI SDK
MapLibre + OpenFreeMap tiles (no API key)
next-pwa service worker
Framer Motion for streaming animations
Vercel deployment
```

Constraints: Single device only, no auth, no analytics, no error tracking, Chinese platform capture blocked.

### v2 — ~3 Months (Cloud Layer Added Without Replacing Local)

```
+ Supabase: Auth (magic link + Google) + Postgres (sync layer) + Storage (thumbnails)
+ PostHog: product analytics + error tracking
+ Capacitor: iOS app wrapper + true Share Extension plugin
```

Why Supabase over Firebase: Row-level security is easier to reason about, Postgres is familiar SQL, pgvector for embedding search is built-in, and the document model of Firestore would require denormalization that complicates querying clips across boards.

Why Capacitor over React Native: Zero codebase rewrite. The Next.js/React app runs in a WKWebView. The Share Extension is the only native module needed. React Native requires a full port of the UI layer — 2–4 months of effort with zero product value.

### v3 — ~6 Months

```
+ Vercel Edge Functions: AI streaming without cold starts
+ Cloudflare R2: image/thumbnail storage
+ Web Push → OneSignal: on-trip notifications
+ Capacitor Share Extension: proper iOS intent handler
```

### v4 — ~12 Months (Engine Extraction)

```
+ @clip-engine/* monorepo (Turborepo)
+ Cloudflare Workers: edge enrichment calls (festival/weather data)
+ Evaluate Convex if reactive sync hits Supabase limits
```

### Tech Decision Rationale

| Decision | Choice | Rationale |
|---|---|---|
| Maps | MapLibre + OpenFreeMap | Free tiles, no API key, Mapbox-compatible API — change only if OpenFreeMap degrades |
| AI | Anthropic Claude | Best Zod-schema structured extraction, streaming, Vision for image description |
| Database | IndexedDB → Supabase | Local-first for offline; Supabase for sync without complexity overhead |
| Native | Capacitor | Zero rewrite; Share Extension is the only native gap |
| UI framework | Next.js 14 App Router | Vercel-native, RSC, streaming support already in use |
| State | React hooks + IndexedDB | No Redux/Zustand needed at current scale |

---

## Part VIII: The Clip Engine

The Clip Engine is not a product feature — it is an infrastructure strategy. The core insight: the capture → extract → organize → enrich → output loop is identical for any vertical domain. Only the AI extraction schema and the output layer change per domain.

### Module Architecture

```
@clip-engine/capture     — iOS Share Sheet, browser extension, paste handler
@clip-engine/extract     — URL/text/image fetching, OG parsing, Claude AI extraction.
                           TWO-LAYER OUTPUT (Zod-typed):
                             • spots:     geographic skeleton (locations, lat/lng)
                             • substance: tips, warnings, opinions, wisdom, context
                                          (with source_quote for citation)
@clip-engine/storage     — IndexedDB schema, Supabase sync, migration helpers.
                           Substance is first-class data, indexed and searchable.
@clip-engine/organize    — Board engine, auto-categorization, tag inference
@clip-engine/enrich      — Real-world signal injection: festivals/events, weather,
                           price-surge periods, public holidays, visa conditions.
                           User toggle: "my clips only" ↔ "clips + trusted online context"
@clip-engine/synthesize  — Plan generation with full source attribution. Every
                           element cites the clip(s) it came from. Substance-only
                           items (no associated spot) are surfaced as advisories.
                           Powers both the trip plan and the per-board Wisdom view.
@clip-engine/output      — Domain-specific "do something" layer (pluggable)
```

Each domain app is:
- `@clip-engine/*` — shared, maintained once
- `+ one AI extraction schema` — e.g., `Location + Activity` for travel, `Ingredient + Technique` for cooking
- `+ one output plugin` — e.g., map + route for travel, grocery list + meal plan for cooking
- `+ one branded UI shell` — same design tokens, different color palette and copy

### The Enrichment Module

`@clip-engine/enrich` lifts the planner above "social media guide with extra steps." It answers questions users cannot easily answer from their saves alone:

- "Is this trip going to cost double because of Golden Week?"
- "Will it be monsoon season in Okinawa in July?"
- "Are there events I'd love — or crowds I'd hate?"

Enrichment data is stored as structured records: `{ location: "Tokyo", event: "Cherry Blossom", peak_window: "Mar 25–Apr 10", price_surge: 1.4, crowd: "high" }`. It is injected at plan-generation time, displayed as inline warnings in the plan, dismissible by the user, and used by the planner to suggest alternative dates or routes when requested.

This is a core differentiator. The chatbot travel apps (Layla, Mindtrip) can also tell you about Golden Week. What they cannot do is tell you that Golden Week overlaps with *your* specific saves and *your* specific travel window, because they have no knowledge of your saved content.

### The Output Layer Is What Makes Each Vertical Valuable

Without a domain-specific output layer, you have a glorified bookmarking app. With it, you have a vertical assistant that turns passive saving into active decisions.

| Domain | Output Layer | Clips from |
|---|---|---|
| **Travel** | Map + route + AI itinerary + enrichment warnings | Instagram, RED, TikTok, YouTube |
| **Cooking** | Grocery list + weekly meal plan | TikTok/IG/YouTube cooking accounts |
| **Fashion** | Outfit builder for occasion | Instagram, Pinterest |
| **Beauty** | Daily routine builder + product comparison | TikTok, YouTube |
| **Fitness** | Training block + equipment list | YouTube, fitness communities |

### Domain Priority for Sibling Vertical Expansion

| Rank | Domain | Rationale |
|---|---|---|
| 1 | **Cooking (CookPanel)** | Highest daily clip frequency, clear output (grocery list), Yummly/Mealime prove demand, same source platforms |
| 2 | **Fashion** | High clip volume, clear output (outfit for occasion), AI adds real decision value |
| 3 | **Beauty/Cosmetics** | High-trust domain (routines, not one-offs), user-validated as strong instinct |
| 4 | **Fitness** | Clear output (training plan), lower impulse-save behavior than cooking |
| 5 | **Books** | Lower clip frequency, harder AI extraction (no image), but high intent per clip |
| 6 | **Home Decor** | High visual clip volume, but "do something" requires buying furniture — scope creep into commerce |

### Brand Decision Framework

Build TravelPanel → CookPanel as separate identities. After CookPanel launches, measure whether users make the connection ("is this by the TravelPanel people?"). If yes, evaluate consolidating to a "Panel" family brand or sub-brand. If no, stay separate. Do not pre-decide this; let user behavior make the call.

---

## Part IX: Non-Obvious Insights

1. **The spot-extraction trap is the #1 competitive failure of the category.** Romy and 圆周旅记 both reduce every clip to its geographic skeleton — a list of pins. They throw away the substance: warnings, opinions, "go in the morning," cash-only flags, "skip the official tour." A user who clips "35 mistakes to avoid in Hawaii" gets back 9 incidental pins and zero of the 35 mistakes. This is worse than not clipping the video, because the user is given false confidence that their wisdom is captured. Substance extraction is the structural moat: it requires re-architecting the data schema and plan-output UX simultaneously, which competitors cannot do as a feature ship.

2. **Identity formation drives clipping retention, not utility.** Users save because curation feels like having taste. The emotional promise is "you're the kind of person who finds hidden gems." Pinterest internalized this. Reinforce it in copy, onboarding, and empty states. Users who feel like curators clip 3× more than users who feel like list-makers.

3. **The empty-map problem is fatal at onboarding.** A blank globe on first open is a conversion killer. Three seed demo boards are required before any public marketing. The boards should show the app as it looks after 3 months of real use.

4. **The plan generation is a gift moment, not a utility transaction.** Users invested effort saving; receiving the plan should feel like unwrapping something. The streaming animation, pacing, copy ("Building your Tokyo adventure..."), and post-generation reveal screen matter as much as the itinerary accuracy.

5. **Visible reasoning builds trust faster than accuracy alone.** When the planner explains why it grouped items ("These 4 cafes are all in Shinjuku → Day 2 afternoon"), users trust the output more and forgive mistakes. They also self-correct, which surfaces training data. Show the work.

6. **The Xiaohongshu fix is not a scraping problem.** RED and WeChat block scrapers by design and will always win that arms race. The fix is: accept the image payload from the iOS Share Sheet directly, describe it with Claude Vision, generate metadata from the description. This is 4–8 hours of work and sidesteps the problem entirely.

7. **The PWA Share Sheet has a 90-day attention half-life.** Users engage with the novel "share to TravelPanel" behavior for the first few weeks. As novelty fades, retention requires push notifications to re-engage — which PWAs cannot do reliably on iOS. This is the trigger point to evaluate Capacitor, likely around month 3.

8. **Vibe search is the hidden killer feature users do not ask for.** Search ranges across both spots AND substance — typing "minimalist coffee Tokyo with natural light" should retrieve a clip even if the location name doesn't match, because the substance ("the morning light through the windows is unreal") does. Nobody requests "vector search." But the experience of typing "minimalist coffee Tokyo with natural light" and retrieving the exact save they were looking for is the moment users realize TravelPanel is irreplaceable. Build embedding search before it feels urgent.

9. **Travel has a 9-month → 1-month → 3-day funnel.** Inspiration → Decision → Execution. Most apps focus on the 1-month Decision phase. TravelPanel owns the 9-month Inspiration phase. The 3-day Execution phase ("I just landed, what's my day?") is white space — no good product exists for it. On-trip mode is the next product category to own.

10. **AI cost can spiral silently.** A heavy user regenerating plans 10× a day can create significant Claude API spend with no ceiling. Add per-user cost tracking via PostHog custom properties from day 1. Cap plan generations in the free tier early — not primarily as monetization, but as protection.

11. **The data graph compounds; loss is existential.** After 6 months of clipping, a user's IndexedDB is a unique, irreplaceable personal artifact. Cloud backup and JSON export must exist before any marketing push — before auth, before Pro. Users who lose their data do not come back.

12. **On-trip execution is a daily-active-user machine.** Pre-trip planning happens once per trip (roughly weekly DAU for frequent travelers). On-trip "what's next?" happens every day of the trip, every few hours. It is the highest-frequency use case and the least competitive category. This is the Phase C investment that changes the retention curve.

13. **The killer demo is not plan speed.** Layla and a dozen others generate plans in seconds. The killer demo is: "I clipped 127 things without thinking about it. Here they are, organized perfectly, for a trip I'm taking next month." That demo does not exist anywhere else. It is the only demo that should be used in marketing.

14. **Trips aren't always geographic.** "Best hidden bars worldwide" is a real trip a user might plan. Do not force geographic clustering on every board. Let users flag boards as "general inspiration" vs "specific destination."

---

## Part X: Risks & Mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| OpenFreeMap tiles go paid | Medium | Budget $50/mo for MapTiler as fallback; self-host tile cache |
| Anthropic price increase | Medium | Cache aggressively (prompt caching), add model routing for simple extractions |
| IndexedDB data loss on iOS Safari | Low | Export/backup feature before v2 public launch |
| Apple breaks PWA Share Sheet | Medium | Capacitor escape hatch ready in Phase B; do not bet on PWA share-sheet indefinitely |
| AI cost spike from heavy users | High | Cap plan generations in free tier, per-user cost tracking from day 1 |
| Pinterest ships "save + AI plan" | Medium | We are deeper on capture UX, enrichment signals, and corpus accumulation — Pinterest cannot ship a planner without abandoning feed focus |
| Chinese platforms deepen scraping blocks | High | Already pivoting to Share Sheet image payload + Claude Vision — scraping is a dead-end path |
| Clip-to-plan conversion stays low | Medium | Primary hypothesis: caused by empty state at onboarding. Test Phase A seed boards first before structural changes |

---

## Part XI: Success Metrics

**North Star**: Weekly clips per active user. Proxy for habit formation and the ambient organization promise.

**Counter-metrics (health checks)**:
- Clip-to-plan conversion: % of clipped items that end up in a generated plan
- Week-2 / Week-4 / Week-12 cohort retention
- Enrichment success rate: % of clips with complete location + tags (below 70% = enrichment reliability problem)
- Plan generation rate: % of users with ≥1 plan in first 30 days

**Phase targets**:

| Phase | WAU Target | Key Threshold |
|---|---|---|
| Phase A (month 1) | 100 WAU | Median ≥5 clips/week |
| Phase B (month 3) | 1,000 WAU | Multi-device on >30% of accounts |
| Phase C (month 6) | 5,000 WAU | On-trip mode used by >50% of users with active trips |
| Phase D (month 12) | Pro tier live | MRR > monthly operating cost |

---

## Part XII: Decision Log

### Locked Decisions

| Decision | Rationale |
|---|---|
| Local-first (IndexedDB as source of truth) | Offline-critical for travelers; cloud is additive sync, not replacement |
| MapLibre + OpenFreeMap | Free, no API key, Mapbox-compatible — change only if tile quality degrades |
| Anthropic Claude | Best Zod-schema structured extraction, streaming, Vision; no meaningful competitor advantage |
| Next.js 14 App Router | Vercel-native, RSC for SEO, streaming support already in use |
| PWA first (Capacitor as escape hatch) | Zero native overhead now; Capacitor wrapper when Share Sheet stalls |
| shadcn/ui | Composable, accessible, fully owned — no black-box component library |
| No ads, no in-app booking v1 | Protect user trust and product focus during habit formation phase |

### Open Questions (Next 90 Days)

1. **When to add auth?** Recommendation: as late as possible (month 2–3). Auth adds friction; data-loss risk is addressable with local JSON export in the interim.
2. **Capacitor vs continue PWA?** Trigger: when PWA share-sheet adoption stalls, iOS Safari PWA behavior regresses, or a test cohort shows Day-7 retention significantly lower than Android. Estimated trigger: month 3.
3. **Xiaohongshu image payload fix**: Accept Share Sheet image attachment → Claude Vision → AI-generated metadata. Estimated effort: 4–8 hours. Recommend Phase A.
4. **What do Pro users actually pay for?** Deferred until real iOS usage patterns are measurable. Do not pre-architect a paywall before this is known.

---

## Appendix A: Tech Stack Comparison Tables

### Auth + Database

| Option | Auth | DB model | Vector search | Verdict |
|---|---|---|---|---|
| **Supabase** | Magic link + OAuth | Postgres (relational) | pgvector built-in | ✅ Recommended |
| Firebase | Auth | Firestore (document) | Limited | Document model complicates relational queries |
| Convex | Auth | Document + reactive | None | Great for realtime; overkill for v2 |
| PlanetScale + Clerk | Clerk | MySQL serverless | None | More pieces, same outcome |

### Native App Wrapper

| Option | Effort | Codebase rewrite? | Share Extension | Verdict |
|---|---|---|---|---|
| **Capacitor** | Low | No | Yes (plugin) | ✅ Recommended |
| React Native | High | Yes (full port) | Yes | 2–4 months, no product value over Capacitor |
| Tauri | Medium | Partial | No (desktop only) | Wrong platform |
| Continue PWA only | Zero | No | Limited (web share target) | Acceptable until iOS regression |

### Maps

| Option | Cost | Tiles | API key required | Verdict |
|---|---|---|---|---|
| **MapLibre + OpenFreeMap** | Free | Open | No | ✅ Current, keep |
| Mapbox | $50+/mo | Commercial | Yes | Upgrade only if OpenFreeMap quality degrades |
| Google Maps | Pay-per-use | Commercial | Yes | Lock-in risk, complex offline |
| Apple Maps | Free | iOS only | No | Platform-limited |

### AI Provider

| Option | Structured output | Streaming | Image analysis | Verdict |
|---|---|---|---|---|
| **Anthropic Claude** | Excellent (Zod) | Yes | Yes (Vision) | ✅ Current, keep |
| OpenAI GPT-4o | Good | Yes | Yes | No meaningful advantage for this use case |
| Google Gemini | Good | Yes | Yes | Consider for enrichment-layer calls (cost) |
| Mistral | Limited | Yes | No | Not competitive for extraction tasks |

---

## Appendix B: Anti-Patterns Catalog

| Anti-pattern | Why Not |
|---|---|
| In-app booking (hotels/flights v1) | Booking.com and Airbnb always win on inventory. Adds business model complexity with no product moat. Revisit only after 100K users. |
| Social feed / public itinerary sharing | Loses the "private curation" identity value. Algorithm pressure conflicts with save-first design. |
| AI chatbot as front door | "What should I do in Paris?" is commodity. Our value is personal corpus + enrichment, not generic knowledge retrieval. |
| Third language before 50K DAU | i18n is a fixed overhead on every future feature. EN + 中文 covers the target user base for 12+ months. |
| Generic Settings page | Every preference should surface contextually at the moment it's relevant. Avoid the iOS Settings dumping-ground anti-pattern. |
| Simultaneous multi-vertical build | Building TravelPanel + CookPanel together means both are half-done. Vertical depth beats horizontal breadth at this stage. |
| Comprehensive offline maps | Tile caching for offline is a separate product category (maps.me, OsmAnd). Cache the plan data, not the tiles. |

---

## Appendix C: Inspirations & References

### Products to Study

| Product | What to Learn |
|---|---|
| **Linear** | Speed as a feature — every interaction should feel instant |
| **Things 3** | The joy of the capture moment; the saved item as a first-class object |
| **Polarsteps** | How trips become visual stories; post-trip UX language |
| **Apple Photos Memories** | Proactive resurfacing as a gift, not a notification |
| **mymind** | The ambient AI organization promise; zero-folder UX |
| **Raycast** | Command palette for power users who want to type to find and act |
| **圆周旅记** | Streaming agent UX with visible reasoning chains |

### Technical References

- Vercel AI SDK streaming docs — NDJSON + `streamObject` patterns already in use
- Supabase pgvector guide — embedding search implementation for Phase B
- Capacitor Share Extension — native iOS intent handler for Phase B
- MapLibre cluster layer docs — pin clustering for Phase A
- Cloudflare Workers enrichment — edge-side festival/weather data for Phase D

---

*This document is the authoritative product strategy reference for TravelPanel. When in doubt about a feature decision, return to the Executive Summary and the Ambient Organization Promise. If a proposed feature does not compound the clip corpus or deliver its value, it is probably not the right next thing.*
