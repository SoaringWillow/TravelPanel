import { SavedItem } from './types';

// ── Keyword filter (instant, AND matching) ────────────────────────────────────

// Lightweight client-side full-text search across the fields that matter:
// title, description, tags, location names, activities, and the substance
// wisdom layer. Foundation for vibe/embedding search added in Phase B.
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

// ── Vibe search (Claude-expanded keywords, ranked results) ────────────────────

export interface VibeQuery {
  keywords: string[];
  tags: string[];
  context?: string;
}

// Scores a single clip against an expanded vibe query.
// Returns 0 if no relevant match; higher = more relevant.
function scoreItem(item: SavedItem, { keywords, tags }: VibeQuery): number {
  let score = 0;
  const kws = keywords.map((k) => k.toLowerCase());
  const tgs = tags.map((t) => t.toLowerCase());

  const titleLower = item.title.toLowerCase();
  const descLower  = item.description.toLowerCase();

  for (const kw of kws) {
    if (titleLower.includes(kw))                 score += 3;
    if (descLower.includes(kw))                  score += 1;
    for (const loc of item.locations) {
      if (loc.name.toLowerCase().includes(kw))   score += 2;
    }
    for (const act of item.activities) {
      if (act.toLowerCase().includes(kw))         score += 2;
    }
    for (const sub of item.substance ?? []) {
      if (sub.content.toLowerCase().includes(kw)) score += 2;
      if (sub.applies_to?.toLowerCase().includes(kw)) score += 1;
    }
    for (const note of [item.notes ?? '']) {
      if (note.toLowerCase().includes(kw))        score += 1;
    }
  }

  for (const tag of tgs) {
    if (item.tags.some((t) => t.toLowerCase() === tag)) score += 5;
  }

  return score;
}

// Returns items sorted by relevance score (highest first), filtering out
// items with score 0. Falls back to all items if nothing matches.
export function rankItems(items: SavedItem[], vibe: VibeQuery): SavedItem[] {
  if (!vibe.keywords.length && !vibe.tags.length) return items;

  const scored = items
    .map((item) => ({ item, score: scoreItem(item, vibe) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored.map(({ item }) => item) : items;
}
