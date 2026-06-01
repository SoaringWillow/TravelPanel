'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Lightbulb, Clock, Globe2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG, PLATFORM_COLORS } from '@/lib/parse-url';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthYear(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Group items by month label, most recent first. */
function groupByMonth(items: SavedItem[]): Array<{ label: string; items: SavedItem[] }> {
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const map = new Map<string, SavedItem[]>();
  for (const item of sorted) {
    const label = formatMonthYear(item.savedAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ─── Timeline item card ───────────────────────────────────────────────────────

function TimelineCard({ item, onSelect }: { item: SavedItem; onSelect: () => void }) {
  const platformColor = PLATFORM_COLORS[item.platform];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full text-left"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md active:scale-[0.98] transition-all duration-150">
        {/* Thumbnail strip */}
        {item.thumbnail && (
          <div className="w-full h-28 overflow-hidden">
            <img
              src={item.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => ((e.currentTarget.parentElement!.style.display = 'none'))}
            />
          </div>
        )}

        <div className="p-3.5">
          {/* Platform + date */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-semibold px-2 py-0.5 rounded-full`}
            >
              {PLATFORM_LABELS[item.platform]}
            </span>
            <span className="text-[10px] text-gray-400">{formatDay(item.savedAt)}</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-2">
            {item.title || item.url}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-3">
            {item.locations.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
                <MapPin size={11} />
                {item.locations.length} spot{item.locations.length !== 1 ? 's' : ''}
              </span>
            )}
            {(item.substance?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                <Lightbulb size={11} />
                {item.substance.length} tip{item.substance.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Colored bottom border as platform stripe */}
        <div style={{ height: 3, background: platformColor, opacity: 0.6 }} />
      </div>
    </motion.button>
  );
}

// ─── Month section ─────────────────────────────────────────────────────────────

function MonthSection({ label, items, onSelect }: {
  label: string;
  items: SavedItem[];
  onSelect: (item: SavedItem) => void;
}) {
  return (
    <div className="relative pl-10">
      {/* Timeline vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      {/* Month dot */}
      <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm" />

      {/* Month label */}
      <h2 className="text-sm font-bold text-indigo-600 mb-3 mt-0.5">{label}</h2>

      {/* Cards */}
      <div className="space-y-3 pb-6">
        {items.map((item, i) => (
          <div key={item.id} className="relative">
            {/* Item dot */}
            <div className="absolute -left-[26px] top-5 w-2 h-2 rounded-full bg-gray-300 ring-2 ring-white" />
            <TimelineCard item={item} onSelect={() => onSelect(item)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const { items, loading } = useSavedItems();
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const router = useRouter();

  const groups = useMemo(() => groupByMonth(items.filter((i) => !i.isDemo)), [items]);

  const totalLocations = items.reduce((s, i) => s + i.locations.length, 0);
  const totalTips      = items.reduce((s, i) => s + (i.substance?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-5 pt-safe pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} className="text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">My Journey</h1>
          </div>

          {/* Stats strip */}
          {!loading && items.length > 0 && (
            <div className="flex gap-4 text-xs text-gray-500">
              <span>
                <span className="font-bold text-gray-800">{items.filter((i) => !i.isDemo).length}</span> clips
              </span>
              <span>
                <span className="font-bold text-gray-800">{totalLocations}</span> locations
              </span>
              <span>
                <span className="font-bold text-gray-800">{totalTips}</span> tips saved
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-32">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading your journey…</span>
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <Globe2 size={28} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">No clips yet</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Start saving travel inspiration from YouTube, Xiaohongshu, or any travel site.
                They&apos;ll appear here in chronological order.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Open the map
            </button>
          </div>
        )}

        {groups.map((group) => (
          <MonthSection
            key={group.label}
            label={group.label}
            items={group.items}
            onSelect={setSelectedItem}
          />
        ))}
      </div>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>

      <NavBar active="timeline" />
    </div>
  );
}
