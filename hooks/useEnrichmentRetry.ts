'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getAllItems, getItemsByStatus, updateItemEnrichment } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';

const MAX_RETRIES = 3;
const PENDING_STALE_MS = 60_000; // items pending > 60 s get auto-retried on focus
const FOCUS_RETRY_LIMIT = 3; // max times visibilitychange retry fires per session

// Runs on app load, finds items that failed enrichment, and retries them
// with exponential backoff. Also resets items stuck in 'processing' (app crash).
export function useEnrichmentRetry(onItemUpdated: (id: string) => void) {
  const hasRun = useRef(false);
  const focusRetries = useRef(0);
  const callbackRef = useRef(onItemUpdated);
  useEffect(() => { callbackRef.current = onItemUpdated; });

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function runRetries() {
      const stuckItems = await getItemsByStatus('processing');
      for (const item of stuckItems) {
        const db_item = { ...item, retryCount: Math.max(0, (item.retryCount ?? 0) - 1) };
        await updateItemEnrichment(db_item.id, 'failed');
        callbackRef.current(db_item.id);
      }

      const failedItems = await getItemsByStatus('failed');
      const retryable = failedItems.filter((i) => (i.retryCount ?? 0) < MAX_RETRIES);

      for (const item of retryable) {
        const delay = Math.pow(2, (item.retryCount ?? 0)) * 1000;
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        await enrichItem(item.id, item.url);
        callbackRef.current(item.id);
      }
    }

    runRetries();
  }, []);

  // On app focus: retry items that have been stuck in 'pending' > 60 s
  useEffect(() => {
    async function handleFocus() {
      if (focusRetries.current >= FOCUS_RETRY_LIMIT) return;
      focusRetries.current += 1;
      const now = Date.now();
      const allItems = await getAllItems();
      const stalePending = allItems.filter(
        (i) => i.enrichmentStatus === 'pending' && now - i.savedAt > PENDING_STALE_MS
      );
      for (const item of stalePending) {
        await enrichItem(item.id, item.url);
        callbackRef.current(item.id);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') handleFocus();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const retryItem = useCallback(async (id: string, url: string) => {
    await updateItemEnrichment(id, 'processing');
    callbackRef.current(id);
    await enrichItem(id, url);
    callbackRef.current(id);
  }, []);

  return { retryItem };
}
