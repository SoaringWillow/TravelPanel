import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';

// ─── Query expansion for vibe search ────────────────────────────────────────
//
// Instead of embedding vectors (requires pgvector + external embedding model),
// we use Claude to expand the user's vibe query into a rich set of synonyms,
// related concepts, and travel-specific terms. The client then does fast
// keyword matching against the expanded term set — effectively a semantic
// search that runs without any cloud infrastructure.
//
// When Supabase pgvector is available (cloudEnabled), this route is a great
// place to add a second stage: embed the expanded query and do ANN lookup.

const expansionSchema = z.object({
  terms: z.array(z.string()).describe(
    'Expanded search terms: synonyms, related concepts, travel-specific words, translations. ' +
    'Include: alternative phrasings, nearby/similar places, moods, activities, cuisines, architectural styles. ' +
    'Return 8–20 lowercase terms.'
  ),
  mood: z.string().describe('One-phrase description of the travel vibe (e.g. "hidden gems off the beaten path")'),
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ terms: [], mood: '' });

  try {
    const { object } = await generateObject({
      model: models.enrichment,
      schema: expansionSchema,
      prompt: `You are a travel search assistant helping expand a vibe-style search query into rich matching terms.

User query: "${q}"

Generate an expanded set of search terms that would match travel clips capturing this vibe or intent.
Think about:
- Synonyms and alternative phrasings (e.g. "cafe" → coffee, espresso, latte, third-wave)
- Related places and destinations
- Activity types and experiences
- Moods and aesthetics (e.g. "minimalist" → clean, simple, Scandinavian, zen, quiet)
- Travel styles (e.g. "hidden gem" → off-the-beaten-path, local, undiscovered, secret)
- Chinese/Japanese equivalents for Asian destinations
- Food, accommodation, transport related terms

Return 8–20 lowercase single-word or short-phrase terms.`,
    });

    return NextResponse.json(object, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    // On error (rate limit, no API key, etc.), return empty expansion — client falls back to keyword search
    return NextResponse.json({ terms: [], mood: '' });
  }
}
