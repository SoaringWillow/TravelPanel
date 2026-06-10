'use client';

import { useMemo } from 'react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

interface TripTimelineProps {
  items: SavedItem[];
  onItemClick?: (item: SavedItem) => void;
}

// Group items by calendar month (most-recent-first within each month)
function groupByMonth(items: SavedItem[]): { label: string; items: SavedItem[] }[] {
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const map = new Map<string, SavedItem[]>();

  for (const item of sorted) {
    const d = new Date(item.savedAt);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function TripTimeline({ items, onItemClick }: TripTimelineProps) {
  const groups = useMemo(() => groupByMonth(items), [items]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          {/* Month header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Timeline entries */}
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute top-0 bottom-0 bg-gray-150"
              style={{ left: 19, width: 2, background: '#e5e7eb' }}
            />

            <div className="space-y-4">
              {group.items.map((item) => {
                const tip = item.substance?.find(
                  (s) => s.type === 'tip' || s.type === 'warning' || s.type === 'recommendation',
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onItemClick?.(item)}
                    className="relative w-full flex items-start gap-3 text-left hover:opacity-90 active:opacity-75 transition-opacity"
                  >
                    {/* Timeline dot */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 overflow-hidden"
                      style={{ background: PLATFORM_COLORS[item.platform] }}
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-white text-sm font-bold">
                          {PLATFORM_LABELS[item.platform]?.charAt(0) ?? '📍'}
                        </span>
                      )}
                    </div>

                    {/* Content card */}
                    <div className="flex-1 min-w-0 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                      {/* Date */}
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {dayLabel(item.savedAt)}
                      </p>

                      {/* Title */}
                      <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-1">
                        {item.title}
                      </p>

                      {/* Locations */}
                      {item.locations.length > 0 && (
                        <p className="text-xs text-indigo-600 font-medium mb-1.5 line-clamp-1">
                          📍{' '}
                          {item.locations
                            .slice(0, 3)
                            .map((l) => l.name)
                            .join(' · ')}
                          {item.locations.length > 3 && ` +${item.locations.length - 3}`}
                        </p>
                      )}

                      {/* Platform badge + substance tip */}
                      <div className="flex items-start gap-2">
                        <span
                          className="flex-shrink-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                          style={{ background: PLATFORM_COLORS[item.platform] }}
                        >
                          {PLATFORM_LABELS[item.platform]}
                        </span>

                        {tip && (
                          <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                            {tip.type === 'warning' ? '⚠️ ' : tip.type === 'recommendation' ? '⭐ ' : '💡 '}
                            {tip.content}
                          </p>
                        )}

                        {!tip && item.substance?.length > 0 && (
                          <p className="text-xs text-gray-400 flex-1">
                            {item.substance.length} tip{item.substance.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
