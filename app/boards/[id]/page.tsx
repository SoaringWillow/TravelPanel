'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Share2 } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location, SubstanceType } from '@/lib/types';
import { shareBoardNative } from '@/lib/shareBoard';
import InboxCard from '@/components/InboxCard';
import SwipeableCard from '@/components/SwipeableCard';
import SubstanceList from '@/components/SubstanceList';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'places' | 'wisdom'>('places');
  const [substanceFilter, setSubstanceFilter] = useState<'all' | SubstanceType>('all');

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

  async function handleShare() {
    if (!board) return;
    try {
      await shareBoardNative(board.id, board.name);
    } catch (err) {
      console.error('Share failed:', err);
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

          <button
            type="button"
            onClick={handleShare}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex-shrink-0"
            aria-label="Share board"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

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

        {/* Tab toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mx-4 mt-3">
          {(['places', 'wisdom'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'places' ? `🗺 Places` : `💡 Wisdom`}
            </button>
          ))}
        </div>

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

          {/* Places tab */}
          {activeTab === 'places' && (
            <>
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
                    <SwipeableCard
                      key={item.id}
                      onDelete={() => handleDelete(item.id)}
                    >
                      <InboxCard
                        item={item}
                        onDelete={handleDelete}
                        onViewOnMap={handleViewOnMap}
                      />
                    </SwipeableCard>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Wisdom tab */}
          {activeTab === 'wisdom' && (() => {
            const TYPE_ORDER: SubstanceType[] = ['warning', 'tip', 'recommendation', 'wisdom', 'opinion', 'context'];
            const allSubstance = boardItems.flatMap((item) =>
              (item.substance ?? []).map((s) => ({ ...s, sourceTitle: item.title || item.url }))
            );
            const filtered = substanceFilter === 'all'
              ? allSubstance
              : allSubstance.filter((s) => s.type === substanceFilter);
            const sorted = [...filtered].sort(
              (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
            );
            const typesPresent = Array.from(new Set(allSubstance.map((s) => s.type)));

            if (allSubstance.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <span className="text-4xl mb-3">🧠</span>
                  <p className="text-sm font-medium text-gray-600 mb-1">No wisdom extracted yet.</p>
                  <p className="text-sm text-gray-400">Add more clips to unlock insights.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {/* Filter pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                  {(['all', ...typesPresent] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSubstanceFilter(f as 'all' | SubstanceType)}
                      className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all capitalize ${
                        substanceFilter === f
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {f === 'all' ? `All (${allSubstance.length})` : f}
                    </button>
                  ))}
                </div>

                {/* Substance items */}
                {sorted.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <SubstanceList items={[s]} showHeader={false} />
                    <p className="text-[10px] text-gray-400 pl-1">
                      from: {s.sourceTitle}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}
