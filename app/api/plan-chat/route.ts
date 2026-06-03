import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { TripPlan, SavedItem } from '@/lib/types';
import { models } from '@/lib/models';

// Zod schema matching TripPlan (mirrors plan/route.ts)
const locationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

const sourcedTipSchema = z.object({
  content: z.string(),
  sourceTitle: z.string(),
});

const activitySchema = z.object({
  time: z.string(),
  location: locationSchema,
  name: z.string(),
  duration: z.string(),
  tips: z.array(z.string()),
  sourcedTips: z.array(sourcedTipSchema).optional(),
});

const dayPlanSchema = z.object({
  day: z.number(),
  theme: z.string(),
  locations: z.array(locationSchema),
  activities: z.array(activitySchema),
});

const chatResponseSchema = z.object({
  reply: z.string().describe('Brief conversational reply explaining what was changed or answering the question (1-2 sentences)'),
  updatedPlan: z.union([
    z.object({
      overview: z.string(),
      totalLocations: z.number(),
      estimatedDailyDistance: z.string(),
      days: z.array(dayPlanSchema),
      tips: z.array(z.string()),
    }),
    z.null(),
  ]).describe('The updated trip plan if the user requested a change, or null if just answering a question'),
});

export async function POST(req: NextRequest) {
  let message: string, plan: TripPlan, boardItems: SavedItem[];
  try {
    ({ message, plan, boardItems } = await req.json());
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!message?.trim() || !plan) {
    return Response.json({ error: 'Missing message or plan' }, { status: 400 });
  }

  const locationSummary = boardItems
    .flatMap((i) => i.locations.map((l) => `${l.name} (${l.lat.toFixed(4)}, ${l.lng.toFixed(4)})`))
    .join(', ');

  const substanceSummary = boardItems
    .flatMap((i) =>
      (i.substance ?? []).map((s) => `[${s.type}] ${s.content}${s.applies_to ? ` (re: ${s.applies_to})` : ''}`)
    )
    .join('\n');

  const systemPrompt = `You are a smart, concise trip planning assistant. The user has a generated trip plan and wants to modify it through conversation.

Available clip wisdom from their saved posts:
${substanceSummary || '(none)'}

Available locations from their saved clips:
${locationSummary}

Rules:
- If the user wants to change the plan (reorder, add, remove, modify), return the full updated plan in updatedPlan.
- If the user is asking a question or chatting, return null for updatedPlan and answer in reply.
- Keep changes minimal — only change what was asked.
- Preserve sourced tips from their clips wherever possible.
- reply must be ≤ 2 sentences. Be conversational and warm.`;

  try {
    const result = await generateObject({
      model: models.enrichment,
      schema: chatResponseSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Current plan:\n${JSON.stringify(plan, null, 2)}\n\nUser request: ${message}`,
        },
      ],
    });

    return Response.json(result.object);
  } catch (err) {
    console.error('[plan-chat] error:', err);
    return Response.json({ error: 'AI request failed' }, { status: 500 });
  }
}
