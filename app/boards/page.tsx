'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  function getItemCount(boardId: string): number {
    const board = boards.find((b) => b.id === boardId);
    return board ? board.itemIds.length : 0;
  }

  function getBoardThumbnails(boardId: string): string[] {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return [];
    return board.itemIds
      .map((id) => items.find((item) => item.id === id)?.thumbnail)
      .filter((t): t is string => !!t)
      .slice(0, 4);
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
        {boardsLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-6">
            {/* Illustrated empty state */}
            <div className="relative w-24 h-24 mb-5">
              <div className="absolute inset-0 rounded-3xl bg-indigo-50" />
              <div className="absolute inset-0 flex items-center justify-center text-5xl">🗺</div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-sm">✈️</div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">📍</div>
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1.5">No boards yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6 leading-relaxed">
              Group your saved clips into boards — Tokyo, Bali, Weekend Escapes…
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
            >
              <Plus size={16} />
              Create your first board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                itemCount={getItemCount(board.id)}
                thumbnails={getBoardThumbnails(board.id)}
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
