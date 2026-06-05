import { NextRequest } from 'next/server';
import { generateObject, streamObject } from 'ai';
import { z } from 'zod';
import { SavedItem, AgentStep } from '@/lib/types';
import { models } from '@/lib/models';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const locationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

const sourcedTipSchema = z.object({
  content: z.string().describe('A tip, warning, or insight drawn from the user\'s saved clip'),
  sourceTitle: z.string().describe('The exact title of the saved clip this insight came from'),
});

const estimatedCostSchema = z.object({
  amount: z.number().describe('Rough cost estimate in the given currency'),
  currency: z.string().describe('3-letter currency code e.g. USD, JPY, EUR'),
});

const activitySchema = z.object({
  time: z.string(),
  location: locationSchema,
  name: z.string(),
  duration: z.string(),
  tips: z.array(z.string()).describe('Generic practical tips for this activity'),
  sourcedTips: z.array(sourcedTipSchema).describe(
    'Tips that come directly from the wisdom in the user\'s saved clips (their substance). ' +
    'Cite the source clip title. Only include when a clip genuinely informs this activity. ' +
    'This is the key differentiator — the plan reflects the user\'s own curated knowledge.'
  ),
  estimatedCost: estimatedCostSchema.optional().describe('Rough per-person cost for this activity. Omit if free or truly unknown.'),
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
  let items: SavedItem[], days: number, preferences: string, tripBudget?: number, currency?: string;
  try {
    ({ items, days, preferences, tripBudget, currency } = await req.json());
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
          model: models.planResolve,
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
          model: models.planCluster,
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
        // Include substance (the wisdom layer) so the plan can cite the user's
        // own clips inline — this is the sourced-itinerary moat.
        const contentSummary = items.map((i) => ({
          title: i.title,
          activities: i.activities,
          tags: i.tags,
          substance: (i.substance ?? []).map((s) => ({
            type: s.type,
            content: s.content,
            applies_to: s.applies_to,
          })),
        }));

        const hasSubstance = items.some((i) => (i.substance?.length ?? 0) > 0);

        const currencyCode = currency || 'USD';
        const budgetLine = tripBudget
          ? `\nTrip budget: ${tripBudget} ${currencyCode} total. Flag activities that push the daily average over ${Math.round(tripBudget / days)} ${currencyCode} with a note in their tips.`
          : '';

        const planStream = streamObject({
          model: models.planItinerary,
          schema: tripPlanSchema,
          prompt: `Create a detailed ${days}-day travel itinerary.

Resolved locations: ${JSON.stringify(resolvedLocs.locations)}
Day clusters: ${JSON.stringify(clusters.groups)}
Saved content: ${JSON.stringify(contentSummary)}
User preferences: ${preferences || 'None specified'}${budgetLine}

Rules:
- 2-4 activities per day with realistic timing
- Cluster geographically nearby places each day
- Include practical tips for each activity
- For estimatedCost: provide a realistic per-person cost in ${currencyCode} where applicable (entry fees, meals, transport). Free activities may omit this field.
- IMPORTANT — Sourced wisdom: each saved clip carries a "substance" array of the
  user's own tips/warnings/opinions. When a clip's substance is relevant to an
  activity, surface it in that activity's "sourcedTips" with the exact clip title
  as sourceTitle. This makes the plan reflect the user's curated knowledge, not
  generic advice. ${hasSubstance ? 'The clips DO contain substance — use it.' : 'If no substance is present, return an empty sourcedTips array.'}
  Do NOT fabricate sourced tips; only cite substance that actually appears in a clip.`,
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
