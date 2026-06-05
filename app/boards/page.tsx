'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import { SkeletonGrid } from '@/components/SkeletonCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { buildAutoCollections, AutoCollection } from '@/lib/autoCollect';
import { SavedItem } from '@/lib/types';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);

  const autoCollections = useMemo(() => buildAutoCollections(items), [items]);

  function getItemCount(boardId: string): number {
    const board = boards.find((b) => b.id === boardId);
    return board ? board.itemIds.length : 0;
  }

  async function handleCreate(name: string, emoji: string) {
    await createBoard(name, emoji);
  }

  async function handleDelete(id: string) {
    await removeBoard(id);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600" size={22} />
            <h1 className="text-xl font-bold text-gray-800">My Boards</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>New Board</span>
          </button>
        </div>
      </div>

      {/* First-launch demo seed banner */}
      <OnboardingSeed />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">

        {/* Auto-collections Discover section */}
        {autoCollections.length > 0 && (
          <section className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 px-0.5">
              Discover
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-0 scrollbar-hide">
              {autoCollections.map((col) => (
                <AutoCollectionChip
                  key={col.id}
                  collection={col}
                  items={items}
                  expanded={expandedCollection === col.id}
                  onToggle={() => setExpandedCollection(expandedCollection === col.id ? null : col.id)}
                  onNavigate={(boardId) => router.push(`/boards/${boardId}`)}
                />
              ))}
            </div>
          </section>
        )}

        {boardsLoading ? (
          <SkeletonGrid count={6} variant="board" />
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-6">
            <div className="text-5xl mb-4">🗺</div>
            <h3 className="font-semibold text-gray-700 mb-2">No boards yet.</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Create your first board to organise your travel ideas.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-5 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              Create a Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                itemCount={getItemCount(board.id)}
                onClick={() => router.push(`/boards/${board.id}`)}
                onDelete={() => handleDelete(board.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create board modal */}
      <CreateBoardModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <NavBar active="boards" />
    </div>
  );
}

function AutoCollectionChip({
  collection,
  items,
  expanded,
  onToggle,
}: {
  collection: AutoCollection;
  items: SavedItem[];
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (id: string) => void;
}) {
  const collectionItems = items.filter((i) => collection.itemIds.includes(i.id));

  return (
    <div className="flex-shrink-0">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-left transition-all ${
          expanded
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
        }`}
      >
        <span className="text-xl leading-none">{collection.emoji}</span>
        <div className="min-w-0">
          <p className={`text-xs font-semibold whitespace-nowrap ${expanded ? 'text-white' : 'text-gray-800'}`}>
            {collection.name}
          </p>
          <p className={`text-[10px] whitespace-nowrap ${expanded ? 'text-indigo-200' : 'text-gray-400'}`}>
            {collection.description}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {collectionItems.slice(0, 5).map((item) => (
            <div key={item.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
              <p className="text-xs font-medium text-gray-800 line-clamp-1">{item.title}</p>
              {item.locations.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  📍 {item.locations.map((l) => l.name).slice(0, 2).join(', ')}
                </p>
              )}
            </div>
          ))}
          {collectionItems.length > 5 && (
            <div className="px-4 py-2 text-center text-xs text-gray-400">
              +{collectionItems.length - 5} more clips
            </div>
          )}
        </div>
      )}
    </div>
  );
}
