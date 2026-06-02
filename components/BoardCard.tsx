'use client';

import { useRef, useState } from 'react';
import { Trash2, Camera, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Board, SavedItem } from '@/lib/types';
import { saveBoard } from '@/lib/db';

// ─── Destination color palette ────────────────────────────────────────────────

const DESTINATION_COLORS: Array<{ keywords: string[]; from: string; to: string }> = [
  { keywords: ['japan', 'tokyo', 'kyoto', 'osaka', 'sakura'], from: '#f9a8d4', to: '#ec4899' }, // cherry blossom pink
  { keywords: ['bali', 'indonesia', 'beach', 'tropical', 'island', 'hawaii'], from: '#86efac', to: '#22c55e' }, // tropical green
  { keywords: ['thailand', 'bangkok', 'phuket', 'asia'], from: '#fde68a', to: '#f59e0b' }, // warm gold
  { keywords: ['europe', 'paris', 'france', 'italy', 'rome', 'spain', 'barcelona', 'vienna', 'prague'], from: '#93c5fd', to: '#3b82f6' }, // european blue
  { keywords: ['desert', 'morocco', 'dubai', 'egypt', 'safari'], from: '#fcd34d', to: '#d97706' }, // desert sand
  { keywords: ['mountains', 'hiking', 'alps', 'trekking', 'nature'], from: '#6ee7b7', to: '#059669' }, // forest green
  { keywords: ['food', 'eat', 'restaurant', 'cafe', 'cuisine'], from: '#fdba74', to: '#ea580c' }, // food orange
  { keywords: ['culture', 'museum', 'art', 'history', 'temple'], from: '#c4b5fd', to: '#7c3aed' }, // cultural purple
  { keywords: ['winter', 'snow', 'ski', 'christmas', 'nordic'], from: '#bfdbfe', to: '#60a5fa' }, // ice blue
  { keywords: ['road', 'trip', 'drive', 'roadtrip', 'route'], from: '#d1d5db', to: '#6b7280' }, // neutral gray
];

function getBoardGradient(name: string, emoji: string): { from: string; to: string } {
  const lower = (name + ' ' + emoji).toLowerCase();
  for (const { keywords, from, to } of DESTINATION_COLORS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return { from, to };
    }
  }
  // Default: indigo gradient
  return { from: '#a5b4fc', to: '#4f46e5' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoardCardProps {
  board: Board;
  itemCount: number;
  boardItems?: SavedItem[]; // items in this board (for thumbnail picker)
  onClick: () => void;
  onDelete?: () => void;
  onBoardUpdate?: (updated: Board) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardCard({ board, itemCount, boardItems, onClick, onDelete, onBoardUpdate }: BoardCardProps) {
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gradient = getBoardGradient(board.name, board.emoji);
  const thumbnails = (boardItems ?? []).map((i) => i.thumbnail).filter(Boolean) as string[];

  function onLongPressStart() {
    if (thumbnails.length === 0) return;
    longPressTimer.current = setTimeout(() => {
      setShowCoverPicker(true);
    }, 500);
  }

  function onLongPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  async function handleSetCover(thumbnail: string | null) {
    setShowCoverPicker(false);
    const updated = { ...board, coverThumbnail: thumbnail ?? undefined, updatedAt: Date.now() };
    await saveBoard(updated);
    onBoardUpdate?.(updated);
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={!showCoverPicker ? onClick : undefined}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Background: thumbnail or destination gradient */}
      {board.coverThumbnail ? (
        <img
          src={board.coverThumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
        />
      )}

      {/* Gradient overlay — bottom 50% darkens for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Top-right delete */}
      {onDelete && !showCoverPicker && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 p-1.5 bg-black/30 text-white rounded-lg hover:bg-red-500/80 transition-colors"
          aria-label="Delete board"
        >
          <Trash2 size={12} />
        </button>
      )}

      {/* Thumbnail picker badge */}
      {thumbnails.length > 0 && !showCoverPicker && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowCoverPicker(true); }}
          className="absolute top-2 left-2 p-1.5 bg-black/30 text-white rounded-lg hover:bg-black/50 transition-colors"
          aria-label="Change cover"
          title="Change cover photo"
        >
          <Camera size={12} />
        </button>
      )}

      {/* Bottom overlay content */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5">
        <div className="flex items-end justify-between gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-snug line-clamp-1 drop-shadow">
              {board.emoji} {board.name}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {itemCount} place{itemCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Cover picker overlay */}
      <AnimatePresence>
        {showCoverPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-3 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-xs font-semibold mb-1">Choose cover</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {thumbnails.slice(0, 4).map((thumb, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSetCover(thumb)}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                    board.coverThumbnail === thumb ? 'border-white' : 'border-transparent hover:border-white/60'
                  }`}
                >
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {board.coverThumbnail && (
                <button
                  type="button"
                  onClick={() => handleSetCover(null)}
                  className="w-14 h-10 rounded-lg border-2 border-white/40 flex items-center justify-center text-white/60 text-xs hover:border-white hover:text-white transition-all"
                >
                  None
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCoverPicker(false)}
              className="text-white/60 text-xs hover:text-white transition-colors mt-1"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
