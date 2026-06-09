'use client';

import { updateItemEnrichment } from './db';
import { ImportResult } from './types';
import { checkEnrichmentLimit, recordEnrichment, formatResetsIn } from './rateLimits';
import { track } from './analytics';

export type EnrichResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limited'; resetsAt: number; resetsInLabel: string }
  | { ok: false; reason: 'failed' };

async function doEnrich(id: string, url: string, imageBase64?: string): Promise<EnrichResult> {
  await updateItemEnrichment(id, 'processing');
  recordEnrichment();
  try {
    const body: Record<string, string> = { url };
    if (imageBase64) body.imageBase64 = imageBase64;

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
    });
    return { ok: true };
  } catch {
    await updateItemEnrichment(id, 'failed');
    track('clip_enrich_failed', { url });
    return { ok: false, reason: 'failed' };
  }
}

// Legacy boolean interface — kept for backward compat with retry queue.
export async function enrichItem(id: string, url: string, imageBase64?: string): Promise<boolean> {
  const limit = checkEnrichmentLimit();
  if (!limit.allowed) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[TravelPanel] Enrichment rate limit hit. Resets in ${Math.ceil((limit.resetsAt - Date.now()) / 60000)}m`);
    }
    return false;
  }
  const result = await doEnrich(id, url, imageBase64);
  return result.ok;
}

// Richer interface used by share page to give user feedback.
export async function enrichItemWithResult(id: string, url: string, imageBase64?: string): Promise<EnrichResult> {
  const limit = checkEnrichmentLimit();
  if (!limit.allowed) {
    return { ok: false, reason: 'rate_limited', resetsAt: limit.resetsAt, resetsInLabel: formatResetsIn(limit.resetsAt) };
  }
  return doEnrich(id, url, imageBase64);
}
