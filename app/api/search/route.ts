import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';

const searchExpansionSchema = z.object({
  terms: z
    .array(z.string())
    .describe(
      'Expanded search terms: synonyms, related place types, activities, cuisines, vibes, and locale variants. 8–15 items.',
    ),
  intent: z.string().describe('One-sentence summary of what the user is looking for'),
});

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: models.enrichment,
      schema: searchExpansionSchema,
      prompt: `You are helping search a travel inspiration database of saved social media posts.
The user is looking for: "${query.trim()}"

Expand this into specific terms that will match relevant travel clips.
Include synonyms, related place/activity types, aesthetic/vibe words, cuisine terms, local language variants.
Be specific to travel content (e.g. "minimalist cafe" → ["cafe", "coffee", "espresso", "specialty coffee", "third wave", "quiet", "cozy", "aesthetic", "minimal", "workfriendly", "laptop"]).
Return 8–15 single or two-word terms.`,
    });
    return NextResponse.json(object);
  } catch {
    // Fallback: split the original query into terms so search still works
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return NextResponse.json({ terms, intent: query });
  }
}
