'use client';

import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  thumbnails?: string[]; // up to 4 item thumbnails for the grid background
  onClick: () => void;
  onDelete?: () => void;
}

export default function BoardCard({ board, itemCount, thumbnails = [], onClick, onDelete }: BoardCardProps) {
  const hasThumbs = thumbnails.length > 0;
  const gridSlots = [0, 1, 2, 3];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer min-h-[160px] flex flex-col transition-all duration-150"
    >
      {/* Background: 2×2 photo grid or single cover or solid */}
      {hasThumbs ? (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {gridSlots.map((i) =>
            thumbnails[i] ? (
              <img key={i} src={thumbnails[i]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div key={i} className="w-full h-full bg-indigo-100 flex items-center justify-center text-xl opacity-60">
                {board.emoji}
              </div>
            )
          )}
        </div>
      ) : board.coverThumbnail ? (
        <img
          src={board.coverThumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100" />
      )}

      {/* Gradient footer overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* Content pinned to bottom */}
      <div className="relative flex flex-col flex-1 justify-end p-3">
        <div className="flex items-end justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xl leading-none mb-1">{board.emoji}</div>
            <h3 className="font-bold text-white text-sm leading-snug line-clamp-1 drop-shadow">
              {board.name}
            </h3>
            <p className="text-xs text-white/75 mt-0.5">
              {itemCount} place{itemCount !== 1 ? 's' : ''}
            </p>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-white/60 hover:text-red-300 hover:bg-black/20 rounded-lg transition-colors flex-shrink-0 ml-2"
              aria-label="Delete board"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
