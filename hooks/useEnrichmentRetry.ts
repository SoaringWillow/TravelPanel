'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getItemsByStatus, updateItemEnrichment } from '@/lib/db';
import { enrichItem, EnrichResult } from '@/lib/enrichItem';

const MAX_RETRIES = 3;

// The auto-retry pass must run exactly once per app load even though several
// components mount this hook (layout-level AppServices + inbox for its manual
// retry button). Module scope survives re-mounts; a ref would not.
let autoRetryStarted = false;

// Runs on app load, finds items that failed (or never got) enrichment, and
// retries them with exponential backoff. Also resets items stuck in
// 'processing' (app was closed mid-flight).
export function useEnrichmentRetry(onItemUpdated: (id: string) => void) {
  // Store the latest callback in a ref so the effect closure doesn't go stale
  const callbackRef = useRef(onItemUpdated);
  useEffect(() => { callbackRef.current = onItemUpdated; });

  useEffect(() => {
    if (autoRetryStarted) return;
    autoRetryStarted = true;

    async function runRetries() {
      // Recover items stuck in 'processing' — in-flight when the app closed.
      // Flipping to 'failed' does NOT count an attempt (markEnrichmentFailed
      // is the only increment path), so a crash never burns a retry slot.
      const stuckItems = await getItemsByStatus('processing');
      for (const item of stuckItems) {
        await updateItemEnrichment(item.id, 'failed');
        callbackRef.current(item.id);
      }

      // Two queues share the retry budget:
      //  - failed: a real attempt errored
      //  - pending: saved but never analyzed (rate-limited at save time, or
      //    saved via "save URL for later") — without this they'd wait forever
      const [failedItems, pendingItems] = await Promise.all([
        getItemsByStatus('failed'),
        getItemsByStatus('pending'),
      ]);
      const retryable = [...failedItems, ...pendingItems].filter(
        (i) => (i.retryCount ?? 0) < MAX_RETRIES,
      );

      for (const item of retryable) {
        const delay = Math.pow(2, (item.retryCount ?? 0)) * 1000; // 1s, 2s, 4s
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        const result = await enrichItem(item.id, item.url);
        callbackRef.current(item.id);
        // Window exhausted — every further attempt this pass would also bounce
        if (!result.ok && result.reason === 'rate_limit') break;
      }
    }

    runRetries();
  }, []); // intentionally empty — runs once on mount

  // Manual retry triggered by the user clicking "Retry" on a card
  const retryItem = useCallback(async (id: string, url: string): Promise<EnrichResult> => {
    // Temporarily mark as processing so the card shows a spinner
    await updateItemEnrichment(id, 'processing');
    callbackRef.current(id);
    const result = await enrichItem(id, url);
    callbackRef.current(id);
    return result;
  }, []);

  return { retryItem };
}
