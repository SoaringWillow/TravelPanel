import { SavedItem } from './types';

// Lightweight client-side full-text search across the fields that matter:
// title, description, tags, location names, activities, and — crucially —
// substance content (the wisdom layer). Foundation for embedding search in Phase B.
export function searchItems(items: SavedItem[], query: string): SavedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  // Support multi-term AND matching: "tokyo cafe" matches items with both terms.
  const terms = q.split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    const haystack = buildHaystack(item);
    return terms.every((t) => haystack.includes(t));
  });
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
