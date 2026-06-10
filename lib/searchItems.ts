import { SavedItem, SubstanceItem } from './types';

export interface SearchOptions {
  byLocation?: boolean;
  bySubstance?: boolean; // search only through substance content
}

// When bySubstance mode is active, return matched substance items alongside the clip
export interface SubstanceSearchResult {
  item: SavedItem;
  matchedSubstance: SubstanceItem[];
}

// Weighted search: title matches rank highest, then description, tags, locations, substance.
// Returns items sorted by relevance score (highest first).
export function searchItems(items: SavedItem[], query: string, opts: SearchOptions = {}): SavedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  const terms = q.split(/\s+/).filter(Boolean);

  const scored: Array<{ item: SavedItem; score: number }> = [];

  for (const item of items) {
    const score = opts.byLocation
      ? scoreLocation(item, terms)
      : opts.bySubstance
      ? scoreSubstanceOnly(item, terms)
      : scoreItem(item, terms);
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

// Returns matched substance items per clip for the bySubstance mode UI
export function searchSubstance(items: SavedItem[], query: string): SubstanceSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const results: SubstanceSearchResult[] = [];
  for (const item of items) {
    const matched = (item.substance ?? []).filter((s) =>
      terms.every((t) => s.content.toLowerCase().includes(t) || (s.applies_to ?? '').toLowerCase().includes(t))
    );
    if (matched.length > 0) results.push({ item, matchedSubstance: matched });
  }
  results.sort((a, b) => b.matchedSubstance.length - a.matchedSubstance.length);
  return results;
}

// Score an item across all fields — title weighs most.
function scoreItem(item: SavedItem, terms: string[]): number {
  const title = item.title.toLowerCase();
  const desc = (item.description ?? '').toLowerCase();
  const tags = item.tags.join(' ').toLowerCase();
  const locations = item.locations.map((l) => `${l.name} ${l.address ?? ''}`).join(' ').toLowerCase();
  const substance = (item.substance ?? []).map((s) => `${s.content} ${s.applies_to ?? ''}`).join(' ').toLowerCase();
  const activities = item.activities.join(' ').toLowerCase();
  const notes = (item.notes ?? '').toLowerCase();

  let total = 0;
  for (const t of terms) {
    const inTitle = title.includes(t) ? 100 : 0;
    const inDesc = desc.includes(t) ? 40 : 0;
    const inTags = tags.includes(t) ? 30 : 0;
    const inLoc = locations.includes(t) ? 25 : 0;
    const inAct = activities.includes(t) ? 20 : 0;
    const inSubstance = substance.includes(t) ? 10 : 0;
    const inNotes = notes.includes(t) ? 8 : 0;

    const termScore = inTitle + inDesc + inTags + inLoc + inAct + inSubstance + inNotes;
    if (termScore === 0) return 0; // AND match: all terms must hit somewhere
    total += termScore;
  }
  return total;
}

// Location-only mode: only match against location names + addresses.
function scoreLocation(item: SavedItem, terms: string[]): number {
  const haystack = item.locations
    .map((l) => `${l.name} ${l.address ?? ''}`)
    .join(' ')
    .toLowerCase();
  if (!haystack.trim()) return 0;
  return terms.every((t) => haystack.includes(t)) ? 50 : 0;
}

// Substance-only mode: match against substance content + applies_to.
function scoreSubstanceOnly(item: SavedItem, terms: string[]): number {
  const subs = item.substance ?? [];
  if (subs.length === 0) return 0;
  let hits = 0;
  for (const sub of subs) {
    const hay = `${sub.content} ${sub.applies_to ?? ''}`.toLowerCase();
    if (terms.every((t) => hay.includes(t))) hits++;
  }
  return hits * 30; // 30 per matching substance item
}
