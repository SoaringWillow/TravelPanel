'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getItemsByStatus, updateItemEnrichment } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';

const MAX_RETRIES = 3;

// Runs on app load, finds items that failed enrichment, and retries them
// with exponential backoff. Also resets items stuck in 'processing' (app crash).
// On network restore, automatically re-queues pending/failed items.
export function useEnrichmentRetry(onItemUpdated: (id: string) => void) {
  const hasRun = useRef(false);
  const isRetrying = useRef(false);
  const callbackRef = useRef(onItemUpdated);
  useEffect(() => { callbackRef.current = onItemUpdated; });
  const [onlineToast, setOnlineToast] = useState<string | null>(null);

  const runRetries = useCallback(async (isOnlineResume = false) => {
    if (isRetrying.current) return;
    isRetrying.current = true;
    try {
      // Recover items stuck in 'processing' — in-flight when the app was closed
      const stuckItems = await getItemsByStatus('processing');
      for (const item of stuckItems) {
        const adjusted = { ...item, retryCount: Math.max(0, (item.retryCount ?? 0) - 1) };
        await updateItemEnrichment(adjusted.id, 'failed');
        callbackRef.current(adjusted.id);
      }

      // Retry failed items that haven't exhausted their budget
      const failedItems = await getItemsByStatus('failed');
      const retryable = failedItems.filter((i) => (i.retryCount ?? 0) < MAX_RETRIES);

      if (isOnlineResume && retryable.length > 0) {
        setOnlineToast(`Back online — enriching ${retryable.length} saved clip${retryable.length !== 1 ? 's' : ''}`);
        setTimeout(() => setOnlineToast(null), 4000);
      }

      for (const item of retryable) {
        const delay = Math.pow(2, (item.retryCount ?? 0)) * 1000; // 2s, 4s, 8s
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        await enrichItem(item.id, item.url);
        callbackRef.current(item.id);
      }
    } finally {
      isRetrying.current = false;
    }
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runRetries(false);
  }, [runRetries]);

  // Re-trigger retry queue when network is restored
  useEffect(() => {
    function handleOnline() { runRetries(true); }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [runRetries]);

  // Manual retry triggered by the user clicking "Retry" on a card
  const retryItem = useCallback(async (id: string, url: string) => {
    await updateItemEnrichment(id, 'processing');
    callbackRef.current(id);
    await enrichItem(id, url);
    callbackRef.current(id);
  }, []);

  return { retryItem, onlineToast };
}
