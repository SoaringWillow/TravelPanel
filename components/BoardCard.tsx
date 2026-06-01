'use client';

import { Trash2, MapPin, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  locationCount?: number;
  tipCount?: number;
  onClick: () => void;
  onDelete?: () => void;
}

export default function BoardCard({ board, itemCount, locationCount, tipCount, onClick, onDelete }: BoardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer min-h-[160px] flex flex-col hover:border-l-[3px] hover:border-l-indigo-500 transition-all duration-150"
    >
      {/* Cover thumbnail background */}
      {board.coverThumbnail && (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Lighter overlay so the thumbnail shows through more */}
          <div className="absolute inset-0 bg-white/65 dark:bg-gray-800/70" />
          {/* Bottom gradient for text contrast */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/90 dark:from-gray-800/90 to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji top-left */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Name */}
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-1 mb-2">
          {board.name}
        </h3>

        {/* Stats badges */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {itemCount > 0 && (
            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
              {itemCount} clip{itemCount !== 1 ? 's' : ''}
            </span>
          )}
          {(locationCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full">
              <MapPin size={9} />
              {locationCount}
            </span>
          )}
          {(tipCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full">
              <Lightbulb size={9} />
              {tipCount}
            </span>
          )}
        </div>

        {/* Delete button bottom-right */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute bottom-3 right-3 p-1.5 text-gray-300 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            aria-label="Delete board"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
