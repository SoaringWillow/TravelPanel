import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
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

const XHS_MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0 MiniProgramEnv/iOS';

async function fetchPageData(url: string) {
  const isXhs = url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link');
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': isXhs
          ? XHS_MOBILE_UA
          : 'Mozilla/5.0 (compatible; TravelPanel/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...(isXhs ? { Referer: 'https://www.xiaohongshu.com/' } : {}),
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

// ─── Claude Vision extractor ──────────────────────────────────────────────────

type VisionImageSource =
  | { type: 'base64'; data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }
  | { type: 'url'; url: string };

async function extractWithVision(
  imageSource: VisionImageSource,
  url: string,
  platform: string,
  title: string,
): Promise<z.infer<typeof importSchema> | null> {
  const visionPrompt = `You are a travel content analyzer. This is a screenshot or image from a ${platform} travel post.
URL: ${url}
${title ? `Title: ${title}` : ''}

Analyze the image and extract TWO layers:

## Layer 1 — Spots
Extract real, identifiable locations with GPS coordinates. Only include places you can clearly identify.

## Layer 2 — Substance (MOST IMPORTANT)
Extract every visible tip, warning, opinion, recommendation, or piece of travel wisdom shown in the image.
Read any visible text (captions, overlays, comments, watermarks) carefully. Capture everything actionable.`;

  const imageContentPart =
    imageSource.type === 'base64'
      ? { type: 'image' as const, image: imageSource.data, mimeType: imageSource.mediaType }
      : { type: 'image' as const, image: new URL(imageSource.url) };

  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: importSchema,
      messages: [
        {
          role: 'user',
          content: [
            imageContentPart,
            { type: 'text', text: visionPrompt },
          ],
        },
      ],
    });
    return object;
  } catch {
    return null;
  }
}

// Returns true when the page scrape yielded too little content to be useful
function isScrapeEmpty(page: Awaited<ReturnType<typeof fetchPageData>>): boolean {
  if (!page) return true;
  const combined = (page.title + page.description + page.textContent).trim();
  return combined.length < 80;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string;
  let imageBase64: string | undefined;
  let imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | undefined;
  let imageUrl: string | undefined;
  try {
    ({ url, imageBase64, imageMimeType, imageUrl } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const platform = detectPlatform(url);
  const page = await fetchPageData(url);

  // When an image is provided AND the text scrape was empty (anti-scraping platform),
  // use Claude Vision for richer extraction instead of the text-only path.
  const hasImage = !!imageBase64 || !!imageUrl;
  const scrapeEmpty = isScrapeEmpty(page);

  let visionResult: z.infer<typeof importSchema> | null = null;
  if (hasImage && scrapeEmpty) {
    const source: VisionImageSource = imageBase64
      ? { type: 'base64', data: imageBase64, mediaType: imageMimeType ?? 'image/jpeg' }
      : { type: 'url', url: imageUrl! };
    visionResult = await extractWithVision(source, url, platform, page?.title ?? '');
  }

  const prompt = `You are a travel content analyzer extracting TWO layers from this social media post.

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

  // Use vision result directly when scrape was empty; otherwise run text extraction
  let claudeResult: z.infer<typeof importSchema> | null = visionResult;
  if (!claudeResult) {
    try {
      const { object } = await generateObject({
        model: models.enrichment,
        schema: importSchema,
        prompt,
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
