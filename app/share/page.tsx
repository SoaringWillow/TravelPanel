'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { getAllBoards, getAllItems, saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { track } from '@/lib/analytics';
import { impact, notification } from '@/lib/haptics';
import { Board, SavedItem, ImportResult } from '@/lib/types';
import { detectPlatform, PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Types ──────────────────────────────────────────────────────────────────

type Stage = 'picking' | 'saving' | 'done';

// ─── Smart board matching ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','in','on','at','to','for','of','and','or','is','are','was',
  'be','by','from','with','this','that','it','as','your','my','our','their',
  'i','you','he','she','we','they','how','what','where','when','who','why',
  'travel','trip','visit','guide','tips','best','top','must','see','things',
  'places','spots','food','eat','do','day','days','week','year','time',
]);

function extractKeywords(text: string): string[] {
  return text
    .split(/[\s,\-|/!?#@]+/)
    .map((w) => w.replace(/[^\w一-鿿]/g, ''))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 12);
}

interface SmartMatch {
  board: Board;
  matchCount: number;
  matchedNames: string[];
}

function findSmartMatches(boards: Board[], allItems: SavedItem[], keywords: string[]): SmartMatch[] {
  if (keywords.length === 0) return [];
  const kwLower = keywords.map((k) => k.toLowerCase());

  return boards
    .map((board) => {
      const boardItems = allItems.filter((i) => i.boardId === board.id);
      let matchCount = 0;
      const matchedNames = new Set<string>();

      for (const item of boardItems) {
        for (const loc of item.locations ?? []) {
          const locLower = loc.name.toLowerCase();
          if (kwLower.some((k) => locLower.includes(k) || k.includes(locLower))) {
            matchCount++;
            matchedNames.add(loc.name);
          }
        }
        for (const tag of item.tags ?? []) {
          const tagLower = tag.toLowerCase();
          if (kwLower.some((k) => tagLower.includes(k) || k.includes(tagLower))) {
            matchCount++;
          }
        }
      }

      return { board, matchCount, matchedNames: Array.from(matchedNames) };
    })
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);
}

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
  const [pendingImageBase64, setPendingImageBase64] = useState<string | undefined>(undefined);
  const [duplicateItem, setDuplicateItem]     = useState<{ id: string; title: string; boardId?: string; boardName: string } | null>(null);
  const [smartMatches, setSmartMatches]       = useState<SmartMatch[]>([]);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load boards and check for a pending screenshot from the iOS Share Extension.
  // The Share Extension writes the post thumbnail to App Group UserDefaults as
  // "pendingShareImage" (base64 JPEG) so Claude Vision can extract data when the
  // platform (e.g. 小红书) blocks standard HTML scraping.
  useEffect(() => {
    const init = async () => {
      const [loadedBoards, allItems] = await Promise.all([
        getAllBoards().catch(() => [] as Board[]),
        getAllItems().catch(() => []),
      ]);
      setBoards(loadedBoards);

      // Smart board suggestions: match title keywords against board items
      const keywords = extractKeywords(sharedTitle);
      const matches = findSmartMatches(loadedBoards, allItems, keywords);
      if (matches.length > 0) setSmartMatches(matches);

      // Check for duplicate URL
      if (rawUrl) {
        const existing = allItems.find((i) => i.url === rawUrl);
        if (existing) {
          const board = loadedBoards.find((b) => b.id === existing.boardId);
          setDuplicateItem({
            id: existing.id,
            title: existing.title || rawUrl,
            boardId: existing.boardId,
            boardName: board ? `${board.emoji} ${board.name}` : 'Inbox',
          });
        }
      }

      // Check for pending screenshot from iOS Share Extension
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key: 'pendingShareImage' });
        if (value) {
          setPendingImageBase64(value);
          await Preferences.remove({ key: 'pendingShareImage' });
        }
      } catch {
        // Not in a Capacitor native context — no-op
      }
    };
    init();
  }, [rawUrl, sharedTitle]);

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
    impact('Medium'); // haptic: clip saved

    if (selectedBoardId) {
      await addItemToBoard(selectedBoardId, itemId);
    }

    // Background enrichment — pass image if the Share Extension captured one
    setEnrichmentLoading(true);
    enrichItem(itemId, rawUrl, pendingImageBase64)
      .then(async (success) => {
        if (success) {
          notification('Success'); // haptic: enrichment complete
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
        } else {
          notification('Warning'); // haptic: enrichment failed/rate-limited
        }
        setEnrichmentLoading(false);
      });

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
    await handleSave(newBoard.id, `${newBoard.emoji} ${newBoard.name}`);
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
          {/* Duplicate warning */}
          <AnimatePresence>
            {duplicateItem && (
              <motion.div
                key="dup"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5"
              >
                <p className="text-sm font-semibold text-amber-800 mb-0.5">📎 Already in your collection</p>
                <p className="text-sm text-amber-700 line-clamp-2 mb-1 leading-snug">{duplicateItem.title}</p>
                <p className="text-xs text-amber-600 mb-3">Saved to {duplicateItem.boardName}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const path = duplicateItem.boardId ? `/boards/${duplicateItem.boardId}` : '/inbox';
                      window.location.href = path;
                    }}
                    className="flex-1 bg-amber-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-amber-700 active:scale-95 transition-all"
                  >
                    View clip
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateItem(null)}
                    className="flex-1 bg-white border border-amber-300 text-amber-700 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-amber-50 active:scale-95 transition-all"
                  >
                    Save again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart board suggestion */}
          <AnimatePresence>
            {smartMatches.length > 0 && !duplicateItem && (
              <motion.div
                key="smart"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mb-4"
              >
                <p className="text-xs font-medium text-indigo-500 mb-2">Best match:</p>
                <button
                  type="button"
                  disabled={stage === 'saving'}
                  onClick={() => handleSave(
                    smartMatches[0].board.id,
                    `${smartMatches[0].board.emoji} ${smartMatches[0].board.name}`
                  )}
                  className="w-full flex items-center gap-3 bg-indigo-50 border-2 border-indigo-200 text-indigo-800 text-sm font-semibold px-4 py-3 rounded-2xl hover:bg-indigo-100 active:scale-95 transition-all disabled:opacity-50 text-left"
                >
                  <span className="text-xl">{smartMatches[0].board.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{smartMatches[0].board.name}</p>
                    {smartMatches[0].matchedNames.length > 0 && (
                      <p className="text-xs text-indigo-500 font-normal truncate">
                        {smartMatches[0].matchedNames.slice(0, 2).join(', ')} clips
                      </p>
                    )}
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
