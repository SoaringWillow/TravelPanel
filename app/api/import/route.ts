import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { detectPlatform } from '@/lib/parse-url';
import { ImportResult } from '@/lib/types';
import { models } from '@/lib/models';

// ─── Schemas ────────────────────────────────────────────────────────────────

const locationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

// Substance schema: the wisdom layer — tips, warnings, opinions extracted from
// the post content itself, not just the location pins.
const substanceSchema = z.object({
  type: z.enum(['tip', 'warning', 'opinion', 'wisdom', 'context', 'recommendation']),
  content: z.string().describe('The insight in 1–2 sentences, in your own words'),
  applies_to: z.string().optional().describe('Spot name, season, or trip phase this relates to'),
  source_quote: z.string().optional().describe('A short verbatim fragment from the original post that this is based on'),
});

const importSchema = z.object({
  title: z.string().describe('Concise descriptive title for this travel content'),
  description: z.string().describe('2-3 sentence summary of the travel content'),
  locations: z.array(locationSchema).describe('Real identifiable locations with accurate GPS coordinates. Only include places you are confident about.'),
  activities: z.array(z.string()).describe('Specific things to do at these places'),
  tags: z.array(z.string()).describe('Relevant tags from: food, nature, culture, adventure, relaxation, photography, shopping, nightlife, history, art, architecture, beach, mountain, city, rural'),
  substance: z.array(substanceSchema).describe(
    'The actual wisdom in this post: tips, warnings, opinions, "go in the morning"-style advice, cash-only flags, "skip the tourist version", seasonal warnings, first-timer mistakes. ' +
    'This is the most important field. Even if no specific locations are named, extract every piece of actionable or insightful content. ' +
    'A post titled "35 mistakes to avoid in Hawaii" should produce 35 substance items. ' +
    'Aim for 2–8 items for a typical post; more for list-style content.'
  ),
});

// ─── Page fetcher ────────────────────────────────────────────────────────────

async function fetchPageData(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TravelPanel/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const get = (pattern: RegExp) => pattern.exec(html)?.[1]?.trim() ?? '';

    const title =
      get(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i) ||
      get(/<title[^>]*>([^<]+)<\/title>/i);

    const description =
      get(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i) ||
      get(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ||
      get(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i);

    const thumbnail =
      get(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);

    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 2500);

    return { title, description, thumbnail, textContent };
  } catch {
    return null;
  }
}

// ─── Vision extraction (for Xiaohongshu / anti-scraping platforms) ──────────

async function extractFromImage(
  imageBase64: string,
  urlHint: string,
  titleHint: string,
): Promise<z.infer<typeof importSchema> | null> {
  const platform = detectPlatform(urlHint);
  const prompt = `You are a travel content analyzer. The image below is a screenshot from a social media travel post${platform !== 'other' ? ` (${platform})` : ''}.
URL hint: ${urlHint || '(none)'}
Title hint: ${titleHint || '(none)'}

Extract TWO layers from what you can see in the image:

## Layer 1 — Spots (geographic skeleton)
Identify real, named locations visible in the image (map pins, place names, captions, overlaid text).
Only include places with coordinates you are confident about.

## Layer 2 — Substance (the actual wisdom — MOST IMPORTANT)
Extract every tip, warning, recommendation, or insight visible in the image text:
overlaid text, captions, lists, bullet points, sticker annotations, comment excerpts.

Return empty arrays only if nothing relevant is visible.`;

  try {
    const { generateObject: go } = await import('ai');
    const { object } = await go({
      model: models.enrichment,
      schema: importSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: imageBase64, mimeType: 'image/jpeg' as const },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });
    return object;
  } catch {
    return null;
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string;
  let imageBase64: string | undefined;
  let titleHint: string | undefined;
  try {
    ({ url, imageBase64, titleHint } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if ((!url || typeof url !== 'string') && !imageBase64) {
    return NextResponse.json({ error: 'url or imageBase64 required' }, { status: 400 });
  }

  const safeUrl = url ?? '';
  const platform = detectPlatform(safeUrl);

  // When we have an image, try vision extraction first (covers anti-scraping platforms)
  let visionResult: z.infer<typeof importSchema> | null = null;
  if (imageBase64) {
    visionResult = await extractFromImage(imageBase64, safeUrl, titleHint ?? '');
  }

  // Also attempt text extraction from the URL when available
  const page = safeUrl ? await fetchPageData(safeUrl) : null;

  // Skip text-based Claude call if vision already succeeded with substance,
  // or if we have nothing useful to feed it
  const skipTextExtraction =
    visionResult !== null &&
    (visionResult.substance.length > 0 || visionResult.locations.length > 0);

  let textResult: z.infer<typeof importSchema> | null = null;
  if (!skipTextExtraction && safeUrl) {
    const prompt = `You are a travel content analyzer extracting TWO layers from this social media post.

Platform: ${platform}
URL: ${safeUrl}
Title: ${page?.title ?? '(unavailable)'}
Description: ${page?.description ?? '(unavailable)'}
Page content:
${page?.textContent ?? '(could not fetch page)'}

## Layer 1 — Spots (geographic skeleton)
Extract real, identifiable locations with GPS coordinates you are confident about.
If the post doesn't mention specific named places, return an empty locations array.
Do NOT invent or guess coordinates.

## Layer 2 — Substance (the actual wisdom — THIS IS THE MOST IMPORTANT LAYER)
Extract every piece of actionable insight, advice, warning, or opinion from the post.
This is what competitors miss. Examples of what to capture:
- "Arrive before 8am to beat the queue" → tip
- "The set lunch menu is half the price of dinner" → tip
- "Cash only, nearest ATM is 10 min walk" → warning
- "Skip the official viewpoint — the back alley has the better angle" → recommendation
- "Cherry blossom peaks mid-April, not early April as most guides say" → wisdom
- "It was overrated for the price" → opinion
- "If you're visiting in August, be aware it's typhoon season" → context
- "The 'mistake' everyone makes is booking accommodation in tourist district" → warning

For list-format content like "35 mistakes to avoid" or "10 things I wish I knew", extract ALL items.
A post with no specific location can still have 5–10 substance items.
Never return an empty substance array for a real travel post.`;

    try {
      const { object } = await generateObject({
        model: models.enrichment,
        schema: importSchema,
        prompt,
      });
      textResult = object;
    } catch {
      // Fall through to defaults
    }
  }

  // Merge: vision result takes precedence; text result fills gaps
  const merged = visionResult ?? textResult;
  const substance = [
    ...(visionResult?.substance ?? []),
    ...(textResult?.substance ?? []),
  ].filter(
    (item, i, arr) => arr.findIndex((o) => o.content === item.content) === i,
  );
  const locations = [
    ...(visionResult?.locations ?? []),
    ...(textResult?.locations ?? []),
  ].filter(
    (loc, i, arr) => arr.findIndex((o) => o.name === loc.name) === i,
  );

  const result: ImportResult = {
    platform,
    title: (merged?.title || page?.title || safeUrl).slice(0, 200),
    description: (merged?.description || page?.description || '').slice(0, 500),
    thumbnail: page?.thumbnail || undefined,
    locations,
    activities: merged?.activities ?? [],
    tags: merged?.tags ?? [],
    substance,
  };

  return NextResponse.json(result);
}
