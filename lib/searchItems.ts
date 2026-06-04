import { SavedItem } from './types';

// Lightweight client-side full-text search across the fields that matter:
// title, description, tags, location names, activities, and — crucially —
// substance content (the wisdom layer).
export function searchItems(items: SavedItem[], query: string): SavedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  // Multi-term AND matching: "tokyo cafe" matches items containing BOTH terms.
  const terms = q.split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    const haystack = buildHaystack(item);
    return terms.every((t) => haystack.includes(t));
  });
}

/**
 * Vibe/semantic search: ranks items by how many expanded terms they match.
 * Uses OR logic (any match counts) and sorts by match count descending.
 * Call this with terms returned by /api/search for AI-powered "vibe" queries.
 */
export function rankItemsByVibeTerms(items: SavedItem[], terms: string[]): SavedItem[] {
  if (!terms.length) return items;
  const normalised = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);

  const scored = items.map((item) => {
    const haystack = buildHaystack(item);
    const score = normalised.reduce(
      (acc, t) => acc + (haystack.includes(t) ? 1 : 0),
      0,
    );
    return { item, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
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
