'use client';

import { useState, useEffect } from 'react';
import { cacheImage, isImageCached } from '@/lib/imageCache';

/**
 * Returns the image URL to use for a thumbnail.
 * Triggers background pre-caching if the URL isn't cached yet.
 * The returned src is always the original URL — the SW serves it from cache when offline.
 */
export function useCachedImage(url: string | undefined): string | undefined {
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    isImageCached(url).then((hit) => {
      if (cancelled) return;
      if (hit) {
        setCached(true);
      } else {
        // Pre-cache in the background — don't await
        cacheImage(url).then(() => {
          if (!cancelled) setCached(true);
        });
      }
    });

    return () => { cancelled = true; };
  }, [url]);

  return url; // Always return the original URL; SW handles offline serving
}
