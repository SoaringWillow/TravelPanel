'use client';

import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
}

// Deterministic gradient fallback based on board name
function gradientForName(name: string): string {
  const palettes = [
    'from-indigo-400 to-violet-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-600',
    'from-sky-400 to-blue-600',
    'from-fuchsia-400 to-purple-600',
  ];
  const idx = (name.charCodeAt(0) || 0) % palettes.length;
  return palettes[idx];
}

export default function BoardCard({ board, itemCount, onClick, onDelete }: BoardCardProps) {
  const hasCover = !!board.coverThumbnail;
  const gradient = gradientForName(board.name);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative rounded-2xl shadow-sm overflow-hidden cursor-pointer min-h-[160px] flex flex-col"
    >
      {/* ── Background ── */}
      {hasCover ? (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Dark gradient overlay — text sits on the bottom half */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* ── Content ── */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-auto ${
            hasCover ? 'bg-white/25 backdrop-blur-sm' : 'bg-white/20'
          }`}
        >
          {board.emoji}
        </div>

        {/* Name + count at bottom */}
        <div className="mt-10">
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 drop-shadow">
            {board.name}
          </h3>
          <p className="text-xs text-white/75 mt-0.5">
            {itemCount} place{itemCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-3 right-3 p-1.5 bg-black/25 hover:bg-red-500 rounded-lg transition-colors"
            aria-label="Delete board"
          >
            <Trash2 size={13} className="text-white" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
