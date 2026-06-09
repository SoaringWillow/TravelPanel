'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SavedItem, Location } from '@/lib/types';

// ── Seasonal relevance ────────────────────────────────────────────────────────

const SEASON_KEYWORDS: Record<string, string[]> = {
  winter: ['winter', 'snow', 'ski', 'skiing', 'cold', 'christmas', 'new year', 'cozy', 'hot spring', 'onsen', 'northern lights'],
  spring: ['spring', 'cherry blossom', 'sakura', 'flower', 'bloom', 'festival', 'rainy', 'green', 'garden'],
  summer: ['summer', 'beach', 'tropical', 'heat', 'humid', 'sunshine', 'outdoor', 'swim', 'surf', 'monsoon', 'festival', 'island'],
  autumn: ['autumn', 'fall', 'foliage', 'harvest', 'red leaves', 'koyo', 'apple', 'october', 'november'],
};

const MONTH_LABEL: string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function currentSeason(month: number): string {
  // Northern-hemisphere seasons; month is 0-indexed
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function scoreItem(item: SavedItem, seasonKws: string[]): number {
  const text = [
    item.title,
    item.description,
    ...item.tags,
    ...(item.substance ?? []).map((s) => s.content + (s.applies_to ?? '')),
  ].join(' ').toLowerCase();

  let score = 0;
  for (const kw of seasonKws) {
    if (text.includes(kw)) score++;
  }
  // Boost items with substance (more interesting to resurface)
  score += Math.min((item.substance?.length ?? 0) * 0.3, 2);
  // Boost older items (resurface forgotten ones)
  const ageDays = (Date.now() - item.savedAt) / 86_400_000;
  if (ageDays > 30) score += 0.5;
  if (ageDays > 90) score += 0.5;
  return score;
}

function relativeTime(ts: number): string {
  const days = Math.round((Date.now() - ts) / 86_400_000);
  if (days < 1)   return 'today';
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TodayBannerProps {
  items: SavedItem[];
  onItemClick: (item: SavedItem, location?: Location) => void;
}

export default function TodayBanner({ items, onItemClick }: TodayBannerProps) {
  const { picks, season } = useMemo(() => {
    const month  = new Date().getMonth();
    const season = currentSeason(month);
    const kws    = SEASON_KEYWORDS[season];

    const scored = items
      .filter((item) => item.enrichmentStatus === 'done')
      .map((item) => ({ item, score: scoreItem(item, kws) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ item }) => item);

    // Fallback: show recently saved items if no seasonal match
    if (scored.length === 0) {
      return {
        picks: [...items]
          .filter((i) => i.enrichmentStatus === 'done')
          .sort((a, b) => b.savedAt - a.savedAt)
          .slice(0, 5),
        season,
      };
    }

    return { picks: scored, season };
  }, [items]);

  if (picks.length === 0) return null;

  const seasonEmoji: Record<string, string> = {
    spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️',
  };

  return (
    <div className="px-4 py-3">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base">{seasonEmoji[season]}</span>
        <span className="text-sm font-bold text-gray-800">
          {MONTH_LABEL[new Date().getMonth()]} picks
        </span>
        <span className="ml-auto text-xs text-gray-400">From your saved places</span>
      </div>

      {/* Horizontal scroll of picks */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {picks.map((item) => (
          <PickCard
            key={item.id}
            item={item}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

function PickCard({
  item,
  onItemClick,
}: {
  item: SavedItem;
  onItemClick: (item: SavedItem, location?: Location) => void;
}) {
  const location = item.locations[0];
  const topInsight = item.substance?.find((s) => s.type === 'tip' || s.type === 'wisdom' || s.type === 'recommendation');

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => onItemClick(item, location)}
      className="flex-shrink-0 w-52 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100 text-left"
    >
      {/* Thumbnail */}
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt=""
          className="w-full h-28 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-4xl">
          {location ? '📍' : '🌐'}
        </div>
      )}

      <div className="px-3 pt-2.5 pb-3">
        {/* Age chip */}
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          {relativeTime(item.savedAt)}
        </span>

        <p className="text-xs font-bold text-gray-900 mt-0.5 line-clamp-2 leading-snug">
          {item.title}
        </p>

        {location && (
          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
            📍 {location.name}
          </p>
        )}

        {topInsight && (
          <p className="text-[10px] text-gray-500 mt-1.5 line-clamp-2 leading-snug italic">
            "{topInsight.content}"
          </p>
        )}
      </div>
    </motion.button>
  );
}
