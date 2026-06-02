'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Upload } from 'lucide-react';
import { getAllBoards, saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { enrichItem, enrichItemFromImage } from '@/lib/enrichItem';
import { track } from '@/lib/analytics';
import { Board, SavedItem, ImportResult } from '@/lib/types';
import { detectPlatform, PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Types ──────────────────────────────────────────────────────────────────

type Stage = 'picking' | 'saving' | 'done';

interface ImageData {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

// ─── Image helpers ───────────────────────────────────────────────────────────

function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl = "data:<mimeType>;base64,<base64>"
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.replace('data:', '').replace(';base64', '');
      resolve({ base64, mimeType, previewUrl: dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function SharePageInner() {
  const searchParams    = useSearchParams();
  const rawUrl          = searchParams.get('url') ?? '';
  const rawTitle        = searchParams.get('title') ?? '';
  const sharedTitle     = rawTitle || 'New inspiration';

  // Image mode: triggered when no URL is provided, or ?imageMode=1
  const imageMode = !rawUrl || searchParams.get('imageMode') === '1';

  const [boards, setBoards]                   = useState<Board[]>([]);
  const [stage, setStage]                     = useState<Stage>('picking');
  const [savedToName, setSavedToName]         = useState('');
  const [newBoardName, setNewBoardName]       = useState('');
  const [showNewBoardInput, setShowNewBoardInput] = useState(false);
  const [enrichedData, setEnrichedData]       = useState<ImportResult | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);

  // Image mode state
  const [imageData, setImageData]             = useState<ImageData | null>(null);
  const [isDragging, setIsDragging]           = useState(false);
  const fileInputRef                          = useRef<HTMLInputElement>(null);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getAllBoards().then((b) => setBoards(b)).catch(() => setBoards([]));
  }, []);

  // On mount: check sessionStorage for an image pre-loaded by CapacitorBridge
  useEffect(() => {
    if (!imageMode) return;
    try {
      const stored = sessionStorage.getItem('pendingShareImage');
      if (stored) {
        const parsed = JSON.parse(stored) as ImageData;
        setImageData(parsed);
        sessionStorage.removeItem('pendingShareImage');
      }
    } catch { /* ignore */ }
  }, [imageMode]);

  // Auto-dismiss when done
  useEffect(() => {
    if (stage === 'done') {
      dismissTimerRef.current = setTimeout(() => window.history.back(), 3000);
    }
    return () => { if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); };
  }, [stage]);

  // Clipboard paste handler (CMD+V)
  useEffect(() => {
    if (!imageMode) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (file) setImageData(await fileToImageData(file));
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [imageMode]);

  // Drag-over handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files).find(isImageFile);
    if (file) setImageData(await fileToImageData(file));
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isImageFile(file)) setImageData(await fileToImageData(file));
  }, []);

  const platform      = rawUrl ? detectPlatform(rawUrl) : 'other';
  const platformColor = PLATFORM_COLORS[platform];
  const platformLabel = imageMode ? 'Screenshot' : PLATFORM_LABELS[platform];

  const recentBoards = [...boards]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  // ── Save handler ─────────────────────────────────────────────────────────

  async function handleSave(selectedBoardId?: string, boardDisplayName?: string) {
    setStage('saving');

    const itemId = crypto.randomUUID();
    const itemTitle = imageMode
      ? (rawTitle || 'Travel screenshot')
      : sharedTitle;

    const item: SavedItem = {
      id: itemId,
      url: rawUrl || '',
      title: itemTitle,
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
    track('clip_saved', { platform, toBoard: !!selectedBoardId, source: imageMode ? 'image' : 'url' });

    if (selectedBoardId) {
      await addItemToBoard(selectedBoardId, itemId);
    }

    // Background enrichment — URL path or image path
    setEnrichmentLoading(true);

    const enrichPromise = imageData
      ? enrichItemFromImage(itemId, imageData.base64, imageData.mimeType, rawUrl || undefined, itemTitle)
      : enrichItem(itemId, rawUrl);

    enrichPromise.then(async (success) => {
      if (success) {
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

    await saveBoard(newBoard);
    setBoards((prev) => [newBoard, ...prev]);
    setNewBoardName('');
    setShowNewBoardInput(false);
    await handleSave(newBoard.id, `${newBoard.emoji} ${newBoard.name}`);
  }

  // ── Image upload UI ───────────────────────────────────────────────────────

  if (imageMode && !imageData && (stage === 'picking')) {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 safe-top safe-bottom">
        {/* Header */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500">
              Screenshot
            </span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Share a screenshot
          </h1>
          <p className="text-xs text-gray-400">
            Drop or paste a screenshot from Xiaohongshu, Instagram, or any travel app
          </p>
        </div>

        {/* Drop zone */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              w-full max-w-xs aspect-[4/3] rounded-2xl border-2 border-dashed
              flex flex-col items-center justify-center gap-3 cursor-pointer
              transition-all select-none
              ${isDragging
                ? 'border-indigo-400 bg-indigo-50 scale-[1.02]'
                : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}
            `}
          >
            <div className={`p-3 rounded-2xl transition-colors ${isDragging ? 'bg-indigo-100' : 'bg-white border border-gray-100'}`}>
              <Upload size={28} className={isDragging ? 'text-indigo-500' : 'text-gray-400'} />
            </div>
            <div className="text-center space-y-1 px-4">
              <p className="text-sm font-semibold text-gray-700">
                {isDragging ? 'Drop to save' : 'Drop image here'}
              </p>
              <p className="text-xs text-gray-400">
                or tap to browse · paste with ⌘V
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

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

  // ── Stage: picking ────────────────────────────────────────────────────────

  if (stage === 'picking' || stage === 'saving') {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between p-6 safe-top safe-bottom">
        {/* Top section */}
        <div className="space-y-2 pt-4">
          {/* Image preview (image mode) */}
          {imageMode && imageData && (
            <div className="relative w-full rounded-xl overflow-hidden mb-3 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageData.previewUrl}
                alt="Screenshot preview"
                className="w-full max-h-40 object-cover"
              />
              <button
                type="button"
                onClick={() => setImageData(null)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70"
              >
                ×
              </button>
            </div>
          )}

          {/* Platform chip */}
          <div className="flex items-center gap-2">
            <span
              className="text-white text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: imageMode ? '#6366f1' : platformColor }}
            >
              {platformLabel}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
            {imageMode ? (rawTitle || 'Travel screenshot') : sharedTitle}
          </h1>

          {/* URL */}
          {rawUrl && !imageMode && (
            <p className="text-xs text-gray-400 truncate">{rawUrl}</p>
          )}
        </div>

        {/* Middle section — board picker */}
        <div className="flex-1 flex flex-col justify-center py-8">
          <p className="text-sm font-medium text-gray-500 mb-3">Save to:</p>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <button
              type="button"
              disabled={stage === 'saving'}
              onClick={() => handleSave(undefined, 'Inbox')}
              className="flex-shrink-0 bg-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-full hover:bg-indigo-200 active:scale-95 transition-all disabled:opacity-50"
            >
              Inbox
            </button>

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

            <button
              type="button"
              disabled={stage === 'saving'}
              onClick={() => setShowNewBoardInput((v) => !v)}
              className="flex-shrink-0 border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium px-4 py-2 rounded-full hover:border-gray-400 hover:text-gray-600 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              + New
            </button>
          </div>

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
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNewBoardSave(); }}
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

        {/* Bottom — return button */}
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
      <div className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
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
            {imageMode ? 'Screenshot' : sharedTitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full"
        >
          {enrichmentLoading && !enrichedData ? (
            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-sm animate-pulse">
                {imageMode ? '🔍 Reading screenshot…' : '🔍 Finding locations…'}
              </span>
            </div>
          ) : enrichedData && enrichedData.locations.length > 0 ? (
            <div className="bg-indigo-50 rounded-2xl px-4 py-3 space-y-1.5">
              <p className="text-sm font-semibold text-indigo-700">
                📍 {enrichedData.locations.length} location{enrichedData.locations.length !== 1 ? 's' : ''} found
              </p>
              {enrichedData.locations.map((loc, i) => (
                <p key={i} className="text-sm text-indigo-600">{loc.name}</p>
              ))}
            </div>
          ) : enrichedData && enrichedData.locations.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-sm text-gray-500">
                {enrichedData.substance.length > 0
                  ? `${enrichedData.substance.length} tip${enrichedData.substance.length !== 1 ? 's' : ''} extracted`
                  : 'No specific locations detected'}
              </p>
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

// ─── Public export ─────────────────────────────────────────────────────────

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
