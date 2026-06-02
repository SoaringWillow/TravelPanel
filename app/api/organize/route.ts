import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { SavedItem } from '@/lib/types';
import { models } from '@/lib/models';

const organizeSchema = z.object({
  clusters: z.array(z.object({
    boardName: z.string().describe('A concise, descriptive name for this destination/theme cluster'),
    emoji: z.string().describe('A single emoji that best represents this cluster'),
    description: z.string().optional().describe('One-line description of what connects these clips'),
    itemIds: z.array(z.string()).describe('IDs of the SavedItems that belong to this cluster'),
  })),
});

export async function POST(req: NextRequest) {
  let items: SavedItem[];
  try {
    ({ items } = await req.json());
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!Array.isArray(items) || items.length < 2) {
    return new Response('Need at least 2 items to organize', { status: 400 });
  }

  const itemSummaries = items.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description?.slice(0, 200),
    locations: i.locations.map((l) => l.name),
    tags: i.tags.slice(0, 5),
  }));

  try {
    const result = await generateObject({
      model: models.enrichment,
      schema: organizeSchema,
      prompt: `You are organizing a user's saved travel inspiration clips into destination boards.

Here are ${items.length} unorganized clips:
${JSON.stringify(itemSummaries, null, 2)}

Group them into 2–6 thematic boards by destination or travel theme.
Rules:
- Each clip must appear in exactly one cluster
- Board names should be specific and evocative (e.g. "Tokyo 2026", "Bali Beach Escape", "Japanese Food Tour")
- If clips are diverse without a clear pattern, create a "Miscellaneous" cluster for outliers
- Minimum 1 clip per cluster
- Use a relevant emoji for each board (🗼 Tokyo, 🌴 Beach, 🍜 Food, etc.)
- Include ALL ${items.length} item IDs across clusters`,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[organize] tokens:', result.usage);
    }

    return Response.json(result.object);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Organize failed';
    return new Response(msg, { status: 500 });
  }
}
