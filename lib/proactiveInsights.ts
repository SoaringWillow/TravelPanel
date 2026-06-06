'use client';

import { SavedItem, Board } from './types';

export interface ProactiveInsight {
  id: string;
  type: 'cluster' | 'stale' | 'seasonal' | 'unorganised';
  emoji: string;
  title: string;
  body: string;
  actionLabel: string;
  actionHref?: string;
  actionBoardId?: string;
}

// Season → tags that are especially relevant in that season
const SEASONAL_TAGS: Record<number, { tags: string[]; label: string; emoji: string }> = {
  0:  { tags: ['ski', 'mountain', 'winter', 'nature'],       label: 'January escapes',      emoji: '⛷️' },
  1:  { tags: ['ski', 'mountain', 'cherry', 'flower'],        label: 'February getaways',    emoji: '🌸' },
  2:  { tags: ['beach', 'nature', 'cherry', 'culture'],       label: 'Spring travel',        emoji: '🌷' },
  3:  { tags: ['cherry', 'culture', 'city', 'architecture'],  label: 'Cherry blossom season', emoji: '🌸' },
  4:  { tags: ['beach', 'nature', 'adventure', 'mountain'],   label: 'Summer prep',          emoji: '🏖️' },
  5:  { tags: ['beach', 'culture', 'food', 'city'],           label: 'June adventures',      emoji: '☀️' },
  6:  { tags: ['beach', 'adventure', 'nature'],               label: 'Peak summer',          emoji: '🌊' },
  7:  { tags: ['beach', 'adventure', 'nature', 'food'],       label: 'August sun',           emoji: '🏄' },
  8:  { tags: ['culture', 'history', 'city', 'food'],         label: 'Autumn travel',        emoji: '🍂' },
  9:  { tags: ['mountain', 'nature', 'foliage', 'history'],   label: 'Fall foliage season',  emoji: '🍁' },
  10: { tags: ['city', 'shopping', 'culture', 'nightlife'],   label: 'November city breaks', emoji: '🌆' },
  11: { tags: ['mountain', 'ski', 'shopping', 'culture'],     label: 'Christmas getaways',   emoji: '🎄' },
};

const MS_DAY = 86_400_000;

export function computeInsights(
  items: SavedItem[],
  boards: Board[],
): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const now = Date.now();
  const month = new Date().getMonth();

  const inboxItems = items.filter((i) => !i.boardId && !i.isDemo && i.enrichmentStatus === 'done');
  const allReal = items.filter((i) => !i.isDemo);

  // ── 1. Location cluster: 3+ inbox items sharing a location name keyword ──
  if (inboxItems.length >= 3) {
    const locationFreq = new Map<string, { count: number; items: SavedItem[] }>();
    for (const item of inboxItems) {
      for (const loc of item.locations) {
        // Extract country/city keyword (first word of location name)
        const key = loc.name.split(',')[0].split(' ')[0].toLowerCase();
        if (key.length < 3) continue;
        if (!locationFreq.has(key)) locationFreq.set(key, { count: 0, items: [] });
        const entry = locationFreq.get(key)!;
        if (!entry.items.find((i) => i.id === item.id)) {
          entry.count++;
          entry.items.push(item);
        }
      }
    }
    const biggest = Array.from(locationFreq.entries())
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)[0];

    if (biggest) {
      const [keyword, { count }] = biggest;
      const label = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      insights.push({
        id: `cluster-${keyword}`,
        type: 'cluster',
        emoji: '🗺️',
        title: `${count} ${label} clips waiting`,
        body: `You've saved ${count} places in ${label} — ready to turn them into a trip plan?`,
        actionLabel: 'Make a plan',
        actionHref: '/boards',
      });
    }
  }

  // ── 2. Unorganised clips: 5+ inbox items saved over multiple days ──
  if (inboxItems.length >= 5) {
    const oldestMs = Math.min(...inboxItems.map((i) => i.savedAt));
    const spanDays = (now - oldestMs) / MS_DAY;
    if (spanDays >= 3) {
      insights.push({
        id: 'unorganised',
        type: 'unorganised',
        emoji: '📥',
        title: `${inboxItems.length} clips need a home`,
        body: `You've been saving inspiration for ${Math.round(spanDays)} days. Organise into boards to plan your trips.`,
        actionLabel: 'Organise now',
        actionHref: '/inbox',
      });
    }
  }

  // ── 3. Seasonal: resurface clips matching this month's season tags ──
  const season = SEASONAL_TAGS[month];
  if (season && allReal.length >= 3) {
    const matching = allReal.filter((item) =>
      item.tags.some((t) => season.tags.includes(t.toLowerCase())),
    );
    if (matching.length >= 2) {
      insights.push({
        id: `seasonal-${month}`,
        type: 'seasonal',
        emoji: season.emoji,
        title: `${season.label} ideas`,
        body: `You have ${matching.length} saved clip${matching.length !== 1 ? 's' : ''} perfect for this time of year.`,
        actionLabel: 'View clips',
        actionHref: '/inbox',
      });
    }
  }

  // ── 4. Stale board: board with clips but no trip plan generated, > 14 days ──
  const boardsWithNoTrip = boards.filter((b) => {
    if (b.isDemo || b.itemIds.length < 3) return false;
    const ageMs = now - b.updatedAt;
    return ageMs > 14 * MS_DAY;
  });
  if (boardsWithNoTrip.length > 0) {
    const b = boardsWithNoTrip[0];
    const ageDays = Math.round((now - b.updatedAt) / MS_DAY);
    insights.push({
      id: `stale-${b.id}`,
      type: 'stale',
      emoji: b.emoji,
      title: `${b.name} is waiting`,
      body: `You haven't touched this board in ${ageDays} days. Generate a trip plan to bring it to life.`,
      actionLabel: 'Plan this trip',
      actionHref: `/plan/${b.id}`,
      actionBoardId: b.id,
    });
  }

  // Return top 2 insights max (avoid overwhelming)
  return insights.slice(0, 2);
}
