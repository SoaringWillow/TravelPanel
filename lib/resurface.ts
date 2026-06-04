'use client';

import { SavedItem, Trip } from './types';

// Season keywords to match substance content
const SEASON_KEYWORDS: Record<string, string[]> = {
  winter: ['winter', 'snow', 'christmas', 'new year', 'ski', 'skiing', 'december', 'january', 'february'],
  spring: ['spring', 'cherry blossom', 'sakura', 'bloom', 'flower', 'march', 'april', 'hanami'],
  summer: ['summer', 'beach', 'festival', 'june', 'july', 'august', 'surf', 'monsoon', 'heat'],
  autumn: ['autumn', 'fall', 'foliage', 'leaf', 'harvest', 'october', 'november', 'september'],
};

function currentSeason(): string {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function isSeasonallyRelevant(item: SavedItem, season: string): boolean {
  const keywords = SEASON_KEYWORDS[season] ?? [];
  const text = [
    item.title,
    item.description,
    ...(item.substance ?? []).map((s) => s.content),
    ...item.tags,
  ]
    .join(' ')
    .toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

export interface ResurfaceResult {
  items: SavedItem[];
  reason: string;
  emoji: string;
}

/**
 * Returns a small set of clips worth resurfacing to the user right now,
 * along with a human-readable reason.
 *
 * Priority order:
 * 1. Seasonal match — clips that mention the current season
 * 2. High-substance unplanned clips — rich content never added to a trip
 * 3. Old unsorted clips — saved > 30 days ago but still in Inbox
 */
export function computeResurfaceItems(
  items: SavedItem[],
  trips: Trip[],
  maxItems = 3,
): ResurfaceResult | null {
  const plannedItemIds = new Set(
    trips
      .flatMap((t) => t.plan?.days.flatMap((d) => d.activities.map((a) => a.name)) ?? []),
  );
  const boardedItemIds = new Set(items.filter((i) => i.boardId).map((i) => i.id));
  const season = currentSeason();

  const enriched = items.filter(
    (i) => i.enrichmentStatus === 'done' && !i.isDemo,
  );

  // Strategy 1: Seasonal
  const seasonal = enriched.filter((i) => isSeasonallyRelevant(i, season));
  if (seasonal.length >= 2) {
    const seasonEmoji: Record<string, string> = {
      spring: '🌸', summer: '🏖️', autumn: '🍂', winter: '❄️',
    };
    return {
      items: seasonal.slice(0, maxItems),
      reason: `Perfect for ${season} — saved inspiration you might be ready to plan`,
      emoji: seasonEmoji[season] ?? '🗓️',
    };
  }

  // Strategy 2: High-substance unplanned
  const richUnplanned = enriched
    .filter((i) => (i.substance?.length ?? 0) >= 3 && !boardedItemIds.has(i.id))
    .sort((a, b) => (b.substance?.length ?? 0) - (a.substance?.length ?? 0));

  if (richUnplanned.length >= 2) {
    return {
      items: richUnplanned.slice(0, maxItems),
      reason: 'These clips have detailed tips you haven\'t planned yet',
      emoji: '💡',
    };
  }

  // Strategy 3: Old unsorted clips
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const oldUnsorted = enriched
    .filter((i) => i.savedAt < thirtyDaysAgo && !boardedItemIds.has(i.id))
    .sort((a, b) => b.savedAt - a.savedAt);

  if (oldUnsorted.length >= 2) {
    return {
      items: oldUnsorted.slice(0, maxItems),
      reason: 'Inspiration you saved a while ago — still dreaming of these?',
      emoji: '📦',
    };
  }

  return null;
}
