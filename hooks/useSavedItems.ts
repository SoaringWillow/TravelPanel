'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SavedItem } from '@/lib/types';
import { getAllItems, saveItem, deleteItem, getItemById } from '@/lib/db';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(['done', 'failed']);

export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsRef = useRef<SavedItem[]>([]);

  useEffect(() => {
    getAllItems().then((fetchedItems) => {
      const sorted = fetchedItems.sort((a, b) => b.savedAt - a.savedAt);
      itemsRef.current = sorted;
      setItems(sorted);
      setLoading(false);
    });
  }, []);

  // Poll IDB while any item is in a non-terminal state, to pick up
  // background enrichment updates (keepalive fetch from the share page).
  useEffect(() => {
    const poll = async () => {
      const hasPending = itemsRef.current.some(
        (i) => !TERMINAL_STATUSES.has(i.enrichmentStatus),
      );
      if (!hasPending) return;

      const fresh = await getAllItems();
      const sorted = fresh.sort((a, b) => b.savedAt - a.savedAt);
      itemsRef.current = sorted;
      setItems(sorted);
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const addItem = useCallback(async (item: SavedItem) => {
    await saveItem(item);
    setItems((prev) => {
      const next = [item, ...prev];
      itemsRef.current = next;
      return next;
    });
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await deleteItem(id);
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      itemsRef.current = next;
      return next;
    });
  }, []);

  // Re-reads a single item from DB and patches React state — used by retry queue
  const refreshItem = useCallback(async (id: string) => {
    const updated = await getItemById(id);
    if (!updated) return;
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? updated : i));
      itemsRef.current = next;
      return next;
    });
  }, []);

  // Re-read all items from DB — used after bulk operations
  const refresh = useCallback(async () => {
    const fresh = await getAllItems();
    const sorted = fresh.sort((a, b) => b.savedAt - a.savedAt);
    itemsRef.current = sorted;
    setItems(sorted);
  }, []);

  return { items, loading, addItem, removeItem, refreshItem, refresh };
}
