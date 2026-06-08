import { SavedItem } from './types';

// ─── Keyword search ───────────────────────────────────────────────────────────

// Lightweight client-side full-text search across the fields that matter:
// title, description, tags, location names, activities, and — crucially —
// substance content (the wisdom layer).
export function searchItems(items: SavedItem[], query: string): SavedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  // Multi-term AND matching: "tokyo cafe" matches items with both terms.
  const terms = q.split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    const haystack = buildHaystack(item);
    return terms.every((t) => haystack.includes(t));
  });
}

// ─── Vibe search (semantic expansion) ────────────────────────────────────────

// Scores items by how many expanded terms appear in the haystack.
// Items with no matches are excluded; results are sorted by score descending.
// expandedTerms is returned by the /api/search expansion endpoint.
export function vibeSearchItems(
  items: SavedItem[],
  expandedTerms: string[],
): SavedItem[] {
  if (expandedTerms.length === 0) return items;

  const lower = expandedTerms.map((t) => t.toLowerCase());

  const scored = items.map((item) => {
    const haystack = buildHaystack(item);
    const score = lower.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
    return { item, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// ─── Shared haystack builder ──────────────────────────────────────────────────

export function buildHaystack(item: SavedItem): string {
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
