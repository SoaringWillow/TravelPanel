'use client';

import { SavedItem } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';
import { MapPin } from 'lucide-react';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatGroupDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (ts >= todayStart) return 'Today';
  if (ts >= yesterdayStart) return 'Yesterday';

  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ─── Group items by day ───────────────────────────────────────────────────────

interface DayGroup {
  label: string;
  items: SavedItem[];
}

function groupByDay(items: SavedItem[]): DayGroup[] {
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const groups: Map<string, DayGroup> = new Map();

  for (const item of sorted) {
    const key = dayKey(item.savedAt);
    if (!groups.has(key)) {
      groups.set(key, { label: formatGroupDate(item.savedAt), items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  return Array.from(groups.values());
}

// ─── Timeline card ────────────────────────────────────────────────────────────

function TimelineCard({ item }: { item: SavedItem }) {
  const platformColor = PLATFORM_COLORS[item.platform];
  const platformLabel = PLATFORM_LABELS[item.platform];

  return (
    <div className="flex gap-3">
      {/* Thumbnail */}
      <div
        className="flex-shrink-0 rounded-xl overflow-hidden bg-gray-100"
        style={{ width: 72, height: 72 }}
      >
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.background = '#f3f4f6'; e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl"
            style={{ background: `${platformColor}18` }}
          >
            📍
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white leading-none"
            style={{ backgroundColor: platformColor }}
          >
            {platformLabel}
          </span>
          <span className="text-[10px] text-gray-400">{formatTime(item.savedAt)}</span>
        </div>

        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
          {item.title}
        </p>

        {item.locations.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 truncate">
              {item.locations.map((l) => l.name).join(' · ')}
            </p>
          </div>
        )}

        {item.substance.length > 0 && (
          <p className="text-xs text-indigo-600 mt-0.5 font-medium">
            {item.substance.length} insight{item.substance.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Timeline component ───────────────────────────────────────────────────────

interface TimelineViewProps {
  items: SavedItem[];
}

export default function TimelineView({ items }: TimelineViewProps) {
  const groups = groupByDay(items);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <MapPin className="text-gray-300 mb-3" size={40} />
        <p className="text-sm font-medium text-gray-600">No places saved yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          {/* Day header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 tabular-nums">
              {group.items.length} clip{group.items.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Items with timeline connector */}
          <div className="relative pl-4">
            {/* Vertical line */}
            <div
              className="absolute left-[1.5px] top-3 bottom-3 w-px bg-gray-200"
              style={{ top: 8, bottom: 8 }}
            />

            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.id} className="relative">
                  {/* Dot */}
                  <div
                    className="absolute -left-4 top-3.5 w-2 h-2 rounded-full bg-indigo-400 border-2 border-white"
                    style={{ transform: 'translateY(-50%)' }}
                  />
                  <TimelineCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
