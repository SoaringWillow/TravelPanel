'use client';
import { useState, useEffect, useCallback } from 'react';
import { SavedItem } from '@/lib/types';
import { getAllItems, saveItem, deleteItem, getItemById } from '@/lib/db';

export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllItems().then((fetchedItems) => {
      setItems(fetchedItems.sort((a, b) => b.savedAt - a.savedAt));
      setLoading(false);
    });
  }, []);

  const addItem = useCallback(async (item: SavedItem) => {
    await saveItem(item);
    setItems((prev) => [item, ...prev]);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    // Optimistic: remove from state immediately, restore on failure
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteItem(id);
    } catch {
      // Restore the item on failure
      const restored = await getItemById(id);
      if (restored) {
        setItems((prev) => [restored, ...prev].sort((a, b) => b.savedAt - a.savedAt));
      }
    }
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
