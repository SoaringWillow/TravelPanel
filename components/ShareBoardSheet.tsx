'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, X, ChevronDown } from 'lucide-react';
import { Board, SavedItem } from '@/lib/types';
import { encodeSharedBoard, buildShareUrl, buildShareText, getAnonymousId, SharedBoard } from '@/lib/shareBoard';
import { track } from '@/lib/analytics';

type ShareState = 'idle' | 'building' | 'ready' | 'copied' | 'shared';

interface ShareBoardSheetProps {
  open: boolean;
  onClose: () => void;
  board: Board;
  items: SavedItem[];
}

export default function ShareBoardSheet({ open, onClose, board, items }: ShareBoardSheetProps) {
  const [state, setState] = useState<ShareState>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [shareData, setShareData] = useState<SharedBoard | null>(null);

  const handleBuild = useCallback(async () => {
    setState('building');
    // Let the UI update before the encoding work
    await new Promise((r) => setTimeout(r, 50));
    const encoded = encodeSharedBoard(board, items);
    const referrerId = getAnonymousId();
    const url = buildShareUrl(encoded, referrerId);
    track('board_shared', { boardId: board.id, clipCount: items.length, referrerId });
    setShareUrl(url);
    const { decodeSharedBoard } = await import('@/lib/shareBoard');
    setShareData(decodeSharedBoard(encoded));
    setState('ready');
  }, [board, items]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setState('copied');
      setTimeout(() => setState('ready'), 2000);
    } catch {
      // Clipboard not available — show the URL
    }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!shareData) return;
    const text = buildShareText(shareData);
    try {
      await navigator.share({ title: `${board.emoji} ${board.name}`, text, url: shareUrl });
      setState('shared');
      setTimeout(() => setState('ready'), 1500);
    } catch {
      // User cancelled or share not available — fall back to copy
      handleCopy();
    }
  }, [shareData, board, shareUrl, handleCopy]);

  function handleClose() {
    setState('idle');
    setShareUrl('');
    setShareData(null);
    onClose();
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[2000]"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-white rounded-t-3xl shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-5 pb-8 pt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Share Board</h2>
                  <p className="text-sm text-gray-500">
                    {board.emoji} {board.name} · {items.length} clip{items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>

              {state === 'idle' && (
                <>
                  {/* Preview of what will be shared */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2">What gets shared:</p>
                    <div className="space-y-1">
                      {items.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <span className="text-xs mt-0.5">📍</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 line-clamp-1">{item.title}</p>
                            {item.substance && item.substance.length > 0 && (
                              <p className="text-[11px] text-gray-400 line-clamp-1">
                                💡 {item.substance[0].content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {items.length > 4 && (
                        <p className="text-xs text-gray-400 pl-5">+{items.length - 4} more clips</p>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">
                      Note: thumbnails are not included in shared links to keep them compact.
                    </p>
                  </div>

                  <button
                    onClick={handleBuild}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
                  >
                    <Share2 size={18} />
                    Generate Share Link
                  </button>
                </>
              )}

              {state === 'building' && (
                <div className="flex items-center justify-center py-8 gap-3 text-indigo-600">
                  <motion.div
                    className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-sm font-medium">Building share link…</span>
                </div>
              )}

              {(state === 'ready' || state === 'copied' || state === 'shared') && (
                <div className="space-y-3">
                  {/* Link display */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Share link</p>
                    <p className="text-xs text-gray-700 break-all font-mono leading-relaxed line-clamp-3">
                      {shareUrl}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all ${
                        state === 'copied'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {state === 'copied' ? <Check size={16} /> : <Copy size={16} />}
                      {state === 'copied' ? 'Copied!' : 'Copy link'}
                    </button>

                    {'share' in navigator && (
                      <button
                        onClick={handleNativeShare}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
                      >
                        <Share2 size={16} />
                        {state === 'shared' ? 'Shared!' : 'Share…'}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    Recipients can view and import this board into their TravelPanel
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
