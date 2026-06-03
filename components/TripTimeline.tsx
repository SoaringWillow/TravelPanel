'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Lightbulb, AlertTriangle, Star } from 'lucide-react';
import { SavedItem, SubstanceItem } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimelineDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(items: SavedItem[]): { dateLabel: string; items: SavedItem[] }[] {
  const map = new Map<string, SavedItem[]>();
  const sorted = [...items].sort((a, b) => a.savedAt - b.savedAt); // oldest first

  for (const item of sorted) {
    const d = new Date(item.savedAt);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries()).map(([dateLabel, items]) => ({ dateLabel, items }));
}

const SUBSTANCE_ICON: Record<string, React.ElementType> = {
  tip:            Lightbulb,
  warning:        AlertTriangle,
  recommendation: Star,
};

function SubstancePreview({ substance }: { substance: SubstanceItem[] }) {
  // Show at most 2 items; prefer tips & warnings
  const priority = ['warning', 'tip', 'recommendation', 'wisdom', 'opinion', 'context'];
  const shown = [...substance]
    .sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type))
    .slice(0, 2);

  if (shown.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {shown.map((s, i) => {
        const Icon = SUBSTANCE_ICON[s.type] ?? Lightbulb;
        return (
          <div key={i} className="flex items-start gap-1.5">
            <Icon size={11} className="mt-0.5 flex-shrink-0 text-indigo-400" />
            <p className="text-xs text-gray-600 leading-snug line-clamp-2">{s.content}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline entry ──────────────────────────────────────────────────────────

interface TimelineEntryProps {
  item: SavedItem;
  isLast: boolean;
}

function TimelineEntry({ item, isLast }: TimelineEntryProps) {
  const platformColor = PLATFORM_COLORS[item.platform];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
        <div
          className="w-3.5 h-3.5 rounded-full border-2 border-white flex-shrink-0 mt-1"
          style={{ backgroundColor: platformColor, boxShadow: `0 0 0 2px ${platformColor}40` }}
        />
        {!isLast && <div className="flex-1 w-px bg-gray-200 mt-1.5" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-5">
        <p className="text-xs text-gray-400 mb-1.5">{formatTimelineDate(item.savedAt)}</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Thumbnail */}
          {item.thumbnail && (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-32 object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          <div className="p-3">
            {/* Platform badge + title */}
            <div className="flex items-start gap-2 mb-1">
              <span
                className="text-white text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: platformColor }}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
              {item.title}
            </h3>

            {/* Locations */}
            {item.locations.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <MapPin size={11} className="text-indigo-400 flex-shrink-0" />
                <p className="text-xs text-indigo-600 line-clamp-1">
                  {item.locations.map(l => l.name).join(' · ')}
                </p>
              </div>
            )}

            {/* Top substance items */}
            {item.substance && item.substance.length > 0 && (
              <SubstancePreview substance={item.substance} />
            )}

            {/* Personal notes */}
            {item.notes && (
              <div className="mt-2 bg-amber-50 rounded-lg px-2.5 py-1.5">
                <p className="text-xs text-amber-800 italic line-clamp-2">"{item.notes}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface TripTimelineProps {
  items: SavedItem[];
}

export default function TripTimeline({ items }: TripTimelineProps) {
  const groups = useMemo(() => groupByDate(items), [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="text-4xl mb-3">📖</div>
        <p className="font-semibold text-gray-700">No timeline yet</p>
        <p className="text-sm text-gray-400 mt-1">Save clips to this board and your trip story appears here.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2">
      {groups.map(({ dateLabel, items: groupItems }) => (
        <div key={dateLabel}>
          {/* Month divider */}
          <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              {dateLabel}
            </p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Entries */}
          {groupItems.map((item, i) => (
            <TimelineEntry
              key={item.id}
              item={item}
              isLast={i === groupItems.length - 1 && dateLabel === groups[groups.length - 1].dateLabel}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
