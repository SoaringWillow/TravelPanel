'use client';

import { SavedItem } from './types';

export async function shareClip(item: SavedItem): Promise<'shared' | 'copied' | 'unavailable'> {
  const topLocations = item.locations.slice(0, 2).map((l) => l.name).join(', ');
  const text = [
    item.title || item.url,
    topLocations ? `📍 ${topLocations}` : '',
    item.url,
    'Saved with TravelPanel',
  ]
    .filter(Boolean)
    .join('\n');

  if (typeof navigator === 'undefined') return 'unavailable';

  if ('share' in navigator) {
    try {
      await navigator.share({ title: item.title || 'Travel inspiration', text, url: item.url });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'unavailable';
    }
  }

  if ('clipboard' in navigator) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch { /* denied */ }
  }

  return 'unavailable';
}
