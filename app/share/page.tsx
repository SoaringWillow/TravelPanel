'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { getAllBoards, saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { track } from '@/lib/analytics';
import { Board, SavedItem, ImportResult } from '@/lib/types';
import { detectPlatform, PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import { mediumTap, successVibration } from '@/lib/haptics';

// ─── Types ──────────────────────────────────────────────────────────────────

type Stage = 'picking' | 'saving' | 'done';

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function SharePageInner() {
  const searchParams    = useSearchParams();
  const rawUrl          = searchParams.get('url') ?? '';
  const rawTitle        = searchParams.get('title') ?? '';
  const sharedTitle     = rawTitle || 'New inspiration';

  const [boards, setBoards]                   = useState<Board[]>([]);
  const [stage, setStage]                     = useState<Stage>('picking');
  const [savedToName, setSavedToName]         = useState('');
  const [newBoardName, setNewBoardName]       = useState('');
  const [showNewBoardInput, setShowNewBoardInput] = useState(false);
  const [enrichedData, setEnrichedData]       = useState<ImportResult | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);

  // Screenshot passed by the iOS Share Extension (stored in sessionStorage by CapacitorBridge).
  // Retrieved once on mount so it's available when handleSave fires.
  const pendingImageRef = useRef<string | undefined>(undefined);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load boards on mount — no heavy work, just IndexedDB
  useEffect(() => {
    getAllBoards().then((b) => setBoards(b)).catch(() => setBoards([]));
  }, []);

  // Drain the screenshot from sessionStorage once (CapacitorBridge puts it there)
  useEffect(() => {
    try {
      const img = sessionStorage.getItem('pendingShareImage');
      if (img) {
        pendingImageRef.current = img;
        sessionStorage.removeItem('pendingShareImage');
      }
    } catch { /* sessionStorage unavailable */ }
  }, []);

  // Auto-dismiss when done
  useEffect(() => {
    if (stage === 'done') {
      dismissTimerRef.current = setTimeout(() => {
        window.history.back();
      }, 3000);
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [stage]);

  const platform     = rawUrl ? detectPlatform(rawUrl) : 'other';
  const platformColor = PLATFORM_COLORS[platform];
  const platformLabel = PLATFORM_LABELS[platform];

  // Most-recently-updated 5 boards for quick-pick
  const recentBoards = [...boards]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  // ── Save handler ─────────────────────────────────────────────────────────

  async function handleSave(selectedBoardId?: string, boardDisplayName?: string) {
    mediumTap();
    setStage('saving');

    const itemId = crypto.randomUUID();
    const item: SavedItem = {
      id: itemId,
      url: rawUrl,
      title: sharedTitle,
      platform,
      description: '',
      thumbnail: undefined,
      locations: [],
      activities: [],
      tags: [],
      substance: [],
      savedAt: Date.now(),
      enrichmentStatus: 'pending',
      retryCount: 0,
      boardId: selectedBoardId,
    };

    await saveItem(item);
    track('clip_saved', { platform, toBoard: !!selectedBoardId });

    if (selectedBoardId) {
      await addItemToBoard(selectedBoardId, itemId);
    }

    // Background enrichment (pass screenshot when available — unlocks Claude Vision for
    // Xiaohongshu and other anti-scraping platforms that block text fetching)
    setEnrichmentLoading(true);
    enrichItem(itemId, rawUrl, pendingImageRef.current)
      .then(async (success) => {
        if (success) {
          // Read back the enriched data to show location count in the done UI
          const { getItemById } = await import('@/lib/db');
          const updated = await getItemById(itemId);
          if (updated) {
            setEnrichedData({
              platform: updated.platform,
              title: updated.title,
              description: updated.description,
              thumbnail: updated.thumbnail,
              locations: updated.locations,
              activities: updated.activities,
              tags: updated.tags,
              substance: updated.substance,
            } as ImportResult);
          }
        }
        setEnrichmentLoading(false);
      });

    setSavedToName(boardDisplayName ?? 'Inbox');
    setStage('done');
    successVibration();
  }

  // ── Create new board + save ───────────────────────────────────────────────

  async function handleNewBoardSave() {
    const name = newBoardName.trim();
    if (!name) return;

    const newBoard: Board = {
      id: crypto.randomUUID(),
      name,
      emoji: '🗺',
      itemIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Persist the board first, then let handleSave create + save the item
    await saveBoard(newBoard);
    setBoards((prev) => [newBoard, ...prev]);
    setNewBoardName('');
    setShowNewBoardInput(false);
    await handleSave(newBoard.id, `${newBoard.emoji} ${newBoard.name}`);
  }

  // ── Stage: picking ────────────────────────────────────────────────────────

  if (stage === 'picking' || stage === 'saving') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col justify-between p-6 safe-top safe-bottom">
        {/* Top section */}
        <div className="space-y-2 pt-4">
          {/* Platform chip */}
          <div className="flex items-center gap-2">
            <span
              className="text-white text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: platformColor }}
            >
              {platformLabel}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
            {sharedTitle}
          </h1>

          {/* URL */}
          {rawUrl && (
            <p className="text-xs text-gray-400 truncate">{rawUrl}</p>
          )}
        </div>

        {/* Middle section — board picker */}
        <div className="flex-1 flex flex-col justify-center py-8">
          <p className="text-sm font-medium text-gray-500 mb-3">Save to:</p>

          {/* Horizontally scrollable chip row */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {/* Inbox chip */}
            <button
              type="button"
              disabled={stage === 'saving'}
              onClick={() => handleSave(undefined, 'Inbox')}
              className="flex-shrink-0 bg-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-full hover:bg-indigo-200 active:scale-95 transition-all disabled:opacity-50"
            >
              Inbox
            </button>

            {/* Recent board chips */}
            {recentBoards.map((board) => (
              <button
                key={board.id}
                type="button"
                disabled={stage === 'saving'}
                onClick={() => handleSave(board.id, `${board.emoji} ${board.name}`)}
                className="flex-shrink-0 bg-gray-100 text-gray-700 text-sm font-semibold px-4 py-2 rounded-full hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {board.emoji} {board.name}
              </button>
            ))}

            {/* + New chip */}
            <button
              type="button"
              disabled={stage === 'saving'}
              onClick={() => setShowNewBoardInput((v) => !v)}
              className="flex-shrink-0 border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium px-4 py-2 rounded-full hover:border-gray-400 hover:text-gray-600 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              + New
            </button>
          </div>

          {/* New board input */}
          <AnimatePresence>
            {showNewBoardInput && (
              <motion.div
                key="new-board-input"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNewBoardSave();
                    }}
                    placeholder="Board name…"
                    autoFocus
                    autoCapitalize="words"
                    enterKeyHint="done"
                    className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleNewBoardSave}
                    disabled={!newBoardName.trim() || stage === 'saving'}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom — return button (ghost) */}
        <button
          type="button"
          onClick={() => window.history.back()}
          className="w-full py-3 rounded-2xl border-2 border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
        >
          Return to app
          <ChevronRight size={15} />
        </button>
      </div>
    );
  }

  // ── Stage: done — confetti + animated checkmark ──────────────────────────

  // Fire confetti once when the success screen mounts
  useEffect(() => {
    let cancelled = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#6366f1', '#4ade80', '#f59e0b', '#ec4899'],
        disableForReducedMotion: true,
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const substanceCount = enrichedData?.substance?.length ?? 0;
  const locationCount  = enrichedData?.locations?.length ?? 0;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 safe-top safe-bottom">
      {/* Success content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">

        {/* Animated SVG checkmark with pulsing ring */}
        <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
          {/* Pulsing background ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-green-100"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0, 0.9] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Check circle */}
          <motion.svg
            width={80} height={80} viewBox="0 0 80 80"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.05 }}
          >
            {/* Circle */}
            <motion.circle
              cx="40" cy="40" r="36"
              fill="none" stroke="#22c55e" strokeWidth="3"
              strokeDasharray="226"
              initial={{ strokeDashoffset: 226 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            />
            {/* Checkmark */}
            <motion.polyline
              points="24,40 35,52 56,28"
              fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="50"
              initial={{ strokeDashoffset: 50 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.45 }}
            />
          </motion.svg>
        </div>

        {/* Saved to board text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-1"
        >
          <p className="text-2xl font-bold text-gray-900">
            Saved to {savedToName}!
          </p>
          <p className="text-sm text-gray-500 line-clamp-2 max-w-xs mx-auto">
            {sharedTitle}
          </p>
        </motion.div>

        {/* AI extraction results */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full space-y-2"
        >
          {enrichmentLoading && !enrichedData ? (
            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <span className="text-sm text-gray-500">Extracting locations & tips…</span>
            </div>
          ) : enrichedData ? (
            <div className="flex gap-2">
              {locationCount > 0 && (
                <div className="flex-1 bg-indigo-50 rounded-2xl px-3 py-3 text-center">
                  <p className="text-lg font-bold text-indigo-700">{locationCount}</p>
                  <p className="text-xs text-indigo-500 font-medium">
                    location{locationCount !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {substanceCount > 0 && (
                <div className="flex-1 bg-amber-50 rounded-2xl px-3 py-3 text-center">
                  <p className="text-lg font-bold text-amber-700">{substanceCount}</p>
                  <p className="text-xs text-amber-500 font-medium">
                    tip{substanceCount !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {locationCount === 0 && substanceCount === 0 && (
                <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">No locations detected in this post</p>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-gray-400"
        >
          Closing in a few seconds…
        </motion.p>
      </div>

      {/* Bottom — return button */}
      <button
        type="button"
        onClick={() => {
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          window.history.back();
        }}
        className="w-full py-3 rounded-2xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors active:scale-[0.98]"
      >
        Return to app →
      </button>
    </div>
  );
}

// ─── Public export — wrapped in Suspense (required for useSearchParams) ───────

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
        </div>
      }
    >
      <SharePageInner />
    </Suspense>
  );
}
