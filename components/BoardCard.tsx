'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onLongPress?: () => void;
}

export default function BoardCard({ board, itemCount, onClick, onLongPress }: BoardCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  function handlePointerDown() {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress?.();
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleClick() {
    if (!didLongPress.current) onClick();
  }

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
      className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer min-h-[160px] flex flex-col select-none"
    >
      {/* Cover thumbnail background */}
      {board.coverThumbnail && (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/80" />
        </>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji top-left */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Name */}
        <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-1 mb-1">
          {board.name}
        </h3>

        {/* Item count */}
        <p className="text-sm text-gray-400">
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Long-press hint dot */}
        {onLongPress && (
          <div className="absolute bottom-3 right-3 flex gap-0.5">
            {[0,1,2].map((i) => (
              <div key={i} className="w-1 h-1 bg-gray-200 rounded-full" />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
