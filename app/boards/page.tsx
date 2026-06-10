'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { BoardsSkeleton } from '@/components/SkeletonCard';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, renameBoard, refresh } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pullState = usePullToRefresh(scrollRef, refresh);

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

  async function handleRename(id: string, name: string) {
    await renameBoard(id, name);
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
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Pull-to-refresh indicator */}
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
          style={{
            top: 0,
            transform: `translateY(${pullState.distance - 44}px)`,
            opacity: Math.min(pullState.distance / 48, 1),
            transition: pullState.distance === 0 ? 'transform 0.3s ease, opacity 0.3s ease' : 'none',
          }}
        >
          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center bg-white shadow-md ${
            pullState.refreshing
              ? 'border-indigo-400 border-t-transparent animate-spin'
              : pullState.ready
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300'
          }`}>
            {!pullState.refreshing && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${pullState.ready ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
        {boardsLoading ? (
          <BoardsSkeleton />
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 pt-8 pb-24">
            <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center text-5xl mb-5 shadow-inner">
              🗺️
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Create your first board</h2>
            <p className="text-sm text-gray-500 max-w-xs mb-8 leading-relaxed">
              Boards keep your travel ideas organised — Tokyo eats, Bali surf spots, weekend escapes. Each board becomes a trip plan.
            </p>
            {/* Visual board preview */}
            <div className="w-full max-w-xs grid grid-cols-2 gap-2 mb-8 opacity-40 pointer-events-none select-none">
              {[
                { emoji: '🍜', name: 'Tokyo Food' },
                { emoji: '🏖', name: 'Bali Beaches' },
                { emoji: '🏔', name: 'Alps Hiking' },
                { emoji: '🛍', name: 'Seoul Shopping' },
              ].map((b) => (
                <div key={b.name} className="bg-white rounded-xl border border-gray-100 p-3 min-h-[80px] flex flex-col">
                  <span className="text-xl mb-1">{b.emoji}</span>
                  <span className="text-xs font-semibold text-gray-700 line-clamp-1">{b.name}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
            >
              <Plus size={16} />
              Create first board
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
                onRename={(name) => handleRename(board.id, name)}
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
