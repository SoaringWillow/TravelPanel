'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock3, MapPin, Sparkles, Camera } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import { SkeletonTimelineEntry } from '@/components/SkeletonCard';
import NavBar from '@/components/NavBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthHeader(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Group items into months ──────────────────────────────────────────────────

interface MonthGroup {
  label: string;
  key: string;
  items: SavedItem[];
}

function groupByMonth(items: SavedItem[]): MonthGroup[] {
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const map = new Map<string, { label: string; key: string; items: SavedItem[] }>();

  for (const item of sorted) {
    const d = new Date(item.savedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) {
      map.set(key, { label: formatMonthHeader(item.savedAt), key, items: [] });
    }
    map.get(key)!.items.push(item);
  }

  return Array.from(map.values());
}

// ─── Timeline entry ───────────────────────────────────────────────────────────

function TimelineEntry({ item, index }: { item: SavedItem; index: number }) {
  const router = useRouter();
  const platformColor = PLATFORM_COLORS[item.platform];
  const platformLabel = PLATFORM_LABELS[item.platform];

  function handleClick() {
    if (item.locations.length > 0) {
      const loc = item.locations[0];
      router.push(`/?flyTo=${loc.lat},${loc.lng}&itemId=${item.id}`);
    }
  }

  return (
    <motion.div
      className="relative flex gap-4 pl-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      {/* Timeline dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <div
          className="w-3 h-3 rounded-full border-2 border-white ring-2 flex-shrink-0 mt-3"
          style={{
            backgroundColor: platformColor,
            ringColor: platformColor,
            boxShadow: `0 0 0 2px ${platformColor}40`,
          }}
        />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>

      {/* Card */}
      <button
        type="button"
        className="flex-1 mb-4 text-left bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md active:scale-[0.99] transition-all"
        onClick={handleClick}
      >
        {/* Thumbnail */}
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-32 object-cover"
            loading="lazy"
          />
        )}

        <div className="p-3.5 space-y-2">
          {/* Platform chip + date */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: platformColor }}
            >
              {platformLabel}
            </span>
            <span className="text-xs text-gray-400">{formatDay(item.savedAt)}</span>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {item.title}
          </p>

          {/* Locations */}
          {item.locations.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={11} />
              <span className="line-clamp-1">
                {item.locations.slice(0, 3).map(l => l.name).join(' · ')}
                {item.locations.length > 3 && ` +${item.locations.length - 3}`}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-gray-400 pt-0.5">
            {item.substance.length > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" />
                {item.substance.length} tip{item.substance.length !== 1 ? 's' : ''}
              </span>
            )}
            {item.locations.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-indigo-400" />
                {item.locations.length} spot{item.locations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const { items, loading } = useSavedItems();
  const groups = useMemo(() => groupByMonth(items), [items]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 pt-safe-top">
        <div className="flex items-center gap-2.5 py-4">
          <Clock3 size={20} className="text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900">Timeline</h1>
          {!loading && items.length > 0 && (
            <span className="ml-auto text-xs text-gray-400 font-medium">
              {items.length} clip{items.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-4 pt-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonTimelineEntry key={i} />)}
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Camera size={28} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-700">Your travel story starts here</p>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Save your first clip from Instagram, YouTube, or Xiaohongshu to begin your timeline.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4">
          {groups.map((group) => (
            <div key={group.key} className="mb-2">
              {/* Month header */}
              <div className="flex items-center gap-3 mb-4 px-2">
                <h2 className="text-sm font-bold text-gray-700">{group.label}</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">
                  {group.items.length} clip{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Entries */}
              {group.items.map((item, idx) => (
                <TimelineEntry key={item.id} item={item} index={idx} />
              ))}
            </div>
          ))}
        </div>
      )}

      <NavBar active="timeline" />
    </div>
  );
}
