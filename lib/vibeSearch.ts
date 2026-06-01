'use client';

import { SavedItem } from './types';
import { searchItems } from './searchItems';

// Cache expansions so repeated searches don't re-call the API
const expansionCache = new Map<string, { terms: string[]; mood: string }>();

async function expandQuery(query: string, signal?: AbortSignal): Promise<{ terms: string[]; mood: string }> {
  const key = query.toLowerCase().trim();
  if (expansionCache.has(key)) return expansionCache.get(key)!;

  try {
    const timeoutSignal = AbortSignal.timeout(5000);
    const combined = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
    const res = await fetch(`/api/search?q=${encodeURIComponent(key)}`, { signal: combined });
    if (!res.ok) throw new Error('non-200');
    const data = await res.json();
    const result = { terms: data.terms ?? [], mood: data.mood ?? '' };
    expansionCache.set(key, result);
    return result;
  } catch {
    return { terms: [], mood: '' };
  }
}

// Score a single item against an expanded term set using BM25-inspired scoring.
// Returns 0 if no terms match (used to filter out irrelevant results).
function scoreItem(item: SavedItem, terms: string[]): number {
  if (terms.length === 0) return 0;

  const haystack = [
    item.title,
    item.description,
    ...item.tags,
    ...item.locations.map((l) => `${l.name} ${l.address ?? ''}`),
    ...item.activities,
    ...(item.substance ?? []).map((s) => `${s.content} ${s.applies_to ?? ''}`),
    item.notes ?? '',
  ].join(' ').toLowerCase();

  let score = 0;
  let matches = 0;

  for (const term of terms) {
    // Count occurrences (frequency boost)
    let idx = 0;
    let count = 0;
    while ((idx = haystack.indexOf(term, idx)) !== -1) {
      count++;
      idx += term.length;
    }
    if (count > 0) {
      matches++;
      // Boost title/tag hits (appear early in haystack)
      const isProminent = item.title.toLowerCase().includes(term) || item.tags.some((t) => t.toLowerCase().includes(term));
      score += count * (isProminent ? 3 : 1);
    }
  }

  // Require at least 1 match; return 0 so caller can filter out
  return matches === 0 ? 0 : score + matches * 2;
}

export interface VibeSearchResult {
  items: SavedItem[];
  mood: string;
  isVibeSearch: boolean;
}

// Main entry point. Runs Claude query expansion then BM25 scoring.
// Falls back silently to exact keyword search on any error.
export async function vibeSearch(items: SavedItem[], query: string, signal?: AbortSignal): Promise<VibeSearchResult> {
  const trimmed = query.trim();

  if (!trimmed) {
    return { items, mood: '', isVibeSearch: false };
  }

  // Always do keyword search first (instant)
  const keywordResults = searchItems(items, trimmed);

  // Short queries (1-2 chars) skip expansion
  if (trimmed.length < 3) {
    return { items: keywordResults, mood: '', isVibeSearch: false };
  }

  const { terms, mood } = await expandQuery(trimmed, signal);

  if (terms.length === 0) {
    return { items: keywordResults, mood: '', isVibeSearch: false };
  }

  // Score all items (not just keyword matches) against expanded terms
  const allTerms = [
    ...trimmed.toLowerCase().split(/\s+/).filter(Boolean),
    ...terms,
  ];

  const scored = items
    .map((item) => ({ item, score: scoreItem(item, allTerms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  // Use vibe results if they found more/better matches than keyword search
  const results = scored.length >= keywordResults.length ? scored : keywordResults;

  return { items: results, mood, isVibeSearch: true };
}
