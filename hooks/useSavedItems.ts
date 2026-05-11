'use client';
import { useState, useEffect, useCallback } from 'react';
import { SavedItem } from '@/lib/types';
import { getAllItems, saveItem, deleteItem } from '@/lib/db';

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
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, addItem, removeItem };
}
