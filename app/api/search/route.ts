import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';

const expansionSchema = z.object({
  terms: z
    .array(z.string())
    .max(20)
    .describe('8–15 related search terms: synonyms, adjacent concepts, place types, mood descriptors, geography. Each term is 1–3 words.'),
  label: z
    .string()
    .max(60)
    .describe('Short human-readable label for what this search is about, e.g. "quiet minimalist cafes"'),
});

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!query || typeof query !== 'string' || query.length > 200) {
    return NextResponse.json({ error: 'query required (max 200 chars)' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: models.enrichment,
      schema: expansionSchema,
      prompt: `You are a travel content search expert. A user is searching their saved travel clips with this vibe query: "${query.trim()}"

Expand this into 8-15 specific search terms that would match relevant saved travel posts, tips, and advice:
- Include synonyms and related concepts for the mood or type of place
- Include relevant place types (café, izakaya, onsen, market, temple, beach, etc.)
- Include vibe/aesthetic descriptors (peaceful, hidden, authentic, photogenic, etc.)
- Include relevant geography or neighbourhood names if the query mentions a location
- Keep each term 1-3 words
- Focus on terms likely to appear inside travel tips, substance items, and clip descriptions

Also produce a short human-readable label summarising what this search is looking for.`,
    });
    return NextResponse.json(object);
  } catch {
    // Claude unavailable — caller falls back to plain text search
    return NextResponse.json({ terms: [], label: query.trim() });
  }
}
