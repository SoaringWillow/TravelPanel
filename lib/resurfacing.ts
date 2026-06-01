'use client';

import { SavedItem } from './types';

// Seasonal context — maps month (0-indexed) to travel themes
const SEASONAL_THEMES: Record<number, { label: string; tags: string[] }> = {
  0:  { label: 'Winter',       tags: ['winter', 'ski', 'snow', 'cozy', 'indoor', 'hot spring', 'onsen', 'christmas'] },
  1:  { label: 'Late Winter',  tags: ['winter', 'ski', 'carnival', 'festival'] },
  2:  { label: 'Spring',       tags: ['spring', 'cherry blossom', 'sakura', 'flower', 'garden', 'hiking'] },
  3:  { label: 'Spring',       tags: ['spring', 'sakura', 'flower', 'festival', 'park', 'outdoor'] },
  4:  { label: 'Late Spring',  tags: ['spring', 'beach', 'outdoor', 'hiking', 'garden'] },
  5:  { label: 'Early Summer', tags: ['summer', 'beach', 'outdoor', 'festival', 'swim'] },
  6:  { label: 'Summer',       tags: ['summer', 'beach', 'island', 'swim', 'outdoor', 'adventure'] },
  7:  { label: 'Summer',       tags: ['summer', 'beach', 'mountain', 'camping', 'festival'] },
  8:  { label: 'Late Summer',  tags: ['summer', 'beach', 'harvest', 'wine', 'outdoor'] },
  9:  { label: 'Autumn',       tags: ['autumn', 'fall', 'foliage', 'leaf', 'harvest', 'wine', 'hiking'] },
  10: { label: 'Autumn',       tags: ['autumn', 'fall', 'foliage', 'mushroom', 'cozy', 'onsen'] },
  11: { label: 'Winter',       tags: ['winter', 'christmas', 'market', 'snow', 'cozy', 'festive'] },
};

function getCurrentSeason(): { label: string; tags: string[] } {
  return SEASONAL_THEMES[new Date().getMonth()];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface ResurfacedClip {
  item: SavedItem;
  reason: string;      // "Why now" explanation
  category: 'seasonal' | 'forgotten' | 'unplanned' | 'nearby';
}

// Return up to `limit` clips worth resurfacing, with a reason for each.
export function getResurfacedClips(items: SavedItem[], limit = 3): ResurfacedClip[] {
  const now = Date.now();
  const season = getCurrentSeason();
  const results: ResurfacedClip[] = [];
  const used = new Set<string>();

  function add(item: SavedItem, reason: string, category: ResurfacedClip['category']) {
    if (used.has(item.id) || results.length >= limit) return;
    used.add(item.id);
    results.push({ item, reason, category });
  }

  // 1. Seasonal matches — items whose tags/substance match the current season
  const seasonalItems = items.filter((item) => {
    const haystack = [
      ...item.tags,
      item.title,
      item.description,
      ...(item.substance ?? []).map((s) => s.content),
    ].join(' ').toLowerCase();
    return season.tags.some((tag) => haystack.includes(tag));
  });

  for (const item of seasonalItems.slice(0, 2)) {
    add(item, `${season.label} pick — perfect timing for this destination`, 'seasonal');
  }

  // 2. Saved long ago and not yet planned (no boardId or items with no trip)
  const oldUnplanned = items
    .filter((i) => !i.isDemo && now - i.savedAt > 14 * 24 * 60 * 60 * 1000)
    .sort((a, b) => a.savedAt - b.savedAt);

  for (const item of oldUnplanned.slice(0, 2)) {
    const weeks = Math.round((now - item.savedAt) / (7 * 24 * 60 * 60 * 1000));
    add(item, `Saved ${weeks} week${weeks !== 1 ? 's' : ''} ago — still on your bucket list?`, 'forgotten');
  }

  // 3. Enriched but substance-rich clips that haven't been "noticed" yet
  const richUnseen = items.filter(
    (i) => !i.isDemo && (i.substance?.length ?? 0) >= 3
  );
  const shuffled = [...richUnseen].sort(() => Math.random() - 0.5);
  for (const item of shuffled.slice(0, 1)) {
    add(item, `${item.substance?.length} insights waiting to be read`, 'unplanned');
  }

  return results;
}
