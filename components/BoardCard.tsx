'use client';

import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  thumbnails?: string[];   // up to 4 image URLs for the collage cover
  onClick: () => void;
  onDelete?: () => void;
}

export default function BoardCard({ board, itemCount, thumbnails = [], onClick, onDelete }: BoardCardProps) {
  const hasCover = thumbnails.length > 0 || !!board.coverThumbnail;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer min-h-[160px] flex flex-col transition-all duration-150"
    >
      {/* ���─ Collage cover (2×2 grid) ─────────────────────────────────────── */}
      {hasCover && (
        <div className="absolute inset-0">
          {thumbnails.length >= 2 ? (
            /* 2×2 grid collage */
            <div className="w-full h-full grid grid-cols-2 grid-rows-2">
              {[0, 1, 2, 3].map((i) => {
                const src = thumbnails[i];
                return src ? (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                ) : (
                  <div key={i} className="w-full h-full bg-indigo-100" />
                );
              })}
            </div>
          ) : (
            /* Single image or coverThumbnail */
            <img
              src={thumbnails[0] ?? board.coverThumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          )}
          {/* Gradient scrim so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
      )}

      {/* ── Flat background when no cover ───────────────────────────────── */}
      {!hasCover && (
        <div className="absolute inset-0 bg-white" />
      )}

      {/* ── Content overlay ──────────────────────────────────────────────── */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Push name + count to bottom */}
        <div className="flex-1" />

        {/* Name */}
        <h3 className={`font-bold text-sm leading-snug line-clamp-1 mb-0.5 ${hasCover ? 'text-white' : 'text-gray-800'}`}>
          {board.name}
        </h3>

        {/* Item count */}
        <p className={`text-xs font-medium ${hasCover ? 'text-white/80' : 'text-gray-400'}`}>
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Delete button ────────────────────────────────────────────────── */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
            hasCover
              ? 'text-white/60 hover:text-white hover:bg-white/20'
              : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
          }`}
          aria-label="Delete board"
        >
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  );
}
