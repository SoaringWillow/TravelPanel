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

export default function BoardCard({ board, itemCount, onClick, onDelete }: BoardCardProps) {
  const hasCover = !!board.coverThumbnail;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative rounded-2xl shadow-sm overflow-hidden cursor-pointer min-h-[160px] flex flex-col transition-all duration-150 ${
        hasCover
          ? 'border-0'
          : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10'
      }`}
    >
      {/* Full-bleed cover thumbnail */}
      {hasCover && (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Gradient overlay — darker at bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji top-left */}
        <div className="text-2xl leading-none mb-auto">{board.emoji}</div>

        {/* Name + count pushed to bottom */}
        <div className="mt-auto pt-8">
          <h3 className={`font-bold text-sm leading-snug line-clamp-1 mb-0.5 ${
            hasCover ? 'text-white' : 'text-gray-800 dark:text-gray-100'
          }`}>
            {board.name}
          </h3>
          <p className={`text-xs ${hasCover ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
            {itemCount} place{itemCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Delete button bottom-right */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`absolute bottom-3 right-3 p-1.5 rounded-lg transition-colors ${
              hasCover
                ? 'text-white/60 hover:text-white hover:bg-black/30'
                : 'text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
            }`}
            aria-label="Delete board"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
