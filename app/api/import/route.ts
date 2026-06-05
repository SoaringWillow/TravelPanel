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

// ─── Image fetch helper (for og:image Vision fallback) ───────────────────────

type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: ImageMime } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelPanel/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    const mimeType: ImageMime = ct.includes('png') ? 'image/png'
      : ct.includes('webp') ? 'image/webp'
      : 'image/jpeg';
    const buf = await res.arrayBuffer();
    // Limit to 4 MB to stay under Anthropic's per-image limit
    if (buf.byteLength > 4 * 1024 * 1024) return null;
    const data = Buffer.from(buf).toString('base64');
    return { data, mimeType };
  } catch {
    return null;
  }
}

// ─── Shared prompt fragments ─────────────────────────────────────────────────

function buildPrompt(platform: string, url: string, page: { title: string; description: string; textContent: string } | null, withImage: boolean): string {
  return `You are a travel content analyzer extracting TWO layers from this social media post.${withImage ? ' An image of the post is also attached — read any visible text and visual content in it.' : ''}

Platform: ${platform}
URL: ${url}
Title: ${page?.title ?? '(unavailable)'}
Description: ${page?.description ?? '(unavailable)'}
${page?.textContent ? `Page content:\n${page.textContent}` : '(page content unavailable — rely on image analysis)'}

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

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string;
  let imageBase64: string | undefined;
  let imageMimeType: ImageMime = 'image/jpeg';

  try {
    const body = await req.json();
    url = body.url;
    imageBase64 = typeof body.imageBase64 === 'string' && body.imageBase64.length > 0
      ? body.imageBase64 : undefined;
    if (body.imageMimeType === 'image/png' || body.imageMimeType === 'image/webp') {
      imageMimeType = body.imageMimeType;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const platform = detectPlatform(url);
  const page = await fetchPageData(url);

  // Decide if Vision is needed:
  // - Caller supplied an image (iOS Share Sheet payload)
  // - OR platform is known to block server-side scraping (Xiaohongshu / WeChat)
  //   and the page fetch returned too little text
  const isAntiScrape = platform === 'xiaohongshu' || platform === 'wechat';
  const pageHasContent = !!(page?.description || (page?.textContent && page.textContent.trim().length > 200));
  const wantsVision = !!imageBase64 || (isAntiScrape && !pageHasContent);

  // Resolve the image to use for Vision (either from caller or fetched from og:image)
  let resolvedImage: { data: string; mimeType: ImageMime } | null = null;
  if (imageBase64) {
    resolvedImage = { data: imageBase64, mimeType: imageMimeType };
  } else if (wantsVision && page?.thumbnail) {
    resolvedImage = await fetchImageAsBase64(page.thumbnail);
  }

  const promptText = buildPrompt(platform, url, page, !!resolvedImage);

  let claudeResult: z.infer<typeof importSchema> | null = null;
  try {
    if (resolvedImage) {
      // Vision path: image + text for anti-scrape platforms and image payloads
      const { object } = await generateObject({
        model: models.enrichment,
        schema: importSchema,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image',
                image: `data:${resolvedImage.mimeType};base64,${resolvedImage.data}`,
              },
            ],
          },
        ],
      });
      claudeResult = object;
    } else {
      // Text-only path
      const { object } = await generateObject({
        model: models.enrichment,
        schema: importSchema,
        prompt: promptText,
      });
      claudeResult = object;
    }
  } catch {
    // Fall through to defaults
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
