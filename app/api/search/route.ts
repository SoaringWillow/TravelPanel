import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';

const queryExpansionSchema = z.object({
  keywords: z.array(z.string()).describe(
    'Specific keywords to match against clip titles, descriptions, and substance — include the original words, synonyms, and related concepts. Keep each keyword 1–2 words.'
  ),
  tags: z.array(z.string()).describe(
    'Relevant tags from: food, nature, culture, adventure, relaxation, photography, shopping, nightlife, history, art, architecture, beach, mountain, city, rural'
  ),
  context: z.string().describe(
    'One sentence explaining what the user is looking for, used to score substance items'
  ),
});

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: models.enrichment,
      schema: queryExpansionSchema,
      prompt: `The user is doing a vibe/semantic search over their saved travel inspiration clips.

User query: "${query.trim()}"

Expand this into search signals:
- keywords: specific words to match in clip content (include synonyms, related concepts, translated forms if the query mixes languages)
- tags: which content categories likely match this vibe
- context: what the user is really looking for (helps score tips/warnings)

Examples:
  "minimalist cafe tokyo" → keywords: [cafe, coffee, minimal, aesthetic, specialty, third wave, quiet, cozy], tags: [food, photography]
  "hidden gems bali" → keywords: [hidden, gem, secret, local, off the beaten path, undiscovered, waterfall, temple, rice], tags: [nature, culture, photography]
  "budget street food" → keywords: [street food, cheap, budget, local, hawker, market, affordable, snack], tags: [food]
  "romantic sunset spot" → keywords: [sunset, romantic, view, golden hour, couple, scenic, rooftop, hilltop], tags: [photography, relaxation]`,
    });

    return NextResponse.json(object);
  } catch {
    // Fallback: return the raw query words as keywords
    const fallbackKeywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return NextResponse.json({ keywords: fallbackKeywords, tags: [], context: query });
  }
}
