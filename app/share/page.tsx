'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { getAllBoards, saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { track } from '@/lib/analytics';
import { notification } from '@/lib/haptics';
import { Board, SavedItem, ImportResult } from '@/lib/types';
import { detectPlatform, PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

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
  const capturedImageRef = useRef<string | undefined>(undefined);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load boards on mount — no heavy work, just IndexedDB
  useEffect(() => {
    getAllBoards().then((b) => setBoards(b)).catch(() => setBoards([]));
    // Consume screenshot forwarded by the iOS Share Extension via CapacitorBridge
    try {
      const img = sessionStorage.getItem('pendingShareImage');
      if (img) {
        capturedImageRef.current = img;
        sessionStorage.removeItem('pendingShareImage');
      }
    } catch { /* sessionStorage unavailable (e.g. private browsing restrictions) */ }
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

    // Background enrichment — pass screenshot if available (enables Claude Vision for Xiaohongshu)
    setEnrichmentLoading(true);
    enrichItem(itemId, rawUrl, capturedImageRef.current)
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
    notification('success');
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

  // Parse domain for the URL preview card
  let previewDomain = '';
  let previewPath = '';
  try {
    const parsed = new URL(rawUrl);
    previewDomain = parsed.hostname.replace(/^www\./, '');
    previewPath = parsed.pathname.length > 1 ? parsed.pathname.slice(0, 40) + (parsed.pathname.length > 40 ? '…' : '') : '';
  } catch { /* bad URL — leave empty */ }

  if (stage === 'picking' || stage === 'saving') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col justify-between p-6 safe-top safe-bottom">
        {/* URL preview card */}
        <div className="pt-4">
          <div className="border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl p-4 space-y-2">
            {/* Platform badge */}
            <span
              className="text-white text-xs font-semibold px-3 py-1 rounded-full inline-block"
              style={{ backgroundColor: platformColor }}
            >
              {platformLabel}
            </span>

            {/* Title */}
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
              {sharedTitle !== 'New inspiration' ? sharedTitle : previewDomain || 'New clip'}
            </h1>

            {/* Domain + path */}
            {previewDomain && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                {previewDomain}{previewPath}
              </p>
            )}
          </div>
        </div>

        {/* Middle section — board picker */}
        <div className="flex-1 flex flex-col justify-center py-8">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Save to:</p>

          {/* Horizontally scrollable chip row */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {/* Inbox chip */}
            <button
              type="button"
              disabled={stage === 'saving'}
              onClick={() => handleSave(undefined, 'Inbox')}
              className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold px-4 py-2 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/60 active:scale-95 transition-all disabled:opacity-50"
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
                className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {board.emoji} {board.name}
              </button>
            ))}

            {/* + New chip */}
            <button
              type="button"
              disabled={stage === 'saving'}
              onClick={() => setShowNewBoardInput((v) => !v)}
              className="flex-shrink-0 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium px-4 py-2 rounded-full hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-600 dark:hover:text-gray-300 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
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
                    className="flex-1 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none transition-colors"
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
          className="w-full py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-center gap-1.5"
        >
          Return to app
          <ChevronRight size={15} />
        </button>
      </div>
    );
  }

  // ── Stage: done ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col justify-between p-6 safe-top safe-bottom">
      {/* Success content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
        {/* Animated green checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 0.05 }}
        >
          <CheckCircle2 size={72} className="text-green-500" strokeWidth={1.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-1"
        >
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            ✅ Saved to {savedToName}!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sharedTitle}
          </p>
        </motion.div>

        {/* Enrichment result */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full"
        >
          {enrichmentLoading && !enrichedData ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 animate-pulse">🔍 Finding locations…</span>
            </div>
          ) : enrichedData && enrichedData.locations.length > 0 ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl px-4 py-3 space-y-1.5">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                📍 {enrichedData.locations.length} location{enrichedData.locations.length !== 1 ? 's' : ''} found
              </p>
              {enrichedData.locations.map((loc, i) => (
                <p key={i} className="text-sm text-indigo-600 dark:text-indigo-400">
                  {loc.name}
                </p>
              ))}
            </div>
          ) : enrichedData && enrichedData.locations.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">No specific locations detected</p>
            </div>
          ) : null}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-gray-400 dark:text-gray-500"
        >
          Returning automatically in a few seconds…
        </motion.p>
      </div>

      {/* Bottom — return button */}
      <button
        type="button"
        onClick={() => {
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          window.history.back();
        }}
        className="w-full py-3 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center gap-1.5"
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
        <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
          <div className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">Loading…</div>
        </div>
      }
    >
      <SharePageInner />
    </Suspense>
  );
}
