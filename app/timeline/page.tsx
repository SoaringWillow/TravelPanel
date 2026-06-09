'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Lightbulb, Star, AlertTriangle, MessageCircle, Globe } from 'lucide-react';
import { getVisitedItems } from '@/lib/db';
import { SavedItem, SubstanceType } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Substance icon map ───────────────────────────────────────────────────────

const SUBSTANCE_ICON: Record<SubstanceType, React.ElementType> = {
  tip:            Lightbulb,
  warning:        AlertTriangle,
  opinion:        MessageCircle,
  wisdom:         Star,
  context:        Globe,
  recommendation: Star,
};

const SUBSTANCE_COLOR: Record<SubstanceType, string> = {
  tip:            'text-amber-600 bg-amber-50',
  warning:        'text-red-600 bg-red-50',
  opinion:        'text-purple-600 bg-purple-50',
  wisdom:         'text-indigo-600 bg-indigo-50',
  context:        'text-teal-600 bg-teal-50',
  recommendation: 'text-emerald-600 bg-emerald-50',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });
}

// Group visited items by calendar day
function groupByDay(items: SavedItem[]): Array<{ dateLabel: string; items: SavedItem[] }> {
  const map = new Map<string, SavedItem[]>();
  for (const item of items) {
    const ts = item.visitedAt ?? item.savedAt;
    const key = new Date(ts).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([key, its]) => ({
    dateLabel: formatDate(new Date(key).getTime()),
    items: its,
  }));
}

// ─── Item card ────────────────────────────────────────────────────────────────

function TimelineCard({ item, index }: { item: SavedItem; index: number }) {
  const ts = item.visitedAt ?? item.savedAt;
  const color = PLATFORM_COLORS[item.platform] ?? '#6366f1';
  const label = PLATFORM_LABELS[item.platform] ?? 'Web';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative ml-6"
    >
      {/* Connector dot on timeline rail */}
      <div
        className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white"
        style={{ background: color }}
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Thumbnail */}
        {item.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-36 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="p-3 space-y-2">
          {/* Header */}
          <div className="flex items-start gap-2">
            <span
              className="flex-shrink-0 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: color }}
            >
              {label}
            </span>
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
              {formatTime(ts)}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {item.title}
          </h3>

          {/* Locations visited */}
          {item.locations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.locations.map((loc) => (
                <span
                  key={loc.name}
                  className="flex items-center gap-0.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"
                >
                  <MapPin size={10} />
                  {loc.name}
                </span>
              ))}
            </div>
          )}

          {/* Top substance item */}
          {item.substance && item.substance.length > 0 && (() => {
            const sub = item.substance[0];
            const Icon = SUBSTANCE_ICON[sub.type];
            const colorCls = SUBSTANCE_COLOR[sub.type];
            return (
              <div className={`flex items-start gap-1.5 rounded-xl px-2.5 py-2 ${colorCls}`}>
                <Icon size={12} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-snug line-clamp-2">{sub.content}</p>
              </div>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVisitedItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const days = groupByDay(items);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-12 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trip Timeline</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {items.length} place{items.length !== 1 ? 's' : ''} visited
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 text-center px-8">
          <div className="text-5xl mb-4">🗺</div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">No visits yet</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Start a trip from a plan and tap <strong>"✓ Here"</strong> when you arrive
            at a saved spot to build your timeline.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Browse plans
          </button>
        </div>
      ) : (
        <div className="px-4 pb-12 pt-6 space-y-8">
          {days.map(({ dateLabel, items: dayItems }) => (
            <div key={dateLabel}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} className="text-indigo-500 flex-shrink-0" />
                <span className="text-sm font-bold text-gray-600">{dateLabel}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {dayItems.length} stop{dayItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Timeline rail + cards */}
              <div className="relative pl-4 border-l-2 border-indigo-100 space-y-4">
                {dayItems.map((item, idx) => (
                  <TimelineCard key={item.id} item={item} index={idx} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
