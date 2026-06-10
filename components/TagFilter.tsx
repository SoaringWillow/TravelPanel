'use client';

import { useMemo } from 'react';
import { SavedItem } from '@/lib/types';

// Tag emoji map (reuses pattern from MapView)
const TAG_EMOJI: Record<string, string> = {
  beach: '🏖', mountain: '🏔', food: '🍜', photography: '📸',
  culture: '🏛', history: '🏛', nature: '🌿', shopping: '🛍',
  art: '🎨', nightlife: '🌃', adventure: '🧗', city: '🏙',
  relaxation: '🧘', architecture: '🏗', rural: '🌾',
};

interface TagFilterProps {
  items: SavedItem[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export default function TagFilter({ items, activeTag, onTagChange }: TagFilterProps) {
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        const t = tag.toLowerCase().trim();
        if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [items]);

  if (topTags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2" role="group" aria-label="Filter by tag">
      {/* All pill */}
      <button
        type="button"
        onClick={() => onTagChange(null)}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
          activeTag === null
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
        }`}
        aria-pressed={activeTag === null}
      >
        All
      </button>

      {topTags.map(([tag, count]) => {
        const emoji = TAG_EMOJI[tag] ?? '';
        const isActive = activeTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onTagChange(isActive ? null : tag)}
            className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
            aria-pressed={isActive}
            aria-label={`Filter by ${tag}: ${count} clips`}
          >
            {emoji && <span aria-hidden="true">{emoji}</span>}
            {tag} {count}
          </button>
        );
      })}
    </div>
  );
}
