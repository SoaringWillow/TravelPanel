'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { SavedItem, Board, Trip } from '@/lib/types';
import { SurfaceCard, computeSurfaceCards } from '@/lib/surfacing';

interface ProactiveSurfaceProps {
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

const DISMISS_KEY = 'proactiveSurfaceDismissed';

const TYPE_COLORS: Record<SurfaceCard['type'], string> = {
  ready_to_plan: 'from-indigo-50 to-purple-50 border-indigo-100',
  dusty_inbox:   'from-amber-50  to-orange-50 border-amber-100',
  geo_cluster:   'from-teal-50   to-cyan-50   border-teal-100',
  almost_there:  'from-gray-50   to-slate-50  border-gray-100',
};

const TYPE_CTA_COLORS: Record<SurfaceCard['type'], string> = {
  ready_to_plan: 'text-indigo-600',
  dusty_inbox:   'text-amber-600',
  geo_cluster:   'text-teal-600',
  almost_there:  'text-gray-600',
};

export function ProactiveSurface({ items, boards, trips }: ProactiveSurfaceProps) {
  const [cards, setCards]       = useState<SurfaceCard[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const computed = useRef(false);

  useEffect(() => {
    if (computed.current) return;
    computed.current = true;

    // Check session-level dismiss (one dismiss hides for the rest of the session)
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true);
        return;
      }
    } catch { /* */ }

    if (items.length === 0 && boards.length === 0) return;
    const result = computeSurfaceCards(items, boards, trips);
    setCards(result);
  }, [items, boards, trips]);

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* */ }
    setDismissed(true);
  }

  if (dismissed || cards.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
        <Sparkles size={13} className="text-indigo-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">For you</span>
        <button
          onClick={dismiss}
          className="ml-auto p-0.5 text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="Dismiss suggestions"
        >
          <X size={13} />
        </button>
      </div>

      {/* Horizontal scroll of cards */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
        {cards.map((card, i) => (
          <Link
            key={i}
            href={card.ctaHref}
            className={`flex-shrink-0 snap-start w-56 rounded-2xl border bg-gradient-to-br p-3.5 ${TYPE_COLORS[card.type]} block`}
          >
            <div className="text-xl mb-2">{card.emoji}</div>
            <p className="text-sm font-semibold text-gray-800 leading-snug mb-1 line-clamp-2">
              {card.title}
            </p>
            <p className="text-xs text-gray-500 leading-snug mb-3 line-clamp-2">
              {card.subtitle}
            </p>
            <p className={`text-xs font-semibold ${TYPE_CTA_COLORS[card.type]}`}>
              {card.ctaLabel}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
