'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Copy } from 'lucide-react';
import { getAllBoards, getAllItems, saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { track } from '@/lib/analytics';
import { Board, SavedItem, ImportResult } from '@/lib/types';
import { detectPlatform, PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import { hapticSuccess, hapticImpact, hapticWarning } from '@/lib/haptics';

// ─── Types ──────────────────────────────────────────────────────────────────

type Stage = 'picking' | 'saving' | 'done' | 'duplicate';

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function SharePageInner() {
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const rawUrl          = searchParams.get('url') ?? '';
  const rawTitle        = searchParams.get('title') ?? '';
  const hasImage        = searchParams.get('hasImage') === 'true';
  const sharedTitle     = rawTitle || 'New inspiration';

  // Retrieve image data written by CapacitorBridge from the native share payload.
  // The image is stored as a base64 JPEG data URL in sessionStorage so it doesn't
  // bloat the URL. We read it once and clear it to avoid stale data.
  const [sharedImageUrl, setSharedImageUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!hasImage) return;
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('pendingShareImage') : null;
    if (stored) {
      setSharedImageUrl(stored);
      sessionStorage.removeItem('pendingShareImage');
    }
  }, [hasImage]);

  const [boards, setBoards]                   = useState<Board[]>([]);
  const [stage, setStage]                     = useState<Stage>('picking');
  const [savedToName, setSavedToName]         = useState('');
  const [newBoardName, setNewBoardName]       = useState('');
  const [showNewBoardInput, setShowNewBoardInput] = useState(false);
  const [enrichedData, setEnrichedData]       = useState<ImportResult | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [duplicateItem, setDuplicateItem]     = useState<SavedItem | null>(null);
  const pendingSaveRef = useRef<{ boardId?: string; boardName?: string } | null>(null);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load boards on mount — no heavy work, just IndexedDB
  useEffect(() => {
    getAllBoards().then((b) => setBoards(b)).catch(() => setBoards([]));
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

  async function handleSave(selectedBoardId?: string, boardDisplayName?: string, skipDuplicateCheck = false) {
    if (!skipDuplicateCheck && rawUrl) {
      const existing = await getAllItems();
      const dup = existing.find((i) => i.url === rawUrl && !i.isDemo);
      if (dup) {
        setDuplicateItem(dup);
        pendingSaveRef.current = { boardId: selectedBoardId, boardName: boardDisplayName };
        track('duplicate_detected', { platform });
        setStage('duplicate');
        return;
      }
    }

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

    // Background enrichment — pass image URL for vision extraction (Xiaohongshu etc.)
    setEnrichmentLoading(true);
    enrichItem(itemId, rawUrl, sharedImageUrl)
      .then(async (success) => {
        if (!success) hapticWarning();
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

    hapticSuccess();
    setSavedToName(boardDisplayName ?? 'Inbox');
    setStage('done');
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
    await handleSave(newBoard.id, `${newBoard.emoji} ${newBoard.name}`, false);
  }

  // ── Stage: duplicate ─────────────────────────────────────────────────────

  if (stage === 'duplicate' && duplicateItem) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between p-6 safe-top safe-bottom">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10">
          <div className="text-5xl">🔁</div>
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-gray-900">Already saved!</p>
            <p className="text-sm text-gray-500 max-w-xs">
              You already have this clip in your TravelPanel.
            </p>
          </div>

          <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-semibold text-gray-800 line-clamp-2">{duplicateItem.title || sharedTitle}</p>
            {duplicateItem.boardId && (
              <p className="text-xs text-gray-500">
                Saved to board
              </p>
            )}
            {duplicateItem.locations.length > 0 && (
              <p className="text-xs text-indigo-600">
                📍 {duplicateItem.locations.length} location{duplicateItem.locations.length !== 1 ? 's' : ''} extracted
              </p>
            )}
          </div>

          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={() => {
                const loc = duplicateItem.locations[0];
                if (loc) {
                  router.push(`/?flyTo=${loc.lat},${loc.lng}&itemId=${duplicateItem.id}`);
                } else {
                  router.push('/inbox');
                }
              }}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              View existing clip →
            </button>
            <button
              type="button"
              onClick={() => {
                const { boardId, boardName } = pendingSaveRef.current ?? {};
                handleSave(boardId, boardName, true);
              }}
              className="w-full py-3 rounded-2xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy size={14} />
              Save again anyway
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage: picking ────────────────────────────────────────────────────────

  if (stage === 'picking' || stage === 'saving') {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between p-6 safe-top safe-bottom">
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
              onClick={() => { hapticImpact(); handleSave(undefined, 'Inbox'); }}
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
                onClick={() => { hapticImpact(); handleSave(board.id, `${board.emoji} ${board.name}`); }}
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

  // ── Stage: done ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 safe-top safe-bottom">
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
          <p className="text-xl font-bold text-gray-900">
            ✅ Saved to {savedToName}!
          </p>
          <p className="text-sm text-gray-500">
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
            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-sm animate-pulse">🔍 Finding locations…</span>
            </div>
          ) : enrichedData && enrichedData.locations.length > 0 ? (
            <div className="bg-indigo-50 rounded-2xl px-4 py-3 space-y-1.5">
              <p className="text-sm font-semibold text-indigo-700">
                📍 {enrichedData.locations.length} location{enrichedData.locations.length !== 1 ? 's' : ''} found
              </p>
              {enrichedData.locations.map((loc, i) => (
                <p key={i} className="text-sm text-indigo-600">
                  {loc.name}
                </p>
              ))}
            </div>
          ) : enrichedData && enrichedData.locations.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-sm text-gray-500">No specific locations detected</p>
            </div>
          ) : null}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-gray-400"
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
        className="w-full py-3 rounded-2xl border-2 border-indigo-300 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5"
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
