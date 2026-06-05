import { SavedItem } from './types';

export type DateRangeFilter = 'all' | 'week' | 'month';

export interface SearchFilters {
  dateRange?: DateRangeFilter;
  hasLocations?: boolean;
  hasWisdom?: boolean;
  tags?: string[];
}

export function searchItems(items: SavedItem[], query: string, filters?: SearchFilters): SavedItem[] {
  let result = items;

  const q = query.trim().toLowerCase();
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    result = result.filter((item) => {
      const haystack = buildHaystack(item);
      return terms.every((t) => haystack.includes(t));
    });
  }

  if (filters?.dateRange && filters.dateRange !== 'all') {
    const now = Date.now();
    const cutoff = filters.dateRange === 'week' ? now - 7 * 86_400_000 : now - 30 * 86_400_000;
    result = result.filter((item) => item.savedAt >= cutoff);
  }

  if (filters?.hasLocations) {
    result = result.filter((item) => item.locations.length > 0);
  }

  if (filters?.hasWisdom) {
    result = result.filter((item) => (item.substance?.length ?? 0) > 0);
  }

  if (filters?.tags && filters.tags.length > 0) {
    result = result.filter((item) =>
      filters.tags!.every((tag) => item.tags.includes(tag))
    );
  }

  return result;
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
