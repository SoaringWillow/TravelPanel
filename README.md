# TravelPanel

A travel inspiration clipper and AI trip planner. Save places from Instagram, YouTube, and Xiaohongshu in 2 taps via iOS Share Sheet — TravelPanel extracts the location data, organizes it into boards, and generates a real trip plan from your saves.

## What It Does

1. **Clip** — Share any travel URL via iOS Share Sheet. Claude extracts location, activity type, and tags automatically.
2. **Organize** — Clips are sorted into boards by destination. Boards self-organize over time.
3. **Plan** — Select a board, tap "Plan Trip." The AI generates a multi-day itinerary from your clips, enriched with real-world signals (festival dates, weather windows, price-surge periods).
4. **Execute** — (Phase C) On-trip mode surfaces the plan with GPS-aware "what's next?" for each day.

## Tech Stack

- **Frontend**: Next.js 14 App Router, React, Tailwind, shadcn/ui, Framer Motion
- **Maps**: MapLibre GL + OpenFreeMap (free, no API key required)
- **AI**: Anthropic Claude via Vercel AI SDK (extraction + streaming planner)
- **Storage**: IndexedDB (local-first, offline-capable)
- **Deployment**: Vercel

## Product Strategy

See [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) for the full product strategy, competitive landscape, feature roadmap, and Clip Engine architecture.

## Development

```bash
npm install
npm run dev
```

Requires a `.env.local` with:
```
ANTHROPIC_API_KEY=your_key_here
```

## Architecture Notes for Contributors

See [CLAUDE.md](./CLAUDE.md) for a full codebase map, key technical decisions, and current gaps. Read it before making structural changes.
