'use client';

import { updateItemEnrichment, markEnrichmentFailed } from './db';
import { ImportResult } from './types';
import { checkEnrichmentLimit, recordEnrichment } from './rateLimits';
import { track } from './analytics';

// Distinguishes the three very different "didn't work" cases so the UI can be
// honest: rate-limited (will retry later, nothing wrong), AI unconfigured
// (needs the API key), or a genuine failure (retry queue handles it).
export type EnrichResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limit' | 'ai_unavailable' | 'failed' };

export async function enrichItem(id: string, url: string): Promise<EnrichResult> {
  const limit = checkEnrichmentLimit();
  if (!limit.allowed) {
    // Don't mark as failed — leave as pending; the retry queue picks pending
    // items up on next app load, after the window has rolled.
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[TravelPanel] Enrichment rate limit hit. Resets in ${Math.ceil((limit.resetsAt - Date.now()) / 60000)}m`);
    }
    return { ok: false, reason: 'rate_limit' };
  }

  await updateItemEnrichment(id, 'processing');
  recordEnrichment();
  try {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      keepalive: true,
    });
    if (!res.ok) {
      await markEnrichmentFailed(id);
      track('clip_enrich_failed', { url, status: res.status });
      return { ok: false, reason: res.status === 503 ? 'ai_unavailable' : 'failed' };
    }
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
    await markEnrichmentFailed(id);
    track('clip_enrich_failed', { url });
    return { ok: false, reason: 'failed' };
  }
}
