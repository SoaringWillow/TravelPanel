import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ImportResult } from '@/lib/types';
import { models } from '@/lib/models';

// ─── Schemas (same as import/route.ts) ───────────────────────────────────────

const locationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

const substanceSchema = z.object({
  type: z.enum(['tip', 'warning', 'opinion', 'wisdom', 'context', 'recommendation']),
  content: z.string().describe('The insight in 1–2 sentences, in your own words'),
  applies_to: z.string().optional(),
  source_quote: z.string().optional(),
});

const importSchema = z.object({
  title: z.string().describe('Concise descriptive title for this travel content'),
  description: z.string().describe('2-3 sentence summary of the travel content'),
  locations: z.array(locationSchema).describe('Real identifiable locations with accurate GPS coordinates'),
  activities: z.array(z.string()),
  tags: z.array(z.string()).describe('Tags from: food, nature, culture, adventure, relaxation, photography, shopping, nightlife, history, art, architecture, beach, mountain, city, rural'),
  substance: z.array(substanceSchema).describe(
    'Every actionable tip, warning, opinion, or wisdom visible in the image. ' +
    'Read all visible text in the image (captions, overlays, UI labels) and extract every insight. ' +
    'Aim for 2–8 items for a typical post.'
  ),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let imageBase64: string;
  let url: string | undefined;
  let platform: string | undefined;

  try {
    ({ imageBase64, url, platform } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
  }

  // Strip data-URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const prompt = `You are analyzing a screenshot from a travel social media post (likely Xiaohongshu / 小红书 or WeChat).

Extract TWO layers from this image:

## Layer 1 — Spots (geographic skeleton)
Read all visible text including Chinese characters. Identify real, named locations with GPS coordinates you are confident about. Only include places you can confidently geolocate.

## Layer 2 — Substance (the wisdom — MOST IMPORTANT)
Extract every piece of actionable insight visible in the image: tips, warnings, opinions, recommendations, seasonal advice, pricing hints, time-of-day tips, etc.
Read ALL text visible in the image including:
- Post captions and body text
- On-screen overlays and callout bubbles
- Comments visible in the screenshot
- Any list items or numbered tips

${url ? `Source URL: ${url}` : ''}
${platform ? `Platform: ${platform}` : ''}

For Chinese-language posts: translate content to English in your extraction, but retain original place names.`;

  let claudeResult: z.infer<typeof importSchema> | null = null;
  try {
    const { object } = await generateObject({
      model: models.vision,
      schema: importSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:image/jpeg;base64,${base64Data}`,
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });
    claudeResult = object;
  } catch {
    return NextResponse.json({ error: 'Vision extraction failed' }, { status: 500 });
  }

  const result: ImportResult = {
    platform: (platform as ImportResult['platform']) ?? 'other',
    title: (claudeResult.title || 'Travel inspiration').slice(0, 200),
    description: (claudeResult.description || '').slice(0, 500),
    thumbnail: undefined,
    locations: claudeResult.locations ?? [],
    activities: claudeResult.activities ?? [],
    tags: claudeResult.tags ?? [],
    substance: claudeResult.substance ?? [],
  };

  return NextResponse.json(result);
}
