'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Sparkles } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board } from '@/lib/types';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import PullToRefresh from '@/components/PullToRefresh';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, updateBoard, refresh: refreshBoards } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  // Sorted by sortOrder (if set) else createdAt ascending
  const sortedBoards = [...boards].sort((a, b) =>
    (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt)
  );

  const handleReorder = useCallback(
    async (reordered: Board[]) => {
      // Persist new sortOrder for changed items
      for (let i = 0; i < reordered.length; i++) {
        const board = reordered[i];
        const newOrder = i * 1000;
        if ((board.sortOrder ?? board.createdAt) !== newOrder) {
          await updateBoard({ ...board, sortOrder: newOrder });
        }
      }
    },
    [updateBoard]
  );

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm dark:border-b dark:border-slate-800 px-4 header-pt-safe pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600 dark:text-indigo-400" size={22} />
            <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">My Boards</h1>
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
      <PullToRefresh onRefresh={refreshBoards} className="px-4 py-4 pb-24">
        {boardsLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true" className="mb-5">
              {/* Back board (offset) */}
              <rect x="22" y="26" width="56" height="44" rx="8" strokeWidth="2" strokeDasharray="5 3" className="stroke-indigo-200 dark:stroke-indigo-700" />
              {/* Front board */}
              <rect x="14" y="34" width="56" height="44" rx="8" strokeWidth="2.5" className="stroke-indigo-400 dark:stroke-indigo-500 fill-indigo-50 dark:fill-indigo-900/40" />
              {/* + icon */}
              <path d="M42 56 H50" strokeWidth="2.5" strokeLinecap="round" className="stroke-indigo-500 dark:stroke-indigo-400" />
              <path d="M46 52 V60" strokeWidth="2.5" strokeLinecap="round" className="stroke-indigo-500 dark:stroke-indigo-400" />
            </svg>
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg mb-2">No boards yet.</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mb-5 leading-relaxed">
              Create your first board to organise your travel ideas into trips.
            </p>
            {/* Example starter chips */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {[
                { emoji: '🗼', name: 'Tokyo Ideas' },
                { emoji: '🏖', name: 'Bali 2025' },
                { emoji: '🍜', name: 'Food Lists' },
              ].map(({ emoji, name }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleCreate(name, emoji)}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 transition-all"
                >
                  <span>{emoji}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              <Sparkles size={16} />
              Create a Board
            </button>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={sortedBoards}
            onReorder={handleReorder}
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
            as="div"
          >
            {sortedBoards.map((board) => (
              <Reorder.Item key={board.id} value={board} as="div" className="touch-none">
                <BoardCard
                  board={board}
                  itemCount={getItemCount(board.id)}
                  onClick={() => router.push(`/boards/${board.id}`)}
                  onDelete={() => handleDelete(board.id)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </PullToRefresh>

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
