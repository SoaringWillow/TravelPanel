'use client';

import { Trash2, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  locationItemCount?: number; // items in this board that have locations
  onClick: () => void;
  onDelete?: () => void;
  onQuickPlan?: () => void;
}

// Fallback gradient per emoji/name hash so boards without covers still look distinct
const FALLBACK_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-blue-600',
  'from-violet-500 to-fuchsia-600',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

export default function BoardCard({
  board,
  itemCount,
  locationItemCount = 0,
  onClick,
  onDelete,
  onQuickPlan,
}: BoardCardProps) {
  const hasCover  = !!board.coverThumbnail;
  const canPlan   = locationItemCount >= 2;
  const gradient  = gradientFor(board.id);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer min-h-[180px] flex flex-col shadow-md"
    >
      {/* ── Background: cover image or gradient ── */}
      {hasCover ? (
        <>
          <img
            src={board.coverThumbnail!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Dark gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
          {/* Oversized emoji as watermark */}
          <span className="absolute right-3 top-3 text-5xl opacity-25 select-none" aria-hidden>
            {board.emoji}
          </span>
        </div>
      )}

      {/* ── Top row: delete button ── */}
      {onDelete && (
        <div className="relative flex justify-end p-2 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
            aria-label="Delete board"
          >
            <Trash2 size={13} className="text-white/80" />
          </button>
        </div>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Bottom info row ── */}
      <div className="relative px-3 pb-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {/* Emoji + Name */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-base leading-none">{board.emoji}</span>
            <h3 className="font-bold text-white text-sm leading-snug line-clamp-1">
              {board.name}
            </h3>
          </div>
          {/* Stats */}
          <p className="text-xs text-white/70">
            {itemCount} place{itemCount !== 1 ? 's' : ''}
            {locationItemCount > 0 && ` · ${locationItemCount} mapped`}
          </p>
        </div>

        {/* Quick Plan button */}
        {canPlan && onQuickPlan && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuickPlan(); }}
            className="flex-shrink-0 flex items-center gap-1 bg-white text-indigo-700 text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-md"
            aria-label="Plan trip for this board"
          >
            <Map size={12} />
            Plan
          </button>
        )}
      </div>
    </motion.div>
  );
}
