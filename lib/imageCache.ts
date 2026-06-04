'use client';

const CACHE_NAME = 'thumbnails-v1';

function available(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/** Pre-fetch and store a thumbnail in the Cache API. Silently no-ops on failure. */
export async function cacheImage(url: string): Promise<void> {
  if (!url || !available()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const existing = await cache.match(url);
    if (existing) return;
    // mode:'no-cors' produces an opaque response — storable and img-serveable by SW
    const response = await fetch(url, { mode: 'no-cors' });
    await cache.put(url, response);
  } catch {
    // Network errors, CORS, etc. — silently skip
  }
}

/** Check whether a URL is already in the thumbnail cache. */
export async function isImageCached(url: string): Promise<boolean> {
  if (!url || !available()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

/** Remove a cached thumbnail. Call when its item is deleted. */
export async function evictImage(url: string): Promise<void> {
  if (!url || !available()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
  } catch {}
}

/** Returns total bytes stored in the thumbnail cache (approximate). */
export async function getThumbnailCacheSize(): Promise<number> {
  if (!available()) return 0;
  try {
    // Use StorageEstimate for a quick overall estimate
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate) return 0;
    // We can't get per-cache granularity without reading every entry,
    // so return overall quota usage as a proxy.
    return estimate.usage ?? 0;
  } catch {
    return 0;
  }
}
