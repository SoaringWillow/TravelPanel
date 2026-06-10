'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, Share2, Check, Sparkles, RefreshCw } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';
import { encodeShareUrl } from '@/lib/shareBoard';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard, updateBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo]             = useState<Location | undefined>(undefined);
  const [copied, setCopied]           = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryAbortRef = useRef<AbortController | null>(null);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const hasLocations = boardItems.some((item) => item.locations && item.locations.length > 0);

  const loading = boardsLoading || itemsLoading;

  function handleViewOnMap(id: string) {
    const item = boardItems.find((i) => i.id === id);
    if (item && item.locations.length > 0) {
      setFlyTo(item.locations[0]);
    }
  }

  async function handleDelete(id: string) {
    if (board) {
      await removeItemFromBoard(board.id, id);
    }
    await removeItem(id);
  }

  async function handleMoveToBoard(id: string) {
    // No-op on board detail page — removal handled by handleDelete
  }

  // Load cached summary or auto-generate when board has ≥5 items and cache is stale
  useEffect(() => {
    if (!board || boardItems.length < 5) return;

    const isStale = (board.summaryItemCount ?? 0) < boardItems.length - 4;
    if (board.summary && !isStale) {
      setSummaryText(board.summary);
      return;
    }

    generateSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.id, boardItems.length]);

  async function generateSummary(force = false) {
    if (!board) return;
    if (summaryLoading) {
      summaryAbortRef.current?.abort();
    }

    setSummaryLoading(true);
    setSummaryText('');

    const ctrl = new AbortController();
    summaryAbortRef.current = ctrl;

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardName:  board.name,
          boardEmoji: board.emoji,
          items:      boardItems.map((i) => ({
            title:     i.title,
            tags:      i.tags,
            substance: i.substance,
          })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error('summarize failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setSummaryText(full);
      }

      // Cache in board record
      await updateBoard({ ...board, summary: full, summaryItemCount: boardItems.length });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setSummaryLoading(false);
      }
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleShare() {
    if (!board) return;
    const url = encodeShareUrl(board, boardItems);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
          <div className="text-5xl mb-4">🗺</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Board not found</h2>
          <p className="text-sm text-gray-500 mb-6">
            This board may have been deleted or does not exist.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-indigo-600 font-medium text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <span className="text-2xl leading-none">{board.emoji}</span>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 leading-tight truncate">
              {board.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share board"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Share2 size={18} />}
          </button>

          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* AI Summary card */}
        {boardItems.length >= 5 && (summaryText || summaryLoading) && (
          <div className="mx-4 mt-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">AI summary</span>
              </div>
              {!summaryLoading && (
                <button
                  type="button"
                  onClick={() => generateSummary(true)}
                  className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors"
                  aria-label="Regenerate summary"
                >
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
            {summaryLoading && !summaryText ? (
              <div className="space-y-1.5">
                <div className="h-3 bg-indigo-200 dark:bg-indigo-800/40 rounded animate-pulse w-full" />
                <div className="h-3 bg-indigo-200 dark:bg-indigo-800/40 rounded animate-pulse w-4/5" />
              </div>
            ) : (
              <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">
                {summaryText}
                {summaryLoading && <span className="inline-block w-1 h-3.5 bg-indigo-500 ml-0.5 animate-pulse align-text-bottom" />}
              </p>
            )}
          </div>
        )}

        {/* Map section */}
        {boardItems.length > 0 && (
          <div
            className="relative w-full bg-gray-200"
            style={{ height: 'min(240px, 35vh)' }}
          >
            <MapView
              items={boardItems}
              onPinClick={(item) => {
                if (item.locations.length > 0) setFlyTo(item.locations[0]);
              }}
              flyTo={flyTo}
            />
          </div>
        )}

        <div className="px-4 py-4">
          {/* Plan this trip CTA */}
          <div className="mb-4">
            {hasLocations ? (
              <button
                type="button"
                onClick={() => router.push(`/plan/${boardId}`)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
              >
                <Rocket size={18} />
                Plan this trip
              </button>
            ) : (
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 font-semibold py-3.5 rounded-2xl cursor-not-allowed"
                >
                  <Rocket size={18} />
                  Plan this trip
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    Add items with identified locations to plan a trip
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items grid */}
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true" className="mb-4">
                {/* Dashed card outline */}
                <rect x="12" y="12" width="56" height="56" rx="10" strokeWidth="2" strokeDasharray="5 4" className="stroke-gray-300 dark:stroke-slate-600" />
                {/* Map pin */}
                <path d="M40 28 C40 28 33 36 33 42 C33 46.4 36.1 50 40 50 C43.9 50 47 46.4 47 42 C47 36 40 28 40 28Z" strokeWidth="2" className="stroke-indigo-400 dark:stroke-indigo-500 fill-indigo-50 dark:fill-indigo-900/40" />
                <circle cx="40" cy="42" r="2.5" className="fill-indigo-400 dark:fill-indigo-500" />
              </svg>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                No clips in this board yet.
              </p>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Add clips from the Inspiration tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {boardItems.map((item) => (
                <InboxCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onViewOnMap={handleViewOnMap}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}
