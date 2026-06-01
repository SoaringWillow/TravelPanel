'use client';

import { useState } from 'react';
import { Share2, Check, QrCode } from 'lucide-react';
import { Board, SavedItem } from '@/lib/types';
import { buildShareUrl } from '@/lib/shareBoard';
import QRModal from './QRModal';

interface ShareBoardButtonProps {
  board: Board;
  items: SavedItem[];
}

export default function ShareBoardButton({ board, items }: ShareBoardButtonProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = buildShareUrl(board.id, board, items);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);

    try {
      // Try native share sheet first (iOS/Android)
      if (navigator.share) {
        await navigator.share({
          title: `${board.emoji} ${board.name} — TravelPanel`,
          text: `Check out my ${board.name} travel board with ${items.length} places!`,
          url: shareUrl,
        });
        return;
      }

      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    } finally {
      setSharing(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <>
      <div className="flex gap-2">
        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {copied ? (
            <>
              <Check size={16} className="text-green-600" />
              <span className="text-green-700 dark:text-green-400">Link copied!</span>
            </>
          ) : (
            <>
              <Share2 size={16} />
              Share board
            </>
          )}
        </button>

        {/* QR code button */}
        <button
          type="button"
          onClick={() => setShowQR(true)}
          className="flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all"
          aria-label="Show QR code"
        >
          <QrCode size={18} />
        </button>
      </div>

      {showQR && (
        <QRModal
          url={shareUrl}
          title={`${board.emoji} ${board.name}`}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}
