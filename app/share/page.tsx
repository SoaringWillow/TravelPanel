'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Camera, X } from 'lucide-react';
import { getAllBoards, saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { track } from '@/lib/analytics';
import { tapLight, tapMedium, tapSuccess } from '@/lib/haptics';
import { Board, SavedItem, ImportResult } from '@/lib/types';
import { detectPlatform, PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Types ──────────────────────────────────────────────────────────────────

type Stage = 'picking' | 'saving' | 'done';

const SUBSTANCE_ICONS: Record<string, string> = {
  tip:            '💡',
  warning:        '⚠️',
  opinion:        '💬',
  wisdom:         '🧠',
  context:        '🌍',
  recommendation: '⭐',
};

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
  const [capturedImage, setCapturedImage]     = useState<{ base64: string; mimeType: string } | null>(null);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef    = useRef<HTMLInputElement | null>(null);

  // Load boards on mount — no heavy work, just IndexedDB
  useEffect(() => {
    getAllBoards().then((b) => setBoards(b)).catch(() => setBoards([]));
  }, []);

  // Check sessionStorage for image pre-loaded by CapacitorBridge from iOS App Group
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pendingShareImage');
      if (stored) {
        sessionStorage.removeItem('pendingShareImage');
        const parsed = JSON.parse(stored) as { base64: string; mimeType: string };
        if (parsed.base64) setCapturedImage(parsed);
      }
    } catch {
      // sessionStorage unavailable — ignore
    }
  }, []);

  // Global paste handler — lets user paste a screenshot with ⌘V / Ctrl+V
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (stage !== 'picking') return;
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find((i) => i.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (file) compressAndSetImage(file);
  }, [stage]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  async function compressAndSetImage(file: File) {
    const base64 = await compressImageToBase64(file);
    setCapturedImage({ base64, mimeType: 'image/jpeg' });
  }

  // Auto-dismiss when done + fire confetti
  useEffect(() => {
    if (stage === 'done') {
      import('@/lib/confetti').then(({ fireConfetti }) => fireConfetti()).catch(() => {});
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
    tapMedium();
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
    track('clip_saved', { platform, toBoard: !!selectedBoardId, hasImage: !!capturedImage });

    if (selectedBoardId) {
      await addItemToBoard(selectedBoardId, itemId);
    }

    // Background enrichment — pass screenshot if available for Vision extraction
    setEnrichmentLoading(true);
    enrichItem(itemId, rawUrl, capturedImage?.base64, capturedImage?.mimeType)
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
    tapSuccess();
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
          <p className="text-sm font-medium text-gray-500 mb-3">Save to:</p>

          {/* Horizontally scrollable chip row */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {/* Inbox chip */}
            <button
              type="button"
              disabled={stage === 'saving'}
              onClick={() => { tapLight(); handleSave(undefined, 'Inbox'); }}
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
                onClick={() => { tapLight(); handleSave(board.id, `${board.emoji} ${board.name}`); }}
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

        {/* Screenshot section — helps Vision extraction for Xiaohongshu & blocked platforms */}
        <div className="w-full">
          {platform === 'xiaohongshu' && !capturedImage && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 leading-relaxed">
              ⚠️ Xiaohongshu blocks scraping — add a screenshot for better AI extraction
            </p>
          )}

          {capturedImage ? (
            <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${capturedImage.mimeType};base64,${capturedImage.base64}`}
                alt="Screenshot"
                className="w-full max-h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                aria-label="Remove screenshot"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
                <p className="text-xs text-white font-medium">📸 Screenshot added — AI will read the image</p>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) compressAndSetImage(file);
                }}
              />
              <button
                type="button"
                disabled={stage === 'saving'}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <Camera size={15} />
                Add screenshot
                <span className="text-xs ml-auto opacity-70">or paste ⌘V</span>
              </button>
            </>
          )}
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
        {/* Animated checkmark — spring pop: 0 → 1.25 → 1 */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.25, 1], opacity: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 300, delay: 0.05 }}
        >
          <CheckCircle2 size={72} className="text-indigo-500" strokeWidth={1.5} />
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
          className="w-full space-y-2"
        >
          {enrichmentLoading && !enrichedData ? (
            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-sm animate-pulse">🔍 Extracting locations & wisdom…</span>
            </div>
          ) : enrichedData ? (
            <>
              {/* Locations */}
              {enrichedData.locations.length > 0 && (
                <div className="bg-indigo-50 rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-sm font-semibold text-indigo-700">
                    📍 {enrichedData.locations.length} location{enrichedData.locations.length !== 1 ? 's' : ''} found
                  </p>
                  {enrichedData.locations.map((loc, i) => (
                    <p key={i} className="text-sm text-indigo-600">{loc.name}</p>
                  ))}
                </div>
              )}

              {/* Substance preview — show first 3 items with stagger */}
              {enrichedData.substance && enrichedData.substance.length > 0 && (
                <div className="bg-amber-50 rounded-2xl px-4 py-3 space-y-2">
                  <p className="text-sm font-semibold text-amber-800">
                    {SUBSTANCE_ICONS['wisdom']} {enrichedData.substance.length} wisdom item{enrichedData.substance.length !== 1 ? 's' : ''} extracted
                  </p>
                  {enrichedData.substance.slice(0, 3).map((s, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.1 }}
                      className="text-xs text-amber-900 leading-relaxed flex gap-1.5 items-start"
                    >
                      <span className="flex-shrink-0 mt-0.5">{SUBSTANCE_ICONS[s.type] ?? '💡'}</span>
                      {s.content}
                    </motion.p>
                  ))}
                  {enrichedData.substance.length > 3 && (
                    <p className="text-xs text-amber-600 font-medium">
                      + {enrichedData.substance.length - 3} more…
                    </p>
                  )}
                </div>
              )}

              {/* Empty state */}
              {enrichedData.locations.length === 0 && (!enrichedData.substance || enrichedData.substance.length === 0) && (
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <p className="text-sm text-gray-500">No locations or tips detected</p>
                </div>
              )}
            </>
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

// ─── Image compression helper ────────────────────────────────────────────────

async function compressImageToBase64(file: File, maxBytes = 512 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const canvas = document.createElement('canvas');
      const maxDim = 1280;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else                { width = Math.round((width * maxDim) / height);  height = maxDim; }
      }
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      let quality  = 0.82;
      let dataUrl  = canvas.toDataURL('image/jpeg', quality);
      // base64 is ~37% larger than binary — reduce quality until under limit
      while (dataUrl.length > maxBytes * 1.37 && quality > 0.3) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
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
