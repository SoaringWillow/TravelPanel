'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronRight, RotateCcw } from 'lucide-react';
import { SavedItem } from '@/lib/types';

// ─── Deterministic daily pick ─────────────────────────────────────────────────

function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

function pickDailyClips(items: SavedItem[], count = 3): SavedItem[] {
  const MIN_AGE_DAYS = 7;
  const now = Date.now();
  const minAgeMs = MIN_AGE_DAYS * 86_400_000;

  // Prefer: old clips (>7 days), clips with substance, enriched clips
  const pool = items
    .filter((i) => !i.isDemo && now - i.savedAt > minAgeMs && i.enrichmentStatus === 'done')
    .sort((a, b) => {
      // Score: older = higher (resurface forgotten gems), more substance = higher
      const ageA = now - a.savedAt;
      const ageB = now - b.savedAt;
      const scoreA = ageA / 86_400_000 + (a.substance?.length ?? 0) * 3;
      const scoreB = ageB / 86_400_000 + (b.substance?.length ?? 0) * 3;
      return scoreB - scoreA;
    });

  if (pool.length === 0) return [];

  // Use daily seed to pick consistently within the day
  const rand = seededRandom(dailySeed());
  const top = pool.slice(0, Math.max(pool.length, count * 3));
  const shuffled = [...top].sort(() => rand() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Dismissal persistence ────────────────────────────────────────────────────

const DISMISSED_KEY = 'dailyDiscoveryDismissed';

function isDismissedToday(): boolean {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) return false;
    return val === String(dailySeed());
  } catch {
    return false;
  }
}

function markDismissedToday() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(dailySeed()));
  } catch {
    // ignore
  }
}

// ─── Single pick card ─────────────────────────────────────────────────────────

function DiscoveryCard({
  item,
  onOpen,
}: {
  item: SavedItem;
  onOpen: (item: SavedItem) => void;
}) {
  const daysSaved = Math.floor((Date.now() - item.savedAt) / 86_400_000);
  const timeLabel =
    daysSaved === 0 ? 'Today' :
    daysSaved === 1 ? 'Yesterday' :
    daysSaved < 30  ? `${daysSaved} days ago` :
    daysSaved < 365 ? `${Math.floor(daysSaved / 30)} months ago` :
                      `${Math.floor(daysSaved / 365)} year${Math.floor(daysSaved / 365) !== 1 ? 's' : ''} ago`;

  // Pick a random substance item as the teaser
  const teaser = item.substance?.[0]?.content;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex-shrink-0 w-64 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left active:scale-95 transition-transform"
    >
      {item.thumbnail ? (
        <div className="h-28 overflow-hidden">
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <span className="text-4xl">
            {item.locations.length > 0 ? '📍' : '✈️'}
          </span>
        </div>
      )}

      <div className="p-3">
        <div className="text-xs font-medium text-indigo-500 mb-1">{timeLabel}</div>
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">
          {item.title}
        </p>
        {teaser && (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            💡 {teaser}
          </p>
        )}
        {item.locations.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            📍 {item.locations[0].name}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

interface DailyDiscoveryProps {
  items: SavedItem[];
  onOpen: (item: SavedItem) => void;
}

export function DailyDiscovery({ items, onOpen }: DailyDiscoveryProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [picks, setPicks] = useState<SavedItem[]>([]);

  useEffect(() => {
    if (isDismissedToday()) {
      setDismissed(true);
      return;
    }
    const daily = pickDailyClips(items);
    if (daily.length === 0) {
      setDismissed(true);
      return;
    }
    setPicks(daily);
    setDismissed(false);
  }, [items]);

  const handleDismiss = useCallback(() => {
    markDismissedToday();
    setDismissed(true);
  }, []);

  const handleRefresh = useCallback(() => {
    // Show from later in the pool (next day's seed + 1)
    const rand = seededRandom(dailySeed() + 1);
    const eligible = items.filter(
      (i) => !i.isDemo && i.enrichmentStatus === 'done'
    ).sort(() => rand() - 0.5);
    setPicks(eligible.slice(0, 3));
  }, [items]);

  if (dismissed || picks.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="mb-4"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5 px-0.5">
          <Sparkles size={14} className="text-indigo-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">
            Rediscover
          </span>
          <span className="text-xs text-gray-400 ml-1">·  today's picks</span>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Shuffle"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Horizontal scroll cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {picks.map((item) => (
            <DiscoveryCard key={item.id} item={item} onOpen={onOpen} />
          ))}

          {/* "See all" card */}
          <button
            type="button"
            className="flex-shrink-0 w-24 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center gap-2 text-indigo-600 text-xs font-semibold active:bg-indigo-100 transition-colors"
            onClick={() => {
              // Navigate to inbox
              window.location.href = '/inbox';
            }}
          >
            <ChevronRight size={18} />
            See all
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
