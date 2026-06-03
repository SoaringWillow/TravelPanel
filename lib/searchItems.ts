import { SavedItem } from './types';

export interface SearchResult {
  item: SavedItem;
  matchField: 'title' | 'substance' | 'description' | 'notes' | 'tag' | 'location';
  matchSnippet: string;
}

export function searchItems(items: SavedItem[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.map((item) => ({ item, matchField: 'title' as const, matchSnippet: '' }));

  const terms = q.split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];

  for (const item of items) {
    const result = matchItem(item, terms);
    if (result) results.push(result);
  }

  return results;
}

function matchItem(item: SavedItem, terms: string[]): SearchResult | null {
  const fields: Array<{ field: SearchResult['matchField']; texts: string[] }> = [
    { field: 'title', texts: [item.title] },
    { field: 'substance', texts: (item.substance ?? []).map((s) => s.content) },
    { field: 'description', texts: item.description ? [item.description] : [] },
    { field: 'notes', texts: item.notes ? [item.notes] : [] },
    { field: 'tag', texts: item.tags },
    { field: 'location', texts: item.locations.map((l) => `${l.name} ${l.address ?? ''}`) },
  ];

  for (const { field, texts } of fields) {
    for (const text of texts) {
      const lower = text.toLowerCase();
      if (terms.every((t) => lower.includes(t))) {
        const idx = lower.indexOf(terms[0]);
        return { item, matchField: field, matchSnippet: extractSnippet(text, idx, 80) };
      }
    }
  }

  // Fallback: terms spread across multiple fields — match exists, return title as context
  const haystack = buildHaystack(item);
  if (terms.every((t) => haystack.includes(t))) {
    return { item, matchField: 'title', matchSnippet: '' };
  }

  return null;
}

function extractSnippet(text: string, matchIdx: number, maxLen: number): string {
  const half = Math.floor(maxLen / 2);
  const start = Math.max(0, matchIdx - half);
  const end = Math.min(text.length, start + maxLen);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet = snippet + '…';
  return snippet;
}

function buildHaystack(item: SavedItem): string {
  const parts: string[] = [
    item.title,
    item.description,
    ...item.tags,
    ...item.locations.map((l) => `${l.name} ${l.address ?? ''}`),
    ...item.activities,
    ...(item.substance ?? []).map((s) => `${s.content} ${s.applies_to ?? ''}`),
    item.notes ?? '',
  ];
  return parts.join(' ').toLowerCase();
}
