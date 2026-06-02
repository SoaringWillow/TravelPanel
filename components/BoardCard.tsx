'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board, SavedItem } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  previewItems?: SavedItem[];   // first 4 items for the mosaic
  onClick: () => void;
  onDelete?: () => void;
}

function MosaicCell({ item, platformColor }: { item?: SavedItem; platformColor: string }) {
  const [errored, setErrored] = useState(false);

  if (item?.thumbnail && !errored) {
    return (
      <img
        src={item.thumbnail}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    );
  }
  // Empty or error: platform gradient cell
  return (
    <div
      className="w-full h-full flex items-center justify-center text-lg"
      style={{ background: `${platformColor}18` }}
    />
  );
}

export default function BoardCard({ board, itemCount, previewItems = [], onClick, onDelete }: BoardCardProps) {
  // Build 4-cell mosaic — pad with undefined for empty slots
  const cells: (SavedItem | undefined)[] = [
    previewItems[0], previewItems[1], previewItems[2], previewItems[3],
  ];
  const hasThumbnails = previewItems.some(i => i.thumbnail);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer min-h-[160px] flex flex-col transition-all duration-150"
    >
      {/* Thumbnail mosaic */}
      <div className="w-full h-24 grid grid-cols-2 grid-rows-2 overflow-hidden flex-shrink-0">
        {cells.map((item, i) => (
          <MosaicCell
            key={i}
            item={item}
            platformColor="#6366f1"
          />
        ))}
        {/* Gradient overlay for text legibility */}
        {hasThumbnails && (
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/10 to-black/40 pointer-events-none" />
        )}
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-3">
        {/* Emoji + name row */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-lg leading-none">{board.emoji}</span>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-1 flex-1">
            {board.name}
          </h3>
        </div>

        {/* Item count */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Delete button */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute bottom-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete board"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
