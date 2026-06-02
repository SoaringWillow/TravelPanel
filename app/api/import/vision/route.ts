import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ImportResult } from '@/lib/types';
import { models } from '@/lib/models';

// ─── Schemas (mirrors /api/import) ──────────────────────────────────────────

const locationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

const substanceSchema = z.object({
  type: z.enum(['tip', 'warning', 'opinion', 'wisdom', 'context', 'recommendation']),
  content: z.string().describe('The insight in 1–2 sentences, in your own words'),
  applies_to: z.string().optional().describe('Spot name, season, or trip phase this relates to'),
  source_quote: z.string().optional().describe('Short verbatim text fragment from the image'),
});

const visionSchema = z.object({
  title: z.string().describe('Concise descriptive title for this travel content'),
  description: z.string().describe('2–3 sentence summary of the travel content'),
  locations: z.array(locationSchema).describe('Real identifiable locations visible or mentioned with accurate GPS coordinates. Empty array if none are certain.'),
  activities: z.array(z.string()).describe('Specific things to do at these places'),
  tags: z.array(z.string()).describe('Relevant tags from: food, nature, culture, adventure, relaxation, photography, shopping, nightlife, history, art, architecture, beach, mountain, city, rural'),
  substance: z.array(substanceSchema).describe(
    'Every piece of travel wisdom visible in this image: tips, warnings, opinions, actionable advice, seasonal notes, cash-only flags, first-timer mistakes. ' +
    'Read all visible text carefully. For list-format posts (e.g. "10 mistakes in Tokyo"), extract every item. ' +
    'This is the most important field — never return an empty array for a real travel post.'
  ),
});

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let imageBase64: string;
  let mimeType: string;
  let url: string | undefined;
  let title: string | undefined;

  try {
    ({ imageBase64, mimeType, url, title } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
  }

  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const safeMime = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';

  const textPrompt = `You are analyzing a screenshot from a travel social media post — likely from Xiaohongshu (Little Red Book), Instagram, or a similar platform where web scraping is blocked.

Extract TWO layers:

## Layer 1 — Spots (geographic skeleton)
Real, identifiable named places visible or mentioned in this image. Only include locations with GPS coordinates you are confident about. Return an empty array if no specific named places are identifiable.

## Layer 2 — Substance (THE MOST IMPORTANT LAYER — this is what competitors miss)
Every piece of actionable travel wisdom visible in this image:
- Tips: "arrive before 8am", "take exit B2", "book 3 months ahead"
- Warnings: "cash only", "closed on Mondays", "avoid in August typhoon season"
- Recommendations: "order the set lunch not à la carte", "skip the crowded main entrance"
- Opinions: "overrated for the price", "hidden gem most tourists miss"
- Wisdom: "cherry blossoms peak mid-April, not early April as most guides say"
- Context: "free entry on first Sunday of the month"

Read ALL text visible in the image — captions, overlays, body text, numbered lists.
For list-format posts ("10 mistakes to avoid", "35 tips for Tokyo"), extract EVERY item.
Even a mostly-photo post with a short caption can yield 3–5 substance items.
${title ? `\nPost title hint: "${title}"` : ''}
${url ? `\nOriginal URL (scraping was blocked): ${url}` : ''}`;

  try {
    const { object } = await generateObject({
      model: models.enrichment,
      schema: visionSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageBase64,
              mediaType: safeMime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            },
            { type: 'text', text: textPrompt },
          ],
        },
      ],
    });

    const result: ImportResult = {
      platform: 'other',
      title: (object.title || title || 'Travel inspiration').slice(0, 200),
      description: object.description.slice(0, 500),
      thumbnail: undefined,
      locations: object.locations,
      activities: object.activities,
      tags: object.tags,
      substance: object.substance,
    };

    return NextResponse.json(result);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('[vision] Claude error:', err);
    return NextResponse.json({ error: 'Vision extraction failed' }, { status: 500 });
  }
}
