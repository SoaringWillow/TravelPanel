'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SavedItem } from '@/lib/types';
import { getAllItems, saveItem, deleteItem, getItemById } from '@/lib/db';

const POLL_INTERVAL_MS = 3000;

export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    const fetched = await getAllItems();
    const sorted = fetched.sort((a, b) => b.savedAt - a.savedAt);
    setItems(sorted);
    setLoading(false);
    return sorted;
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const sorted = await load();
      if (cancelled) return;
      // Start polling while any item is processing/pending
      const hasActive = sorted.some((i) => i.enrichmentStatus === 'processing' || i.enrichmentStatus === 'pending');
      if (hasActive && !pollRef.current) {
        pollRef.current = setInterval(async () => {
          const refreshed = await load();
          const stillActive = refreshed.some((i) => i.enrichmentStatus === 'processing' || i.enrichmentStatus === 'pending');
          if (!stillActive && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }, POLL_INTERVAL_MS);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, []);

  const addItem = useCallback(async (item: SavedItem) => {
    await saveItem(item);
    setItems((prev) => [item, ...prev]);
    // Start polling if item is pending/processing and no poll running
    if ((item.enrichmentStatus === 'pending' || item.enrichmentStatus === 'processing') && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const refreshed = await load();
        const stillActive = refreshed.some((i) => i.enrichmentStatus === 'processing' || i.enrichmentStatus === 'pending');
        if (!stillActive && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }, POLL_INTERVAL_MS);
    }
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // Re-reads a single item from DB and patches React state — used by retry queue
  const refreshItem = useCallback(async (id: string) => {
    const updated = await getItemById(id);
    if (!updated) return;
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, []);

  // Re-read all items from DB — used after bulk operations
  const refresh = useCallback(async () => {
    const fetchedItems = await getAllItems();
    setItems(fetchedItems.sort((a, b) => b.savedAt - a.savedAt));
  }, []);

  return { items, loading, addItem, removeItem, refreshItem, refresh };
}
