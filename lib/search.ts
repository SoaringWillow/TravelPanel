import { SavedItem } from './types';

export interface SearchResult {
  item: SavedItem;
  score: number;
  matchedField: 'title' | 'location' | 'tag' | 'substance' | 'description';
  matchedText: string;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function scoreMatch(haystack: string, needle: string): number {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!h || !n) return 0;
  if (h === n) return 10;
  if (h.startsWith(n)) return 8;
  if (h.includes(n)) return 5;
  // Fuzzy: check if all characters of needle appear in order
  let j = 0;
  for (let i = 0; i < h.length && j < n.length; i++) {
    if (h[i] === n[j]) j++;
  }
  if (j === n.length) return 2;
  return 0;
}

export function searchItems(query: string, items: SavedItem[]): SearchResult[] {
  const q = normalize(query);
  if (!q || q.length < 2) return [];

  const results: SearchResult[] = [];

  for (const item of items) {
    if (item.enrichmentStatus === 'pending') continue;

    let bestScore = 0;
    let bestField: SearchResult['matchedField'] = 'title';
    let bestText = '';

    // Title (highest weight)
    const titleScore = scoreMatch(item.title, q) * 4;
    if (titleScore > bestScore) {
      bestScore = titleScore;
      bestField = 'title';
      bestText = item.title;
    }

    // Location names
    for (const loc of item.locations ?? []) {
      const s = scoreMatch(loc.name, q) * 3;
      if (s > bestScore) {
        bestScore = s;
        bestField = 'location';
        bestText = loc.name;
      }
    }

    // Tags
    for (const tag of item.tags ?? []) {
      const s = scoreMatch(tag, q) * 2;
      if (s > bestScore) {
        bestScore = s;
        bestField = 'tag';
        bestText = `#${tag}`;
      }
    }

    // Substance
    for (const sub of item.substance ?? []) {
      const s = scoreMatch(sub.content, q);
      if (s > bestScore) {
        bestScore = s;
        bestField = 'substance';
        bestText = sub.content.slice(0, 100);
      }
    }

    // Description
    if (item.description) {
      const s = scoreMatch(item.description, q);
      if (s > bestScore) {
        bestScore = s;
        bestField = 'description';
        bestText = item.description.slice(0, 100);
      }
    }

    if (bestScore > 0) {
      results.push({ item, score: bestScore, matchedField: bestField, matchedText: bestText });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  const idx = normalize(text).indexOf(normalize(query));
  if (idx === -1) return text;
  return text.slice(0, idx) + '**' + text.slice(idx, idx + query.length) + '**' + text.slice(idx + query.length);
}
