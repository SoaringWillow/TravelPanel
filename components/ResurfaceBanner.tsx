'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sparkles, X, BookOpen } from 'lucide-react';
import { SavedItem } from '@/lib/types';

// ─── Algorithm ────────────────────────────────────────────────────────────────

function getDaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickResurfaceItems(items: SavedItem[]): SavedItem[] {
  const now            = Date.now();
  const thirtyDaysMs   = 30 * 24 * 60 * 60 * 1000;

  const candidates = items.filter(
    (i) =>
      i.savedAt < now - thirtyDaysMs &&
      !i.isDemo &&
      i.enrichmentStatus === 'done' &&
      i.substance.length > 0,
  );

  if (candidates.length === 0) return [];

  // Deterministic daily shuffle using the day number as a seed
  const seed = getDaySeed();
  const shuffled = [...candidates].sort((a, b) => {
    const ha = (parseInt(a.id.replace(/-/g, '').slice(0, 8), 16) ^ seed) % 1000;
    const hb = (parseInt(b.id.replace(/-/g, '').slice(0, 8), 16) ^ seed) % 1000;
    return ha - hb;
  });

  return shuffled.slice(0, 3);
}

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
}

// ─── Dismiss persistence ─────────────────────────────────────────────────────

const DISMISS_KEY = 'resurfaceDismissedDate';

function wasDismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

function dismissToday() {
  try {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10));
  } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ResurfaceBannerProps {
  items: SavedItem[];
  onItemClick: (item: SavedItem) => void;
}

export default function ResurfaceBanner({ items, onItemClick }: ResurfaceBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flicker

  useEffect(() => {
    setDismissed(wasDismissedToday());
  }, []);

  const picks = useMemo(() => pickResurfaceItems(items), [items]);

  if (dismissed || picks.length === 0) return null;

  function handleDismiss() {
    dismissToday();
    setDismissed(true);
  }

  return (
    <div className="mx-4 my-3 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Sparkles size={15} className="text-indigo-500 flex-shrink-0" />
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
          Rediscover
        </span>
        <span className="text-xs text-indigo-400 ml-0.5">· inspiration from your archive</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-auto p-1 text-indigo-300 hover:text-indigo-500 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Clip row */}
      <div className="flex gap-2.5 px-4 pb-4 overflow-x-auto">
        {picks.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex-shrink-0 w-40 text-left bg-white rounded-xl shadow-sm border border-indigo-50 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all active:scale-[0.97]"
          >
            {/* Thumbnail */}
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-24 object-cover"
              />
            ) : (
              <div className="w-full h-24 bg-indigo-100 flex items-center justify-center">
                <span className="text-2xl">
                  {item.tags.includes('beach') ? '🏖' :
                   item.tags.includes('food')  ? '🍜' :
                   item.tags.includes('mountain') ? '🏔' : '🗺'}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="px-2.5 py-2">
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
                {item.title}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <BookOpen size={10} className="text-indigo-400" />
                <span className="text-xs text-indigo-500 font-medium">
                  {item.substance.length} tip{item.substance.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-300 ml-auto">
                  {daysSince(item.savedAt)}d ago
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
