'use client';

import { useMemo } from 'react';
import { SavedItem } from '@/lib/types';

interface TagFilterBarProps {
  items: SavedItem[];
  activeTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

const MAX_TAGS = 15;

export default function TagFilterBar({ items, activeTag, onTagSelect }: TagFilterBarProps) {
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const sortedTags = useMemo(
    () =>
      [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TAGS)
        .map(([tag, count]) => ({ tag, count })),
    [tagCounts]
  );

  if (sortedTags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
      {sortedTags.map(({ tag, count }) => {
        const isActive = activeTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onTagSelect(isActive ? null : tag)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            #{tag} ({count})
          </button>
        );
      })}
    </div>
  );
}
