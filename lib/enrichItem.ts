'use client';

import { updateItemEnrichment, getItemById, saveItem } from './db';
import { ImportResult } from './types';
import { checkEnrichmentLimit, recordEnrichment } from './rateLimits';
import { track } from './analytics';
import { buildEmbeddingText } from './semanticSearch';

// Generate and persist an embedding for a clip after enrichment completes.
// Fire-and-forget — failure is silent since keyword search still works.
async function generateAndStoreEmbedding(id: string): Promise<void> {
  const item = await getItemById(id);
  if (!item) return;

  const text = buildEmbeddingText(item);
  if (!text) return;

  try {
    const res = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type: 'document' }),
    });
    if (!res.ok) return;
    const { embedding } = await res.json();
    if (!Array.isArray(embedding) || embedding.length === 0) return;

    // Persist embedding back onto the item
    await saveItem({ ...item, embedding });
  } catch {
    // Network error or VOYAGE_API_KEY not set — silently skip
  }
}

export async function enrichItem(id: string, url: string, imageData?: string): Promise<boolean> {
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
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, ...(imageData ? { imageData } : {}) }),
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

    // Generate semantic embedding after enrichment (fire-and-forget)
    generateAndStoreEmbedding(id).catch(() => {});

    return true;
  } catch {
    await updateItemEnrichment(id, 'failed');
    track('clip_enrich_failed', { url });
    return false;
  }
}
