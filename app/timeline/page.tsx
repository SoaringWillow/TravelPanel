'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import NavBar from '@/components/NavBar';
import LocationDetailCard from '@/components/LocationDetailCard';
import { useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVisitDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function groupByDay(items: SavedItem[]): { dateKey: string; label: string; items: SavedItem[] }[] {
  const map = new Map<string, SavedItem[]>();
  for (const item of items) {
    if (!item.visitedAt) continue;
    const key = new Date(item.visitedAt).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, dayItems]) => ({
      dateKey: key,
      label:   formatVisitDate(dayItems[0].visitedAt!),
      items:   dayItems.sort((a, b) => (b.visitedAt ?? 0) - (a.visitedAt ?? 0)),
    }));
}

// ─── Timeline entry card ──────────────────────────────────────────────────────

function TimelineCard({ item, onSelect }: { item: SavedItem; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left flex gap-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-md active:scale-[0.99] transition-all"
    >
      {item.thumbnail && (
        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-slate-700">
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget.closest('.w-20') as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 py-3 pr-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 leading-snug line-clamp-2 mb-1">
          {item.title}
        </p>
        {item.locations.length > 0 && (
          <div className="flex items-center gap-1">
            <MapPin size={11} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
              {item.locations[0].name}
            </span>
          </div>
        )}
        {item.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {item.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const { items, loading, markVisited } = useSavedItems();
  const [selected, setSelected] = useState<SavedItem | null>(null);

  const groups = useMemo(() => groupByDay(items), [items]);
  const visitedCount = useMemo(() => items.filter((i) => i.visitedAt).length, [items]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm px-4 header-pt-safe pb-4">
        <div className="flex items-center gap-3">
          <Clock size={22} className="text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100 leading-tight">Timeline</h1>
            {!loading && (
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {visitedCount} place{visitedCount !== 1 ? 's' : ''} visited
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-28 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : groups.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="mb-5"
            >
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
              {/* Calendar-ish circle */}
              <circle cx="44" cy="44" r="32" strokeWidth="2" strokeDasharray="6 4" className="stroke-gray-300 dark:stroke-slate-600" />
              {/* Clock hands */}
              <circle cx="44" cy="44" r="18" strokeWidth="2" className="stroke-indigo-400 dark:stroke-indigo-500" fill="none" />
              <line x1="44" y1="44" x2="44" y2="30" strokeWidth="2.5" strokeLinecap="round" className="stroke-indigo-500 dark:stroke-indigo-400" />
              <line x1="44" y1="44" x2="54" y2="50" strokeWidth="2" strokeLinecap="round" className="stroke-indigo-400 dark:stroke-indigo-500" />
              <circle cx="44" cy="44" r="2.5" className="fill-indigo-500 dark:fill-indigo-400" />
            </svg>
            </motion.div>
            <h2 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-2">
              Your travel diary starts here
            </h2>
            <p className="text-sm text-gray-400 dark:text-slate-500 leading-relaxed max-w-xs">
              When you visit a saved place, tap "Mark as visited" in the clip to add it to your timeline.
            </p>
          </div>
        ) : (
          /* Groups */
          <div className="space-y-6 pt-5">
            {groups.map((group) => (
              <div key={group.dateKey}>
                {/* Day header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 flex-shrink-0" />
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    {group.label}
                  </p>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                </div>

                {/* Cards */}
                <div className="space-y-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/40">
                  {group.items.map((item) => (
                    <TimelineCard
                      key={item.id}
                      item={item}
                      onSelect={() => setSelected(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail card */}
      <AnimatePresence>
        {selected && (
          <LocationDetailCard
            item={selected}
            onClose={() => setSelected(null)}
            onMarkVisited={() => markVisited(selected.id)}
          />
        )}
      </AnimatePresence>

      <NavBar active="timeline" />
    </div>
  );
}
