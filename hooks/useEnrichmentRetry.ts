'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getItemsByStatus, updateItemEnrichment } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';

const MAX_RETRIES = 3;

// Runs on app load, finds items that failed enrichment, and retries them
// with exponential backoff. Also resets items stuck in 'processing' (app crash).
export function useEnrichmentRetry(onItemUpdated: (id: string) => void) {
  const hasRun = useRef(false);
  // Store the latest callback in a ref so the effect closure doesn't go stale
  const callbackRef = useRef(onItemUpdated);
  useEffect(() => { callbackRef.current = onItemUpdated; });

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function runRetries() {
      // Recover items stuck in 'processing' — these were in-flight when the
      // app was closed. Decrement their retryCount so they don't burn a retry slot.
      const stuckItems = await getItemsByStatus('processing');
      for (const item of stuckItems) {
        // Reset to failed; updateItemEnrichment will increment retryCount,
        // but we clamp it to avoid penalising the user for a crash.
        const db_item = { ...item, retryCount: Math.max(0, (item.retryCount ?? 0) - 1) };
        await updateItemEnrichment(db_item.id, 'failed');
        callbackRef.current(db_item.id);
      }

      // Retry failed items that haven't exhausted their budget
      const failedItems = await getItemsByStatus('failed');
      const retryable = failedItems.filter((i) => (i.retryCount ?? 0) < MAX_RETRIES);

      for (const item of retryable) {
        const delay = Math.pow(2, (item.retryCount ?? 0)) * 1000; // 2s, 4s, 8s
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        await enrichItem(item.id, item.url);
        callbackRef.current(item.id);
      }
    }

    runRetries();
  }, []); // intentionally empty — runs once on mount

  // Manual retry for a single card
  const retryItem = useCallback(async (id: string, url: string) => {
    await updateItemEnrichment(id, 'processing');
    callbackRef.current(id);
    await enrichItem(id, url);
    callbackRef.current(id);
  }, []);

  // Triggered by pull-to-refresh — re-runs the full retry queue
  const retryAll = useCallback(async () => {
    const failedItems = await getItemsByStatus('failed');
    const retryable   = failedItems.filter((i) => (i.retryCount ?? 0) < MAX_RETRIES);
    for (const item of retryable) {
      await updateItemEnrichment(item.id, 'processing');
      callbackRef.current(item.id);
      await enrichItem(item.id, item.url);
      callbackRef.current(item.id);
    }
  }, []);

  return { retryItem, retryAll };
}
