'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, Sparkles } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { useSavedItems } from '@/hooks/useSavedItems';
import {
  pickResurfaceItem,
  markResurfaceShown,
  dismissResurfaceItem,
} from '@/lib/resurface';

interface ResurfaceCardProps {
  onView: (item: SavedItem) => void;
}

export default function ResurfaceCard({ onView }: ResurfaceCardProps) {
  const { items, loading } = useSavedItems();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || items.length === 0) return;
    const picked = pickResurfaceItem(items);
    if (!picked) return;
    markResurfaceShown();
    setItem(picked);
    // Slight delay so the page finishes rendering first
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [loading, items]);

  function handleDismiss() {
    if (item) dismissResurfaceItem(item.id);
    setVisible(false);
    setTimeout(() => setItem(null), 300);
  }

  function handleView() {
    if (!item) return;
    onView(item);
    setVisible(false);
    setTimeout(() => setItem(null), 300);
  }

  if (!item) return null;

  const tip = item.substance.find((s) => s.type === 'tip' || s.type === 'wisdom' || s.type === 'recommendation');
  const locationName = item.locations[0]?.name ?? '';
  const daysAgo = Math.floor((Date.now() - item.savedAt) / 86400000);

  return (
    <div
      className={`absolute bottom-20 left-4 right-4 z-[900] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header strip */}
        <div className="bg-indigo-50 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-indigo-600">
            <Sparkles size={13} />
            <span className="text-xs font-semibold">Remember this?</span>
            <span className="text-[10px] text-indigo-400">· saved {daysAgo}d ago</span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-0.5 rounded-full text-indigo-400 hover:text-indigo-700 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <button
          onClick={handleView}
          className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
        >
          {item.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt=""
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {item.title || 'Saved clip'}
            </p>
            {locationName && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 truncate">{locationName}</span>
              </div>
            )}
            {tip && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug italic">
                "{tip.content}"
              </p>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
