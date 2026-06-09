'use client';

import { updateItemEnrichment } from './db';
import { ImportResult, SavedItem } from './types';
import { checkEnrichmentLimit, recordEnrichment } from './rateLimits';
import { track } from './analytics';

export async function enrichItem(id: string, url: string, imageBase64?: string): Promise<boolean> {
  const limit = checkEnrichmentLimit();
  if (!limit.allowed) {
    // Don't mark as failed — leave as pending so retry queue picks it up later
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[TravelPanel] Enrichment rate limit hit. Resets in ${Math.ceil((limit.resetsAt - Date.now()) / 60000)}m`);
    }
    return false;
  }

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
    const enrichFields: Partial<SavedItem> = {
      title: data.title,
      description: data.description,
      locations: data.locations,
      activities: data.activities,
      tags: data.tags,
      substance: data.substance,
      platform: data.platform,
    };
    // Only overwrite thumbnail if the API returned one — preserve any Share Extension thumbnail
    if (data.thumbnail) enrichFields.thumbnail = data.thumbnail;
    await updateItemEnrichment(id, 'done', enrichFields);
    track('clip_enriched', {
      platform: data.platform,
      locationCount: data.locations.length,
      substanceCount: data.substance?.length ?? 0,
    });
    return true;
  } catch (err) {
    // Network error (offline, DNS failure, timeout) → keep as pending for offline retry
    const isNetworkError = err instanceof TypeError &&
      (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Network'));
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isNetworkError || isOffline) {
      await updateItemEnrichment(id, 'pending');
      return false;
    }
    // API error (4xx/5xx) → mark failed, increment retryCount
    await updateItemEnrichment(id, 'failed');
    track('clip_enrich_failed', { url });
    return false;
  }
}
