'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { Board } from '@/lib/types';
import { deleteItem } from '@/lib/db';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, editBoard, removeBoard } = useBoards();
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);
  const [deleteMode, setDeleteMode] = useState<'board-only' | 'everything' | null>(null);

  async function handleCreate(name: string, emoji: string) {
    await createBoard(name, emoji);
  }

  async function handleEdit(name: string, emoji: string) {
    if (!editingBoard) return;
    await editBoard(editingBoard.id, { name, emoji });
    setEditingBoard(null);
  }

  async function handleDeleteBoardOnly(board: Board) {
    await removeBoard(board.id);
    setDeletingBoard(null);
  }

  async function handleDeleteEverything(board: Board) {
    for (const itemId of board.itemIds) {
      await deleteItem(itemId);
    }
    await removeBoard(board.id);
    setDeletingBoard(null);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
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
                itemCount={board.itemIds.length}
                onClick={() => router.push(`/boards/${board.id}`)}
                onEdit={() => setEditingBoard(board)}
                onDelete={() => setDeletingBoard(board)}
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
      <CreateBoardModal
        open={!!editingBoard}
        onClose={() => setEditingBoard(null)}
        onCreate={() => {}}
        onEdit={handleEdit}
        board={editingBoard ?? undefined}
      />

      {/* Delete confirmation sheet */}
      {deletingBoard && (
        <>
          <div
            className="fixed inset-0 z-[1999] bg-black/40"
            onClick={() => setDeletingBoard(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl p-5 pb-8 space-y-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
            <div>
              <p className="font-semibold text-gray-800 text-base">
                Delete "{deletingBoard.emoji} {deletingBoard.name}"?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This board has {deletingBoard.itemIds.length} clip{deletingBoard.itemIds.length !== 1 ? 's' : ''}.
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDeleteBoardOnly(deletingBoard)}
                className="w-full py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                Delete board only — keep clips in inbox
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEverything(deletingBoard)}
                className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Delete board + all {deletingBoard.itemIds.length} clip{deletingBoard.itemIds.length !== 1 ? 's' : ''}
              </button>
              <button
                type="button"
                onClick={() => setDeletingBoard(null)}
                className="w-full py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      <NavBar active="boards" />
    </div>
  );
}
