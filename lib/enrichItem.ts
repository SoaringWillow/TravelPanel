'use client';

import { updateItemEnrichment } from './db';
import { ImportResult } from './types';
import { checkEnrichmentLimit, recordEnrichment } from './rateLimits';
import { track } from './analytics';

// ─── Live-stage broadcast ─────────────────────────────────────────────────────
// Components subscribe while a card is in 'processing' state.

const stageListeners = new Map<string, (stage: string) => void>();

export function onEnrichmentProgress(id: string, cb: (stage: string) => void): () => void {
  stageListeners.set(id, cb);
  return () => stageListeners.delete(id);
}

// ─── Enrichment entry point ──────────────────────────────────────────────────

export async function enrichItem(
  id: string,
  url: string,
  imageBase64?: string,
): Promise<boolean> {
  const limit = checkEnrichmentLimit();
  if (!limit.allowed) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[TravelPanel] Enrichment rate limit hit. Resets in ${Math.ceil((limit.resetsAt - Date.now()) / 60000)}m`);
    }
    return false;
  }

  await updateItemEnrichment(id, 'processing');
  recordEnrichment();

  const notify = (stage: string) => stageListeners.get(id)?.(stage);

  try {
    const body: Record<string, string> = { url };
    if (imageBase64) {
      body.imageBase64 = imageBase64;
      body.imageMimeType = 'image/jpeg';
    }

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let result: ImportResult | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'progress') notify(msg.stage);
          if (msg.type === 'result') result = msg.data as ImportResult;
          if (msg.type === 'error') throw new Error(msg.message);
        } catch (parseErr) {
          // skip malformed lines
        }
      }
    }

    if (!result) throw new Error('No result received');

    await updateItemEnrichment(id, 'done', {
      title: result.title,
      description: result.description,
      thumbnail: result.thumbnail,
      locations: result.locations,
      activities: result.activities,
      tags: result.tags,
      substance: result.substance,
      platform: result.platform,
    });
    track('clip_enriched', {
      platform: result.platform,
      locationCount: result.locations.length,
      substanceCount: result.substance?.length ?? 0,
    });
    return true;
  } catch {
    await updateItemEnrichment(id, 'failed');
    track('clip_enrich_failed', { url });
    return false;
  }
}
