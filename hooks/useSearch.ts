'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { SavedItem } from '@/lib/types';
import { searchItems } from '@/lib/searchItems';

// Queries with 3+ words are treated as vibe/semantic queries and sent to Claude for expansion.
function isVibeQuery(query: string): boolean {
  return query.trim().split(/\s+/).length >= 3;
}

function buildHaystack(item: SavedItem): string {
  return [
    item.title,
    item.description,
    ...item.tags,
    ...item.locations.map((l) => `${l.name} ${l.address ?? ''}`),
    ...item.activities,
    ...(item.substance ?? []).map((s) => `${s.content} ${s.applies_to ?? ''}`),
    item.notes ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

function scoreItem(item: SavedItem, terms: string[]): number {
  const haystack = buildHaystack(item);
  const title = item.title.toLowerCase();
  return terms.reduce((score, term) => {
    const t = term.toLowerCase();
    if (!haystack.includes(t)) return score;
    const titleBonus = title.includes(t) ? 2 : 0;
    const substanceBonus = (item.substance ?? []).some((s) =>
      s.content.toLowerCase().includes(t)
    )
      ? 1
      : 0;
    return score + 1 + titleBonus + substanceBonus;
  }, 0);
}

export interface UseSearchResult {
  results: SavedItem[];
  isExpanding: boolean;
  isVibeActive: boolean;
  vibeLabel: string;
}

export function useSearch(items: SavedItem[], query: string): UseSearchResult {
  const [expandedTerms, setExpandedTerms] = useState<string[] | null>(null);
  const [vibeLabel, setVibeLabel] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const vibe = isVibeQuery(query);

  useEffect(() => {
    if (!vibe || !query.trim()) {
      setExpandedTerms(null);
      setVibeLabel('');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsExpanding(true);

    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
      signal: abortRef.current.signal,
    })
      .then((r) => r.json())
      .then((data: { terms?: string[]; label?: string }) => {
        setExpandedTerms(data.terms ?? []);
        setVibeLabel(data.label ?? '');
        setIsExpanding(false);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setExpandedTerms([]);
          setIsExpanding(false);
        }
      });

    return () => abortRef.current?.abort();
    // Query is the only dep that should re-trigger; vibe is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const results = useMemo(() => {
    if (!query.trim()) return items;

    if (expandedTerms && expandedTerms.length > 0) {
      const rawTerms = query.trim().toLowerCase().split(/\s+/);
      const allTerms = [...new Set([...rawTerms, ...expandedTerms.map((t) => t.toLowerCase())])];
      return items
        .map((item) => ({ item, score: scoreItem(item, allTerms) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    }

    return searchItems(items, query);
  }, [items, query, expandedTerms]);

  return {
    results,
    isExpanding,
    isVibeActive: vibe && expandedTerms !== null && !isExpanding,
    vibeLabel,
  };
}
