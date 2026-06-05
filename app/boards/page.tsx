'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Clock, Sparkles, X } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import EditBoardModal from '@/components/EditBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { SkeletonBoardCard } from '@/components/SkeletonCard';
import { useTripSuggestion, relativeDaysAgo } from '@/hooks/useTripSuggestion';
import { Board } from '@/lib/types';
import { BoardsEmptyIllustration } from '@/components/EmptyStateIllustration';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, editBoard, removeBoard } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const suggestion = useTripSuggestion(boards, items);

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600 dark:text-indigo-400" size={22} />
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Boards</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/trips')}
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
            >
              <Clock size={16} />
              <span>Trips</span>
            </button>
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
      </div>

      {/* First-launch demo seed banner */}
      <OnboardingSeed />

      {/* Proactive trip suggestion */}
      {suggestion && (
        <div className="mx-4 mt-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">
                Ready to plan {suggestion.board.emoji} {suggestion.board.name}?
              </p>
              <p className="text-white/80 text-xs mt-0.5">
                You saved {suggestion.clipCount} spots {relativeDaysAgo(suggestion.mostRecentSave)} — let AI build your itinerary.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/plan/${suggestion.board.id}`)}
                className="mt-2.5 bg-white text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Plan this trip →
              </button>
            </div>
            <button
              type="button"
              onClick={suggestion.dismiss}
              className="text-white/60 hover:text-white transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {boardsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonBoardCard key={i} />)}
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-4 pb-10 text-center px-6">
            <BoardsEmptyIllustration />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 -mt-2">No boards yet.</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
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
                onEdit={() => setEditingBoard(board)}
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

      {/* Edit board modal */}
      {editingBoard && (
        <EditBoardModal
          board={editingBoard}
          onClose={() => setEditingBoard(null)}
          onSave={(name, emoji) => editBoard(editingBoard.id, name, emoji)}
        />
      )}

      <NavBar active="boards" />
    </div>
  );
}
