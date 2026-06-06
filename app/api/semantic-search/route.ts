import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';

// Given a vibe/semantic query from the user, expand it into keywords + concepts
// that can be scored against clips client-side — no vector DB required.

const expansionSchema = z.object({
  keywords: z.array(z.string()).describe(
    'Concrete nouns and adjectives from the query — e.g. "cafe", "minimalist", "Tokyo"'
  ),
  concepts: z.array(z.string()).describe(
    'Broader related concepts — synonyms, associated place types, moods, activities, tags. ' +
    'For "sunset view" include "golden hour", "photography", "rooftop", "lookout", "vista"'
  ),
  locations: z.array(z.string()).describe(
    'Specific cities, regions, or countries that are relevant. Empty if query is not location-specific.'
  ),
  tags: z.array(z.string()).describe(
    'Matching tags from this set: food, nature, culture, adventure, relaxation, photography, ' +
    'shopping, nightlife, history, art, architecture, beach, mountain, city, rural'
  ),
});

export type SemanticExpansion = z.infer<typeof expansionSchema>;

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: models.enrichment,
      schema: expansionSchema,
      prompt: `Expand this travel search query into keywords and related concepts for semantic matching.

Query: "${query.trim()}"

Return 3-8 keywords (exact terms from query + obvious related words), 5-12 concepts (broader associations, synonyms, vibes, related activities), relevant location names if any, and matching travel tags.`,
    });

    return NextResponse.json(object);
  } catch {
    // Graceful degradation: split the query into keywords
    const fallback: SemanticExpansion = {
      keywords: query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 2),
      concepts: [],
      locations: [],
      tags: [],
    };
    return NextResponse.json(fallback);
  }
}
