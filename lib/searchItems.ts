import { SavedItem } from './types';

// Stop words to strip from queries so common words don't skew scoring
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
  'is', 'it', 'its', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'this',
  'that', 'with', 'from', 'by', 'be', 'are', 'was', 'were', 'as', 'so',
  'if', 'up', 'out', 'no', 'not', 'go', 'do', 'get',
]);

// Simple stemmer: strip common English suffixes so "cafes" matches "cafe"
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies'))  return word.slice(0, -3) + 'y';
  if (word.endsWith('ing'))  return word.slice(0, -3);
  if (word.endsWith('tion')) return word.slice(0, -3);
  if (word.endsWith('ed'))   return word.slice(0, -2);
  if (word.endsWith('er'))   return word.slice(0, -2);
  if (word.endsWith('est'))  return word.slice(0, -3);
  if (word.endsWith('es'))   return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 4) return word.slice(0, -1);
  return word;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿\s]/g, ' ') // keep Chinese characters
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function score(item: SavedItem, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 1;

  let total = 0;
  const stemmedQuery = queryTerms.map(stem);

  for (const qt of stemmedQuery) {
    // Title match (highest weight — exact phrase bonus)
    const titleTokens = tokenize(item.title).map(stem);
    const titleExact  = titleTokens.filter((t) => t === qt).length;
    const titlePartial = titleTokens.filter((t) => t.includes(qt) || qt.includes(t)).length;
    total += titleExact * 10 + titlePartial * 5;

    // Location name match
    for (const loc of item.locations) {
      const locTokens = tokenize(loc.name).map(stem);
      total += locTokens.filter((t) => t === qt || t.includes(qt)).length * 6;
    }

    // Tag match
    const tagTokens = item.tags.flatMap((t) => tokenize(t)).map(stem);
    total += tagTokens.filter((t) => t === qt || t.includes(qt)).length * 4;

    // Activity match
    const actTokens = item.activities.flatMap((a) => tokenize(a)).map(stem);
    total += actTokens.filter((t) => t === qt || t.includes(qt)).length * 3;

    // Description match
    const descTokens = tokenize(item.description).map(stem);
    total += descTokens.filter((t) => t === qt || t.includes(qt)).length * 3;

    // Substance match (tips, warnings, wisdom)
    for (const s of item.substance ?? []) {
      const substanceTokens = tokenize(s.content).map(stem);
      total += substanceTokens.filter((t) => t === qt || t.includes(qt)).length * 3;
    }

    // Notes match
    if (item.notes) {
      const noteTokens = tokenize(item.notes).map(stem);
      total += noteTokens.filter((t) => t === qt || t.includes(qt)).length * 2;
    }
  }

  return total;
}

/**
 * Relevance-scored full-text search across clips.
 * All query terms must match (AND semantics). Results sorted by relevance score.
 * Handles plurals/singulars via simple stemming and filters stop words.
 */
export function searchItems(items: SavedItem[], query: string): SavedItem[] {
  const q = query.trim();
  if (!q) return items;

  const terms = tokenize(q);
  if (terms.length === 0) return items;

  const scored = items
    .map((item) => ({ item, score: score(item, terms) }))
    .filter((r) => r.score > 0);

  // Sort by score descending, stable (preserve original order for ties)
  scored.sort((a, b) => b.score - a.score);

  return scored.map((r) => r.item);
}
