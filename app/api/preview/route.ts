import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform } from '@/lib/parse-url';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelPanelBot/1.0)' },
    });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json({ title: null, thumbnail: null, platform: detectPlatform(url) });

    const html = await res.text();

    const getMetaContent = (name: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) return m[1];
      }
      return null;
    };

    const title =
      getMetaContent('og:title') ??
      getMetaContent('twitter:title') ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;

    const thumbnail =
      getMetaContent('og:image') ??
      getMetaContent('twitter:image') ??
      null;

    const platform = detectPlatform(url);

    return NextResponse.json({ title, thumbnail, platform });
  } catch {
    return NextResponse.json({ title: null, thumbnail: null, platform: detectPlatform(url) });
  }
}
