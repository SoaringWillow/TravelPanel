'use client';

import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
}

export default function BoardCard({ board, itemCount, onClick, onDelete, onLongPress }: BoardCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCover = !!board.coverThumbnail;

  function handleTouchStart() {
    if (!onLongPress) return;
    longPressTimer.current = setTimeout(onLongPress, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer min-h-[160px] flex flex-col hover:border-l-[3px] hover:border-l-indigo-500 transition-all duration-150"
    >
      {/* Cover thumbnail background */}
      {hasCover && (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark gradient from bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji top-left */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Spacer pushes name/count to bottom when cover present */}
        {hasCover && <div className="flex-1" />}

        {/* Name */}
        <h3 className={`font-bold text-sm leading-snug line-clamp-1 mb-1 ${hasCover ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
          {board.name}
        </h3>

        {/* Item count */}
        <p className={`text-sm ${hasCover ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Delete button bottom-right */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`absolute bottom-3 right-3 p-1.5 rounded-lg transition-colors ${hasCover ? 'text-white/50 hover:text-white hover:bg-white/20' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
            aria-label="Delete board"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
