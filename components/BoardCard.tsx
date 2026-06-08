'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  coverThumbnail?: string;
  onClick: () => void;
  onDelete?: () => void;
}

// ─── Gradient palette for boards without a thumbnail ─────────────────────────

const GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-pink-400 to-rose-500',
  'from-fuchsia-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-emerald-500',
];

function boardGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardCard({ board, itemCount, coverThumbnail, onClick, onDelete }: BoardCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!coverThumbnail && !imgError;
  const gradient = boardGradient(board.id);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer flex flex-col group active:shadow-md transition-all duration-150"
    >
      {/* ── Cover header ── */}
      <div className="relative w-full h-28 overflow-hidden flex-shrink-0">
        {showImage ? (
          <img
            src={coverThumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-5xl leading-none drop-shadow-sm select-none">{board.emoji}</span>
          </div>
        )}

        {/* Item count badge */}
        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {itemCount}
        </span>

        {/* Delete button — top-right, visible on hover */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 p-1.5 bg-black/30 hover:bg-red-500 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm"
            aria-label="Delete board"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* ── Content section ── */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        {showImage && (
          <span className="text-xl leading-none flex-shrink-0">{board.emoji}</span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-800 text-sm leading-snug truncate">{board.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {itemCount} place{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
