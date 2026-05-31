'use client';

import { updateItemEnrichment } from './db';
import { ImportResult } from './types';

export async function enrichItem(id: string, url: string): Promise<boolean> {
  await updateItemEnrichment(id, 'processing');
  try {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      keepalive: true,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ImportResult;
    await updateItemEnrichment(id, 'done', {
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      locations: data.locations,
      activities: data.activities,
      tags: data.tags,
      substance: data.substance,
      platform: data.platform,
    });
    return true;
  } catch {
    await updateItemEnrichment(id, 'failed');
    return false;
  }
}
