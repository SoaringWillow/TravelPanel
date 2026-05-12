# TravelPanel — Context for Claude Sessions

## What This App Is

TravelPanel is a travel inspiration clipper + AI trip planner. The core loop: user shares a URL from any social app (Instagram, YouTube, Xiaohongshu) via iOS Share Sheet → Claude extracts both **spots** (geographic skeleton) AND **substance** (tips, warnings, opinions, wisdom) from the post → clips are organized into boards → the trip planner generates a multi-day itinerary that *cites the source clips inline*, enriched with real-world context (festivals, weather, price signals).

**Two foundational moats:**

1. **The clip action.** iOS Share Sheet flow is the product. If saving breaks or slows, retention collapses.
2. **Substance over Spots.** Every clip has two extraction layers — pins AND content. Competitors (Romy, 圆周旅记) extract only pins, throwing away the actual wisdom in posts. We extract both, store substance as first-class data, and surface it in plans with source attribution.

Every decision is measured against: does this make capture easier OR does it preserve more substance from each clip?

## Product Strategy

See **[PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md)** for the full strategic reference:
- Competitive landscape (圆周旅记, Romy, Wanderlog, Layla, etc.)
- Clip Engine architecture and multi-vertical expansion plan
- Feature roadmap (Phases A–E)
- Tech architecture evolution (v1 → v4)
- Non-obvious insights and anti-patterns

Read this before making architectural decisions or planning new features.

## Codebase Map

```
app/
  page.tsx              — Home/map view (main board interface)
  share/page.tsx        — iOS Share Sheet capture flow (THE moat)
  plan/[boardId]/       — Trip planner with streaming AI + map
  api/
    import/route.ts     — Claude extraction (URL → structured location data)
    plan/route.ts       — Streaming NDJSON trip planner
    enrich/             — (future) Real-world enrichment signals

components/
  CapacitorBridge.tsx   — Client-side Capacitor init + URL scheme deep link handler
                          Listens for travelpanel:// URLs from the Share Extension
                          and routes them to /share
  MapView.tsx           — Main map with NaN-guard coord validation
  RouteMapView.tsx      — Route layer for planned trips
  InboxCard.tsx         — Clip card with partial-state loading pattern

ios/App/
  App/                  — Xcode project (Capacitor-generated)
    Info.plist          — URL scheme (travelpanel://) + ATS config
    AppDelegate.swift   — Capacitor app delegate (handles URL open events)
  ShareExtension/       — Native iOS Share Extension
    ShareViewController.swift — Receives shared URL, opens app via URL scheme
                                or writes to App Group as fallback
    Info.plist          — Extension config (accepts URLs, web pages, text)
    XCODE_SETUP.md      — Step-by-step Xcode wiring instructions
  capacitor.config.ts   — Capacitor config (app ID, server URL, plugins)

lib/
  db.ts                 — IndexedDB v2 schema + state machines
                          (enrichmentStatus: pending | done | failed)
```

## iOS Build Workflow

The app uses Capacitor (not React Native) to wrap the Next.js PWA as a native iOS app. The native shell loads the deployed Vercel URL.

### Prerequisites (macOS)
- Xcode 15+
- CocoaPods: `sudo gem install cocoapods`
- Run `cd ios/App && pod install` once after cloning

### Development (live reload from local server)
```bash
# Start Next.js dev server first
npm run dev

# In a separate terminal, sync and open Xcode
# Replace with your Mac's local IP so the device can reach it
CAPACITOR_SERVER_URL=http://192.168.1.100:3000 npm run ios:dev
```

### Production build
```bash
CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build
# Then: Product → Archive in Xcode
```

### Share Extension wiring (first-time Xcode setup)
See `ios/App/ShareExtension/XCODE_SETUP.md` — must be completed in Xcode before the native Share Sheet works.

## Key Technical Decisions

| Decision | Choice | Why |
|---|---|---|
| DB | IndexedDB (idb) → Supabase (v2) | Local-first for offline; cloud is additive |
| Maps | MapLibre + OpenFreeMap | Free, no API key, Mapbox-compatible |
| AI | Anthropic Claude sonnet-4-6 | Best Zod-schema structured extraction |
| UI | Next.js 14 App Router + shadcn/ui | Vercel-native, streaming support |
| Native | PWA now, Capacitor in Phase B | Zero rewrite; Share Extension only native gap |

## Current State Gaps (as of v1)

- Enrichment is fire-and-forget with no retry — items silently fail to enrich
- Xiaohongshu/WeChat thumbnails return empty (anti-scraping) — fix: Share Sheet image payload + Claude Vision
- No full-text/vibe search — hits a wall at 200+ saves
- No export/backup — data loss on device wipe is existential
- No analytics or error tracking — North Star metric is unmeasurable
- No AI cost ceiling — heavy users can spike API spend silently
- Empty map at first launch — no onboarding seed boards

## Development Branch

Feature development: `claude/social-travel-ai-planner-jiVDe`

## North Star Metric

Weekly clips per active user. Proxy for habit formation.
