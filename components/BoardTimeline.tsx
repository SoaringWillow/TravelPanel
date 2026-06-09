'use client';

import { useMemo } from 'react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
  });
}

function groupByDay(items: SavedItem[]): { label: string; items: SavedItem[] }[] {
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const groups: Map<string, SavedItem[]> = new Map();

  for (const item of sorted) {
    const label = formatDate(item.savedAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubstanceTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    tip:            '💡',
    warning:        '⚠️',
    opinion:        '💬',
    wisdom:         '🧠',
    context:        '🌍',
    recommendation: '⭐',
  };
  return <span className="text-xs">{icons[type] ?? '•'}</span>;
}

function TimelineCard({ item }: { item: SavedItem }) {
  const color = PLATFORM_COLORS[item.platform];
  const label = PLATFORM_LABELS[item.platform];

  return (
    <div className="flex gap-3">
      {/* Left: thumbnail or platform dot */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-14 h-14 rounded-xl object-cover shadow-sm"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: color + '18' }}
          >
            {item.platform === 'xiaohongshu' ? '📕' :
             item.platform === 'youtube'      ? '▶️' :
             item.platform === 'bilibili'     ? '📺' :
             item.platform === 'douyin'       ? '🎵' : '🌐'}
          </div>
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 pb-4 border-b border-gray-100 last:border-0">
        {/* Platform badge */}
        <span
          className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1.5"
          style={{ backgroundColor: color + '22', color }}
        >
          {label}
        </span>

        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
          {item.title}
        </h3>

        {/* Locations */}
        {item.locations.length > 0 && (
          <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">
            📍 {item.locations.map((l) => l.name).join(' · ')}
          </p>
        )}

        {/* Top substance items */}
        {item.substance && item.substance.length > 0 && (
          <div className="space-y-0.5">
            {item.substance.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-1">
                <SubstanceTypeIcon type={s.type} />
                <p className="text-xs text-gray-600 leading-snug line-clamp-2 flex-1">{s.content}</p>
              </div>
            ))}
            {item.substance.length > 2 && (
              <p className="text-[10px] text-gray-400 pl-4">
                +{item.substance.length - 2} more insight{item.substance.length - 2 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface BoardTimelineProps {
  items: SavedItem[];
}

export default function BoardTimeline({ items }: BoardTimelineProps) {
  const groups = useMemo(() => groupByDay(items), [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <span className="text-5xl mb-3">📖</span>
        <p className="text-sm font-medium text-gray-600">No timeline yet</p>
        <p className="text-xs text-gray-400 mt-1">Save clips to this board to build your journey.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ label, items: dayItems }) => (
        <div key={label}>
          {/* Day header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
              {label}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Items for this day */}
          <div className="space-y-3">
            {dayItems.map((item) => (
              <TimelineCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
