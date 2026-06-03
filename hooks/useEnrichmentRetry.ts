'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getItemsByStatus, updateItemEnrichment } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { hapticNotification } from './useHaptic';

const MAX_RETRIES = 3;

interface RetryState {
  inFlight: number;  // retries currently running
  succeeded: number; // retries that resolved this session
  failed: number;    // retries that exhausted budget
}

export function useEnrichmentRetry(onItemUpdated: (id: string) => void) {
  const hasRun     = useRef(false);
  const callbackRef = useRef(onItemUpdated);
  useEffect(() => { callbackRef.current = onItemUpdated; });

  const [retryState, setRetryState] = useState<RetryState>({ inFlight: 0, succeeded: 0, failed: 0 });

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function runRetries() {
      // Recover items stuck in 'processing' from a previous app session
      const stuckItems = await getItemsByStatus('processing');
      for (const item of stuckItems) {
        const adjusted = { ...item, retryCount: Math.max(0, (item.retryCount ?? 0) - 1) };
        await updateItemEnrichment(adjusted.id, 'failed');
        callbackRef.current(adjusted.id);
      }

      const failedItems = await getItemsByStatus('failed');
      const retryable = failedItems.filter((i) => (i.retryCount ?? 0) < MAX_RETRIES);

      if (retryable.length === 0) return;
      setRetryState((s) => ({ ...s, inFlight: retryable.length }));

      for (const item of retryable) {
        const delayMs = Math.pow(2, (item.retryCount ?? 0)) * 1000;
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
        const ok = await enrichItem(item.id, item.url);
        callbackRef.current(item.id);
        if (ok) {
          hapticNotification('success');
          setRetryState((s) => ({ ...s, inFlight: Math.max(0, s.inFlight - 1), succeeded: s.succeeded + 1 }));
        } else {
          setRetryState((s) => ({ ...s, inFlight: Math.max(0, s.inFlight - 1), failed: s.failed + 1 }));
        }
      }
    }

    runRetries();
  }, []);

  const retryItem = useCallback(async (id: string, url: string) => {
    await updateItemEnrichment(id, 'processing');
    callbackRef.current(id);
    const ok = await enrichItem(id, url);
    if (ok) hapticNotification('success');
    callbackRef.current(id);
  }, []);

  return { retryItem, retryState };
}
