import { SavedItem } from './types';

// ─── Vibe token expansion ─────────────────────────────────────────────────────
// Maps common intent words to related tags/terms so users can search by feel.

const VIBE_MAP: Record<string, string[]> = {
  cheap:        ['budget', 'affordable', 'free', 'bargain'],
  affordable:   ['budget', 'cheap', 'inexpensive', 'value'],
  romantic:     ['relaxation', 'cozy', 'sunset', 'intimate', 'couple'],
  foodie:       ['food', 'restaurant', 'cuisine', 'eat', 'dining', 'street food'],
  instagrammable: ['photography', 'scenic', 'beautiful', 'viewpoint', 'view'],
  hidden:       ['hidden gem', 'local', 'authentic', 'secret', 'off-beaten'],
  authentic:    ['local', 'traditional', 'hidden', 'cultural'],
  family:       ['kids', 'children', 'family-friendly', 'safe'],
  luxury:       ['upscale', 'premium', 'exclusive', 'boutique'],
  outdoor:      ['nature', 'hiking', 'adventure', 'park', 'mountain', 'beach'],
  cultural:     ['culture', 'history', 'museum', 'temple', 'architecture', 'art'],
  relaxing:     ['relaxation', 'spa', 'peaceful', 'quiet', 'retreat'],
  shopping:     ['market', 'mall', 'boutique', 'souvenir'],
  nightlife:    ['bar', 'club', 'party', 'night', 'drink'],
};

function expandVibeTerms(q: string): string {
  const words = q.split(/\s+/);
  const expanded = new Set(words);
  for (const word of words) {
    const extras = VIBE_MAP[word];
    if (extras) extras.forEach((e) => expanded.add(e));
  }
  return [...expanded].join(' ');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  item: SavedItem;
  score: number;
  snippet?: string;
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

function scoreItem(item: SavedItem, terms: string[]): { score: number; snippet?: string } {
  let score = 0;
  let snippet: string | undefined;

  // Must match ALL terms (AND logic) — we check this after scoring
  const baseText = [item.title, item.description, ...item.tags, ...item.locations.map((l) => l.name), ...item.activities, item.notes ?? '']
    .join(' ')
    .toLowerCase();

  for (const term of terms) {
    if (baseText.includes(term)) score += 1;
  }

  // Substance gets double weight — it's the wisdom moat
  for (const s of item.substance ?? []) {
    const substanceText = `${s.content} ${s.applies_to ?? ''}`.toLowerCase();
    for (const term of terms) {
      if (substanceText.includes(term)) {
        score += 2;
        if (!snippet && substanceText.includes(term)) {
          snippet = s.content.length > 100 ? s.content.slice(0, 97) + '…' : s.content;
        }
      }
    }
  }

  return { score, snippet };
}

function allTermsMatch(item: SavedItem, terms: string[]): boolean {
  const fullHaystack = [
    item.title,
    item.description,
    ...item.tags,
    ...item.locations.map((l) => `${l.name} ${l.address ?? ''}`),
    ...item.activities,
    ...(item.substance ?? []).map((s) => `${s.content} ${s.applies_to ?? ''}`),
    item.notes ?? '',
  ].join(' ').toLowerCase();

  return terms.every((t) => fullHaystack.includes(t));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function searchItemsScored(items: SavedItem[], query: string): SearchResult[] {
  const q = expandVibeTerms(query.trim().toLowerCase());
  if (!q) return items.map((item) => ({ item, score: 0 }));

  const terms = q.split(/\s+/).filter(Boolean);
  // Use original terms for AND-match gate (not expanded), then score with expanded
  const originalTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return items
    .filter((item) => allTermsMatch(item, originalTerms))
    .map((item) => {
      const { score, snippet } = scoreItem(item, terms);
      return { item, score, snippet };
    })
    .sort((a, b) => b.score - a.score);
}

// Backward-compat wrapper used by boards detail page etc.
export function searchItems(items: SavedItem[], query: string): SavedItem[] {
  return searchItemsScored(items, query).map((r) => r.item);
}
