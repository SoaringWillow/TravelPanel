import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectPlatform } from '@/lib/parse-url';
import { ImportResult } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchPageData(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; TravelPanel/1.0; +https://travelpanel.app)',
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

export async function POST(req: NextRequest) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const platform = detectPlatform(url);
  const page = await fetchPageData(url);

  const claudePrompt = `You are a travel content analyzer. Analyze this social media content and extract travel information.

Platform: ${platform}
URL: ${url}
Title: ${page?.title ?? '(unavailable)'}
Description: ${page?.description ?? '(unavailable)'}
Page content snippet:
${page?.textContent ?? '(could not fetch page)'}

Return ONLY valid JSON with no markdown, no explanation, exactly this shape:
{
  "title": "concise descriptive title for this travel content",
  "description": "2-3 sentence summary of the travel content",
  "locations": [
    {
      "name": "specific place name",
      "lat": 35.6762,
      "lng": 139.6503,
      "address": "optional full address"
    }
  ],
  "activities": ["specific activity 1", "activity 2"],
  "tags": ["food", "nature"]
}

Rules:
- Only include real locations with accurate GPS coordinates you are confident about
- If no specific identifiable location exists, return empty array for locations
- Activities should be specific things to do at the places
- Tags only from: food, nature, culture, adventure, relaxation, photography, shopping, nightlife, history, art, architecture, beach, mountain, city, rural
- Keep locations array empty rather than guessing coordinates`;

  let claudeResult: Partial<ImportResult> = {};
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: claudePrompt }],
    });
    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    // Strip potential markdown fences
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    claudeResult = JSON.parse(json);
  } catch {
    // Fall through to defaults
  }

  const result: ImportResult = {
    platform,
    title: (claudeResult.title || page?.title || url).slice(0, 200),
    description: (claudeResult.description || page?.description || '').slice(0, 500),
    thumbnail: page?.thumbnail || undefined,
    locations: Array.isArray(claudeResult.locations) ? claudeResult.locations : [],
    activities: Array.isArray(claudeResult.activities) ? claudeResult.activities : [],
    tags: Array.isArray(claudeResult.tags) ? claudeResult.tags : [],
  };

  return NextResponse.json(result);
}
