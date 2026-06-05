'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  thumbnails?: string[];  // first 4 item thumbnails for the mosaic
  onClick: () => void;
  onDelete?: () => void;
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000)     return 'just now';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// 2×2 mosaic of item thumbnails
function ThumbnailMosaic({ urls }: { urls: string[] }) {
  const cells = [...urls.slice(0, 4)];
  while (cells.length < 4) cells.push('');

  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl">
      {cells.map((url, i) => (
        <div key={i} className="bg-gray-100 overflow-hidden relative">
          {url ? (
            <Image
              src={url}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="25vw"
              onError={(e) => {
                const parent = (e.currentTarget as HTMLImageElement).parentElement;
                if (parent) parent.style.background = '#f3f4f6';
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800" />
          )}
        </div>
      ))}
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/60 to-white/10 rounded-2xl" />
    </div>
  );
}

export default function BoardCard({ board, itemCount, thumbnails = [], onClick, onDelete }: BoardCardProps) {
  const hasMosaic = thumbnails.filter(Boolean).length > 0;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer flex flex-col"
      style={{ minHeight: 160 }}
    >
      {/* Background: mosaic or solid cover */}
      {hasMosaic ? (
        <ThumbnailMosaic urls={thumbnails} />
      ) : board.coverThumbnail ? (
        <>
          <Image src={board.coverThumbnail} alt="" fill unoptimized className="object-cover" sizes="50vw" />
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80" />
        </>
      ) : null}

      {/* Item count badge — top right */}
      {itemCount > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
          {itemCount}
        </div>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4 z-10">
        {/* Emoji */}
        <div className="text-3xl leading-none mb-2.5">{board.emoji}</div>

        {/* Name */}
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-2 mb-auto">
          {board.name}
        </h3>

        {/* Footer row: count + relative date */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100/80 dark:border-gray-700/80">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {itemCount} place{itemCount !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {relativeDate(board.updatedAt)}
          </p>
        </div>
      </div>

      {/* Delete button — bottom right corner, only on hover */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute bottom-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-20"
          aria-label="Delete board"
        >
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  );
}
