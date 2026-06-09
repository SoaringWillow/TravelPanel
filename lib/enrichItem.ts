'use client';

import { updateItemEnrichment, getAllItems } from './db';
import { ImportResult } from './types';
import { checkEnrichmentLimit, recordEnrichment } from './rateLimits';
import { track } from './analytics';

// When offline, retry pending items on reconnect (one-time listener per page load)
let retryListenerArmed = false;
function armOfflineRetry() {
  if (retryListenerArmed || typeof window === 'undefined') return;
  retryListenerArmed = true;
  window.addEventListener('online', async () => {
    const items = await getAllItems();
    const pending = items.filter((i) => i.enrichmentStatus === 'pending' && i.url);
    for (const item of pending) {
      // Fire-and-forget — don't await to avoid blocking the online event
      enrichItem(item.id, item.url);
    }
  }, { once: true });
}

// image: optional base64 JPEG from the iOS Share Extension screenshot.
// Passed through to /api/import for Claude Vision extraction on anti-scraping
// platforms like Xiaohongshu that block HTML fetching.
export async function enrichItem(id: string, url: string, image?: string): Promise<boolean> {
  // If offline, leave as pending and arm a retry-on-reconnect listener
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    armOfflineRetry();
    return false;
  }

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
    if (image) body.image = image;

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
    return true;
  } catch {
    await updateItemEnrichment(id, 'failed');
    track('clip_enrich_failed', { url });
    return false;
  }
}
