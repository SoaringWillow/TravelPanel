import { NextRequest } from 'next/server';
import { generateObject, streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { SavedItem, AgentStep } from '@/lib/types';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const locationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

const activitySchema = z.object({
  time: z.string(),
  location: locationSchema,
  name: z.string(),
  duration: z.string(),
  tips: z.array(z.string()),
});

const dayPlanSchema = z.object({
  day: z.number(),
  theme: z.string(),
  locations: z.array(locationSchema),
  activities: z.array(activitySchema),
});

const tripPlanSchema = z.object({
  overview: z.string(),
  totalLocations: z.number(),
  estimatedDailyDistance: z.string(),
  days: z.array(dayPlanSchema),
  tips: z.array(z.string()),
});

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let items: SavedItem[], days: number, preferences: string;
  try {
    ({ items, days, preferences } = await req.json());
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return new Response('No items provided', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(msg: object) {
        controller.enqueue(encoder.encode(JSON.stringify(msg) + '\n'));
      }

      function step(type: AgentStep['type'], message: string) {
        emit({ t: 'step', step: { type, message, timestamp: Date.now() } });
      }

      try {
        // ── Step 1: Resolve locations ────────────────────────────────────
        step('searching', 'Collecting locations from your saved items…');

        const rawLocations = items.flatMap((i) => i.locations);

        if (rawLocations.length === 0) {
          step('error', 'No locations found in saved items. Add items with identified locations first.');
          controller.close();
          return;
        }

        const resolvedResult = await generateObject({
          model: anthropic('claude-sonnet-4-6'),
          schema: z.object({ locations: z.array(locationSchema) }),
          prompt: `Verify these ${rawLocations.length} travel locations have accurate GPS coordinates. Correct any wrong ones and return all of them.\n\n${JSON.stringify(rawLocations)}`,
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('[plan/resolve] tokens:', resolvedResult.usage);
        }
        const { object: resolvedLocs } = resolvedResult;

        step('found', `Resolved ${resolvedLocs.locations.length} location${resolvedLocs.locations.length !== 1 ? 's' : ''}`);

        // ── Step 2: Cluster into day groups ──────────────────────────────
        step('clustering', `Grouping locations into ${days}-day clusters…`);

        const clusterResult = await generateObject({
          model: anthropic('claude-sonnet-4-6'),
          schema: z.object({
            groups: z.array(z.object({
              day: z.number(),
              theme: z.string(),
              locationNames: z.array(z.string()),
            })),
          }),
          prompt: `Cluster these ${resolvedLocs.locations.length} locations into ${days} geographic day groups, minimising travel distance each day. Give each day a short theme.\n\nLocations:\n${JSON.stringify(resolvedLocs.locations)}`,
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('[plan/cluster] tokens:', clusterResult.usage);
        }
        const { object: clusters } = clusterResult;

        step('routing', 'Building optimised route…');

        // ── Step 3: Stream full itinerary ────────────────────────────────
        const contentSummary = items.map((i) => ({
          title: i.title,
          activities: i.activities,
          tags: i.tags,
        }));

        const planStream = streamObject({
          model: anthropic('claude-sonnet-4-6'),
          schema: tripPlanSchema,
          prompt: `Create a detailed ${days}-day travel itinerary.

Resolved locations: ${JSON.stringify(resolvedLocs.locations)}
Day clusters: ${JSON.stringify(clusters.groups)}
Saved content: ${JSON.stringify(contentSummary)}
User preferences: ${preferences || 'None specified'}

Rules:
- 2-4 activities per day with realistic timing
- Cluster geographically nearby places each day
- Focus on routes and activities only — no bookings or costs
- Include practical tips for each activity`,
        });

        for await (const partial of planStream.partialObjectStream) {
          emit({ t: 'plan', plan: partial });
        }

        step('validating', 'Finalising your itinerary…');
        step('done', `Your ${days}-day plan is ready!`);
      } catch (err) {
        step('error', err instanceof Error ? err.message : 'Something went wrong generating your plan');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
