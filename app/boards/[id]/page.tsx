'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Share2, Download, Link as LinkIcon, X, Sparkles } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import { buildSharePayload, downloadBoardFile, encodeShareLink } from '@/lib/shareBoard';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo]       = useState<Location | undefined>(undefined);
  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState<string | null | undefined>(undefined);
  const [copied, setCopied]       = useState(false);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const hasLocations = boardItems.some((item) => item.locations && item.locations.length > 0);

  // Detect dominant city for smart nudge copy
  const cityFreq: Record<string, number> = {};
  for (const item of boardItems) {
    for (const loc of item.locations) {
      const parts = loc.name.split(',');
      const city = (parts[parts.length > 1 ? parts.length - 2 : 0] ?? loc.name).trim();
      if (city) cityFreq[city] = (cityFreq[city] ?? 0) + 1;
    }
  }
  const dominantCity = Object.entries(cityFreq).sort((a, b) => b[1] - a[1])[0]?.[0];

  const tripNudgeKey = `tripNudgeDismissed-${boardId}-${new Date().toISOString().slice(0, 10)}`;
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const showTripNudge =
    boardItems.length >= 5 &&
    hasLocations &&
    !nudgeDismissed &&
    typeof window !== 'undefined' &&
    !localStorage.getItem(tripNudgeKey);

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

  async function handleShare() {
    if (!board) return;
    const payload  = await buildSharePayload(board, boardItems);
    const baseUrl  = typeof window !== 'undefined' ? window.location.origin : '';
    const link     = encodeShareLink(payload, baseUrl);
    setShareLink(link); // null = too large for URL
    setShowShare(true);
  }

  async function handleDownload() {
    if (!board) return;
    const payload = await buildSharePayload(board, boardItems);
    downloadBoardFile(payload);
  }

  async function handleCopyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — show the link for manual copy
    }
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

          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>

          {boardItems.length > 0 && (
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              aria-label="Share board"
              title="Share board"
            >
              <Share2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <div
          className="fixed inset-0 z-[2000] bg-black/50 flex items-end"
          onClick={() => setShowShare(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-6 pb-10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Share "{board?.name}"</h2>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-500">
              {boardItems.length} clip{boardItems.length !== 1 ? 's' : ''} will be shared.
              Recipients import into their own TravelPanel.
            </p>

            {/* Copy link */}
            {shareLink !== null && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <LinkIcon size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {copied ? 'Copied!' : 'Copy share link'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {shareLink ? shareLink.slice(0, 55) + '…' : ''}
                  </p>
                </div>
              </button>
            )}

            {/* Too large notice */}
            {shareLink === null && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                This board is too large for a URL link — use file export instead.
              </div>
            )}

            {/* Download file */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Download size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Save as file</p>
                <p className="text-xs text-gray-400">Downloads a .tpboard file to share</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-24">
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

          {/* Smart trip nudge — shown when 5+ items saved */}
          {showTripNudge && (
            <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-indigo-900">
                  {dominantCity
                    ? `You have ${boardItems.length} places saved in ${dominantCity} — enough for a great trip!`
                    : `You have ${boardItems.length} saved places — enough for a great trip!`}
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/plan/${boardId}`)}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Generate itinerary →
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(tripNudgeKey, '1');
                  setNudgeDismissed(true);
                }}
                className="p-1 text-indigo-300 hover:text-indigo-500 rounded-lg transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Items grid */}
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MapPin className="text-gray-300 mb-3" size={40} />
              <p className="text-sm font-medium text-gray-600 mb-1">
                No places saved to this board yet.
              </p>
              <p className="text-sm text-gray-400">
                Go to Inbox to add items.
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
