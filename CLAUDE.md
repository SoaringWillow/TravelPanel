# TravelPanel — Context for Claude Sessions

## What This App Is

TravelPanel is a travel inspiration clipper + AI trip planner. The core loop: user shares a URL from any social app (Instagram, YouTube, Xiaohongshu) via iOS Share Sheet → Claude extracts structured location/activity data → clips are organized into boards → the trip planner generates a multi-day itinerary from the user's saved clips, enriched with real-world context (festivals, weather, price signals).

**The moat is the clip action, not the AI plan.** Every decision should be measured against: does this make saving and organizing easier?

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
  MapView.tsx           — Main map with NaN-guard coord validation
  RouteMapView.tsx      — Route layer for planned trips
  InboxCard.tsx         — Clip card with partial-state loading pattern

lib/
  db.ts                 — IndexedDB v2 schema + state machines
                          (enrichmentStatus: pending | done | failed)
```

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
