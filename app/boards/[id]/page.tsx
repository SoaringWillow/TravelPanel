'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Pencil, Check } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Gradient palette (matches BoardCard) ─────────────────────────────────────

const GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-pink-400 to-rose-500',
  'from-fuchsia-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-emerald-500',
];

function boardGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard, renameBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [coverImgError, setCoverImgError] = useState(false);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const coverThumbnail = boardItems.find((i) => i.thumbnail)?.thumbnail;
  const showCoverImage = !!coverThumbnail && !coverImgError;
  const gradient = board ? boardGradient(board.id) : GRADIENTS[0];

  const hasLocations = boardItems.some((item) => item.locations && item.locations.length > 0);
  const loading = boardsLoading || itemsLoading;

  // Sync name value when board loads
  useEffect(() => {
    if (board) setNameValue(board.name);
  }, [board?.name]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  function handleViewOnMap(id: string) {
    const item = boardItems.find((i) => i.id === id);
    if (item && item.locations.length > 0) setFlyTo(item.locations[0]);
  }

  async function handleDelete(id: string) {
    if (board) await removeItemFromBoard(board.id, id);
    await removeItem(id);
  }

  const handleSaveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (trimmed && board && trimmed !== board.name) {
      await renameBoard(board.id, trimmed);
    } else if (board) {
      setNameValue(board.name);
    }
    setEditingName(false);
  }, [nameValue, board, renameBoard]);

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
      {/* ── Cover header ── */}
      <div className="relative flex-shrink-0" style={{ height: 200 }}>
        {showCoverImage ? (
          <img
            src={coverThumbnail}
            alt={board.name}
            className="w-full h-full object-cover"
            onError={() => setCoverImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-7xl leading-none drop-shadow-sm select-none">{board.emoji}</span>
          </div>
        )}

        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-12 left-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-xl backdrop-blur-sm transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Board name + edit at bottom of cover */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setNameValue(board.name); setEditingName(false); } }}
                className="flex-1 bg-white/20 backdrop-blur-md text-white text-xl font-bold rounded-lg px-3 py-1.5 outline-none border border-white/40 placeholder:text-white/60"
                maxLength={60}
              />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSaveName(); }}
                className="p-2 bg-white/20 text-white rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                {showCoverImage && (
                  <span className="text-2xl leading-none drop-shadow-sm">{board.emoji}</span>
                )}
                <h1 className="text-white text-xl font-bold leading-tight drop-shadow-sm mt-0.5 truncate">
                  {board.name}
                </h1>
                <p className="text-white/70 text-xs mt-0.5">
                  {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="flex-shrink-0 p-2 bg-black/30 text-white/80 hover:text-white rounded-xl backdrop-blur-sm hover:bg-black/50 transition-colors mb-0.5"
                aria-label="Rename board"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Map section */}
        {hasLocations && (
          <div className="relative w-full bg-gray-200" style={{ height: 'min(200px, 30vh)' }}>
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
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MapPin className="text-gray-300 mb-3" size={40} />
              <p className="text-sm font-medium text-gray-600 mb-1">No places saved to this board yet.</p>
              <p className="text-sm text-gray-400">Go to Inbox to move clips here.</p>
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
