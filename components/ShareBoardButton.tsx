'use client';

import { useState } from 'react';
import { Share2, Check, Link } from 'lucide-react';
import { Board, SavedItem } from '@/lib/types';
import { buildShareUrl } from '@/lib/shareBoard';

interface ShareBoardButtonProps {
  board: Board;
  items: SavedItem[];
}

export default function ShareBoardButton({ board, items }: ShareBoardButtonProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);

    try {
      const url = buildShareUrl(board.id, board, items);

      // Try native share sheet first (iOS/Android)
      if (navigator.share) {
        await navigator.share({
          title: `${board.emoji} ${board.name} — TravelPanel`,
          text: `Check out my ${board.name} travel board with ${items.length} places!`,
          url,
        });
        return;
      }

      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // User cancelled native share — no-op
      if (err instanceof Error && err.name === 'AbortError') return;
    } finally {
      setSharing(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
    >
      {copied ? (
        <>
          <Check size={16} className="text-green-600" />
          <span className="text-green-700">Link copied!</span>
        </>
      ) : (
        <>
          <Share2 size={16} />
          Share this board
        </>
      )}
    </button>
  );
}
