import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform } from '@/lib/parse-url';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TravelPanel/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    const get = (pattern: RegExp) => pattern.exec(html)?.[1]?.trim() ?? '';

    const title =
      get(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i) ||
      get(/<title[^>]*>([^<]+)<\/title>/i) ||
      url;

    const thumbnail =
      get(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i) ||
      undefined;

    const platform = detectPlatform(url);

    return NextResponse.json({ title: title.slice(0, 200), thumbnail: thumbnail || null, platform });
  } catch {
    // Page unreachable (anti-scraping, timeout, etc.) — return minimal info
    const platform = detectPlatform(url);
    return NextResponse.json({ title: null, thumbnail: null, platform });
  }
}
