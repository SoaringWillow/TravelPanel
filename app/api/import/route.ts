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

// ─── Image helpers ────────────────────────────────────────────────────────────

// Parse a data: URL or https: URL into something the AI SDK can consume.
// Returns { imageData, mimeType } or null if unusable.
function parseImageParam(imageUrl: string): { imageData: string; mimeType: string } | null {
  if (imageUrl.startsWith('data:')) {
    // data:image/jpeg;base64,<data>
    const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(imageUrl);
    if (!match) return null;
    return { imageData: match[2], mimeType: match[1] };
  }
  if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) {
    // Regular URL — return as-is (AI SDK handles URL images directly)
    return { imageData: imageUrl, mimeType: 'url' };
  }
  // Assume raw base64 JPEG
  return { imageData: imageUrl, mimeType: 'image/jpeg' };
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildTextPrompt(platform: string, url: string, page: Awaited<ReturnType<typeof fetchPageData>>) {
  return `You are a travel content analyzer extracting TWO layers from this social media post.

Platform: ${platform}
URL: ${url}
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
}

function buildVisionPrompt(platform: string, url: string) {
  return `You are a travel content analyzer. The image below is a screenshot from a ${platform} travel post (URL: ${url}).

Extract TWO layers from the visible content in this image:

## Layer 1 — Spots (geographic skeleton)
Identify any real, named locations visible in the image (place names, captions, overlaid text, map pins).
Only include places you are confident about with accurate GPS coordinates.
If no specific locations are visible, return an empty array.

## Layer 2 — Substance (the actual wisdom — MOST IMPORTANT)
Extract every tip, warning, opinion, recommendation, or insight visible in the image:
- Text overlays, captions, numbered lists
- Any written advice, ratings, or commentary
- Context clues about best time to visit, pricing, queues, etc.
Aim for 2–8 items (more for list-format posts).

Also infer a descriptive title and 2–3 sentence description from the image content.`;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string;
  let imageUrl: string | undefined;
  try {
    ({ url, imageUrl } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const platform = detectPlatform(url);
  const page = await fetchPageData(url);

  // Determine whether to use vision:
  // - Always use vision when an image is provided
  // - Also use vision for Xiaohongshu when page content is empty (anti-scraping)
  const parsedImage = imageUrl ? parseImageParam(imageUrl) : null;
  const pageEmpty = !page?.textContent?.trim() || page.textContent.trim().length < 50;
  const useVision = parsedImage !== null || (platform === 'xiaohongshu' && pageEmpty);

  let claudeResult: z.infer<typeof importSchema> | null = null;

  if (useVision && parsedImage) {
    // Vision path: use the image for extraction
    try {
      const imageContent =
        parsedImage.mimeType === 'url'
          ? ({ type: 'image' as const, image: new URL(parsedImage.imageData) })
          : ({ type: 'image' as const, image: parsedImage.imageData, mimeType: parsedImage.mimeType as `image/${string}` });

      const { object } = await generateObject({
        model: models.enrichment,
        schema: importSchema,
        messages: [
          {
            role: 'user',
            content: [
              imageContent,
              { type: 'text', text: buildVisionPrompt(platform, url) },
            ],
          },
        ],
      });
      claudeResult = object;
    } catch {
      // Fall through to text extraction
    }
  }

  // Text path: run if vision wasn't used or failed
  if (!claudeResult) {
    try {
      const { object } = await generateObject({
        model: models.enrichment,
        schema: importSchema,
        prompt: buildTextPrompt(platform, url, page),
      });
      claudeResult = object;
    } catch {
      // Fall through to defaults
    }
  }

  const result: ImportResult = {
    platform,
    title: (claudeResult?.title || page?.title || url).slice(0, 200),
    description: (claudeResult?.description || page?.description || '').slice(0, 500),
    thumbnail: page?.thumbnail || undefined,
    locations: claudeResult?.locations ?? [],
    activities: claudeResult?.activities ?? [],
    tags: claudeResult?.tags ?? [],
    substance: claudeResult?.substance ?? [],
  };

  return NextResponse.json(result);
}
