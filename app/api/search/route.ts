import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';

const expandSchema = z.object({
  terms: z.array(z.string()).describe(
    'Related keywords, synonyms, and concepts a travel post about this query might contain. ' +
    '15–25 terms. Include: synonyms, category names, related activities, descriptors, ' +
    'food/vibe/place types. All lowercase, single words or short phrases.'
  ),
  intent: z.string().describe('One-sentence description of what the searcher is looking for'),
});

export type VibeExpansion = z.infer<typeof expandSchema>;

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }
  if (query.length > 300) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: models.enrichment,
      schema: expandSchema,
      prompt: `You are a semantic search expander for a travel inspiration app.
The user typed: "${query.trim()}"

Expand into related terms that travel posts about this topic might contain.
Think broadly:
- "hidden gem Tokyo" → hidden, secret, local, off-the-beaten-path, undiscovered, tokyo, japan, japanese, authentic, not touristy, crowd-free, quiet, neighbourhood, sento, shotengai
- "beach vacation Bali" → beach, ocean, sea, surf, waves, bali, balinese, indonesia, resort, villa, sunset, sand, tropical, snorkeling, rice terrace, ubud, seminyak
- "cozy cafe" → cafe, coffee, espresso, latte, macchiato, third wave, specialty, cozy, warm, ambient, brunch, pastry, independent, local, neighbourhood coffee shop
- "romantic date ideas" → romantic, date, couples, intimate, sunset, wine, candle, rooftop, view, private dining, waterfront, flowers, special occasion, anniversary

Include BOTH the user's original words AND semantically related travel vocabulary.`,
    });

    return NextResponse.json(object);
  } catch {
    return NextResponse.json({ error: 'Expansion failed' }, { status: 500 });
  }
}
