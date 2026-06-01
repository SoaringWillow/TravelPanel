import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { detectPlatform } from '@/lib/parse-url';
import { ImportResult } from '@/lib/types';

// ─── CORS (same as /api/import — needed for browser extension) ───────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Extension',
} as const;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ─── Schemas (identical to import route) ─────────────────────────────────────

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

const visionSchema = z.object({
  title: z.string().describe('Concise descriptive title for this travel content'),
  description: z.string().describe('2-3 sentence summary'),
  locations: z.array(locationSchema).describe(
    'Real identifiable locations with accurate GPS coordinates. Only include places you are confident about.'
  ),
  activities: z.array(z.string()),
  tags: z.array(z.string()),
  substance: z.array(substanceSchema).describe(
    'Every piece of actionable travel wisdom visible in the image: tips, warnings, price signals, timing advice, ' +
    'opinions, "skip the tourist version"-style advice. This is the most important field. ' +
    'Extract everything useful — a good post screenshot should yield 3–8 substance items.'
  ),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let imageBase64: string;
  let mimeType: string;
  let url: string | undefined;

  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType || 'image/jpeg';
    url = body.url;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return NextResponse.json({ error: 'imageBase64 required' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
    mimeType = 'image/jpeg';
  }

  const platform = url ? detectPlatform(url) : 'other';

  const prompt =
    `You are analyzing a screenshot from ${platform === 'xiaohongshu' ? 'Xiaohongshu (Little Red Book)' : platform === 'wechat' ? 'WeChat' : 'a travel post'} shared by a user.

Extract TWO layers of travel information from the image:

## Layer 1 — Spots (geographic skeleton)
Real, identifiable locations with GPS coordinates you are confident about.
Read any text, captions, or location tags visible in the screenshot.
If the post doesn't show specific named places, return an empty locations array.

## Layer 2 — Substance (the actual wisdom — THIS IS THE MOST IMPORTANT LAYER)
Extract every piece of actionable insight, advice, warning, or opinion visible in the image.
Read ALL text in the screenshot including captions, overlays, comments visible, and any embedded text.
Examples:
- "Arrive before 8am to beat the queue" → tip
- "Cash only at this market" → warning
- "The set lunch menu is half the price" → tip
- "This spot was overrated for the price" → opinion
- "Cherry blossom peaks mid-April" → wisdom

Extract everything useful. If there is no readable text, infer substance from the visual content.
${url ? `\nSource URL: ${url}` : ''}`;

  let claudeResult: z.infer<typeof visionSchema> | null = null;
  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: visionSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageBase64,
              mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
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
  } catch (err) {
    console.error('Vision extraction error:', err);
    return NextResponse.json(
      { error: 'Vision extraction failed', detail: String(err).slice(0, 200) },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const result: ImportResult = {
    platform,
    title: (claudeResult.title || 'Travel Post').slice(0, 200),
    description: (claudeResult.description || '').slice(0, 500),
    thumbnail: undefined,
    locations: claudeResult.locations ?? [],
    activities: claudeResult.activities ?? [],
    tags: claudeResult.tags ?? [],
    substance: claudeResult.substance ?? [],
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
