'use client';

import { updateItemEnrichment } from './db';
import { ImportResult } from './types';
import { checkEnrichmentLimit, recordEnrichment } from './rateLimits';
import { track } from './analytics';
import { notifyEnrichmentDone } from './notify';

export interface EnrichOptions {
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export async function enrichItem(id: string, url: string, opts: EnrichOptions = {}): Promise<boolean> {
  const limit = checkEnrichmentLimit();
  if (!limit.allowed) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[TravelPanel] Enrichment rate limit hit. Resets in ${Math.ceil((limit.resetsAt - Date.now()) / 60000)}m`);
    }
    return false;
  }

  await updateItemEnrichment(id, 'processing');
  recordEnrichment();
  try {
    const body: Record<string, string> = { url };
    if (opts.imageBase64) body.imageBase64 = opts.imageBase64;
    if (opts.imageMimeType) body.imageMimeType = opts.imageMimeType;

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    track('clip_enriched', {
      platform: data.platform,
      locationCount: data.locations.length,
      substanceCount: data.substance?.length ?? 0,
      visionUsed: !!opts.imageBase64,
    });
    notifyEnrichmentDone(data.title, data.locations.length, data.substance?.length ?? 0);
    return true;
  } catch {
    await updateItemEnrichment(id, 'failed');
    track('clip_enrich_failed', { url });
    return false;
  }
}
