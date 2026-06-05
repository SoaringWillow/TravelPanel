'use client';

import { useMemo } from 'react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';

interface TimelineViewProps {
  items: SavedItem[];
  onItemClick: (item: SavedItem) => void;
}

interface MonthGroup {
  label: string;       // e.g. "June 2025"
  key: string;         // e.g. "2025-06"
  items: SavedItem[];
}

function groupByMonth(items: SavedItem[]): MonthGroup[] {
  const sorted = [...items].sort((a, b) => a.savedAt - b.savedAt);
  const map = new Map<string, SavedItem[]>();
  for (const item of sorted) {
    const d = new Date(item.savedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([key, its]) => ({
    key,
    label: new Date(its[0].savedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    items: its,
  }));
}

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TimelineView({ items, onItemClick }: TimelineViewProps) {
  const groups = useMemo(() => groupByMonth(items), [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-base font-semibold text-gray-700">No clips yet</p>
        <p className="text-sm text-gray-400 mt-1">Your timeline will appear here as you save travel inspiration.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-8">
      {groups.map((group, gi) => (
        <div key={group.key}>
          {/* Month header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wide">{group.label}</h3>
            <div className="flex-1 h-px bg-indigo-100" />
            <span className="text-xs text-gray-400 font-medium">{group.items.length} clip{group.items.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Timeline entries */}
          <div className="relative ml-1">
            {/* Connecting line */}
            {gi < groups.length - 1 && (
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" style={{ left: -7 }} />
            )}

            <div className="space-y-3">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="w-full text-left"
                >
                  <div className="flex gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 hover:shadow-md hover:border-indigo-200 active:scale-[0.98] transition-all">
                    {/* Thumbnail */}
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${PLATFORM_COLORS[item.platform]}22` }}
                      >
                        {item.platform === 'xiaohongshu' ? '📕'
                          : item.platform === 'wechat' ? '💬'
                          : item.platform === 'bilibili' ? '▶️'
                          : '✈️'}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug flex-1">
                          {item.title}
                        </p>
                        {/* Platform badge */}
                        <span
                          className="flex-shrink-0 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
                          style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                        >
                          {PLATFORM_LABELS[item.platform]}
                        </span>
                      </div>

                      {/* Locations */}
                      {item.locations.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                          <span>📍</span>
                          <span className="truncate">{item.locations.map((l) => l.name).join(' · ')}</span>
                        </p>
                      )}

                      {/* Footer: date + substance count */}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-gray-400">{formatDay(item.savedAt)}</span>
                        <div className="flex gap-1.5">
                          {item.locations.length > 0 && (
                            <span className="text-[11px] bg-orange-50 text-orange-600 font-medium px-1.5 py-0.5 rounded-full">
                              {item.locations.length} pin{item.locations.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {item.substance && item.substance.length > 0 && (
                            <span className="text-[11px] bg-purple-50 text-purple-600 font-medium px-1.5 py-0.5 rounded-full">
                              {item.substance.length} tip{item.substance.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
