'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  coverImage?: string | null;
  onClick: () => void;
  onDelete?: () => void;
}

export default function BoardCard({ board, itemCount, coverImage, onClick, onDelete }: BoardCardProps) {
  const [imgError, setImgError] = useState(false);
  const thumbnail = !imgError ? (coverImage ?? board.coverThumbnail ?? null) : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer min-h-[160px] flex flex-col transition-all duration-150"
    >
      {/* Background: cover image or indigo fallback */}
      {thumbnail ? (
        <>
          <img
            src={thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          {/* Gradient overlay so text is always readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-indigo-600" />
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4 justify-between">
        {/* Emoji top-left */}
        <div className={`text-2xl leading-none ${thumbnail ? 'drop-shadow' : ''}`}>
          {board.emoji}
        </div>

        {/* Name + count at bottom */}
        <div>
          <h3 className={`font-bold text-sm leading-snug line-clamp-1 mb-0.5 ${thumbnail ? 'text-white' : 'text-white'}`}>
            {board.name}
          </h3>
          <p className={`text-xs ${thumbnail ? 'text-white/70' : 'text-indigo-200'}`}>
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
            className="absolute bottom-3 right-3 p-1.5 text-white/60 hover:text-red-300 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Delete board"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
