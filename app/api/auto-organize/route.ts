import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { SavedItem } from '@/lib/types';
import { models } from '@/lib/models';

const suggestedBoardSchema = z.object({
  name: z.string().describe('Short board name, e.g. "Tokyo", "Bali", "Budget Eats"'),
  emoji: z.string().describe('A single emoji that best represents this board'),
  itemIds: z.array(z.string()).describe('IDs of items that belong to this board'),
  reason: z.string().describe('One sentence explaining why these items were grouped'),
});

const responseSchema = z.object({
  suggestedBoards: z.array(suggestedBoardSchema),
});

export async function POST(req: NextRequest) {
  let items: SavedItem[];
  try {
    ({ items } = await req.json());
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return new Response('No items provided', { status: 400 });
  }

  const itemSummaries = items.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description.slice(0, 200),
    tags: i.tags,
    locations: i.locations.map((l) => l.name),
    activities: i.activities.slice(0, 5),
  }));

  const result = await generateObject({
    model: models.planCluster,
    schema: responseSchema,
    prompt: `You are helping a traveller organise their saved travel clips into boards.

Here are ${items.length} unassigned travel clips:
${JSON.stringify(itemSummaries, null, 2)}

Group them into logical boards. Rules:
- Primary grouping: by destination/city/region (e.g. "Tokyo", "Bali", "Portugal")
- Secondary grouping: by vibe if multiple clips share a theme (e.g. "Street Food", "Hidden Cafés", "Architecture")
- Only create a board if it has 2+ items (single items can go in a "Misc" board if needed)
- Keep board names short and evocative (2–3 words max)
- Choose a fitting emoji for each board
- Every item must appear in exactly one board
- Aim for 2–6 boards total; merge small groups into the closest match`,
  });

  return Response.json(result.object);
}
