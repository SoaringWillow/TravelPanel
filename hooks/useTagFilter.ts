'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'travelPanelTagFilters';

export function useTagFilter() {
  const [activeTags, setActiveTags] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist to sessionStorage whenever activeTags changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify([...activeTags]));
    } catch { /* ignore */ }
  }, [activeTags]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const clearTags = useCallback(() => setActiveTags(new Set()), []);

  // Returns true if the item matches the current filter (OR logic across tags)
  const itemMatchesFilter = useCallback(
    (itemTags: string[]) => {
      if (activeTags.size === 0) return true;
      return itemTags.some((t) => activeTags.has(t));
    },
    [activeTags],
  );

  return { activeTags, toggleTag, clearTags, itemMatchesFilter };
}
