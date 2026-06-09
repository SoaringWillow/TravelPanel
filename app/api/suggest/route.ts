import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/models';
import { SavedItem } from '@/lib/types';

const suggestionSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string().describe('Name of the suggested place'),
    reason: z.string().describe('1-sentence reason this fits the user\'s taste — reference what they\'ve saved'),
    category: z.string().describe('Short category tag: e.g. "Hidden café", "Scenic viewpoint", "Night market"'),
    location: z.string().describe('City or region where this is located'),
    searchHint: z.string().describe('A short hint to help the user find this online, e.g. "Search: Yanaka Cemetery Tokyo walk"'),
  })).min(3).max(5),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { items: SavedItem[] };
    const { items } = body;

    if (!items || items.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Build a taste profile from saved items
    const profile = items
      .filter(i => i.enrichmentStatus === 'done')
      .slice(0, 20)
      .map(i => {
        const parts: string[] = [`"${i.title}"`];
        if (i.tags.length) parts.push(`tags: ${i.tags.join(', ')}`);
        if (i.activities.length) parts.push(`activities: ${i.activities.join(', ')}`);
        if (i.substance?.length) {
          const tips = i.substance.slice(0, 2).map(s => s.content).join('; ');
          parts.push(`wisdom: ${tips}`);
        }
        return parts.join(' | ');
      })
      .join('\n');

    const prompt = `You are a travel advisor. Based on this user's saved travel inspiration, suggest 3-5 specific places they would love but haven't saved yet.

USER'S SAVED INSPIRATION:
${profile}

Analyze their taste: what destinations, vibes, activities, and hidden-gem sensibility do they gravitate toward?
Suggest places that feel discovered rather than obvious — avoid the first thing on TripAdvisor.
Each suggestion should be a real, specific place (not generic like "visit Japan").
Make the reason personal — reference patterns in what they've actually saved.`;

    const { object } = await generateObject({
      model: models.enrichment,
      schema: suggestionSchema,
      prompt,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error('[suggest]', err);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
