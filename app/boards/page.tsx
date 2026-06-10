'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board } from '@/lib/types';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { updateBoard } from '@/lib/db';

// ─── Reorderable row wrapper ──────────────────────────────────────────────────

function ReorderItem({ board, children }: { board: Board; children: React.ReactNode }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={board}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-3 py-2"
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 50 }}
      transition={{ duration: 0.15 }}
    >
      <button
        onPointerDown={(e) => controls.start(e)}
        className="touch-none cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500"
        aria-label="Drag to reorder"
      >
        <GripVertical size={18} />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </Reorder.Item>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, reorderBoards } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

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

  async function handleRename(id: string, newName: string) {
    await updateBoard(id, { name: newName });
    router.refresh();
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-transparent dark:border-gray-800 px-4 pt-12 pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600" size={22} />
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Boards</h1>
          </div>
          <div className="flex items-center gap-2">
            {boards.length > 1 && (
              <button
                type="button"
                onClick={() => setReorderMode((v) => !v)}
                className={`text-sm font-medium px-3 py-2 rounded-xl transition-colors ${
                  reorderMode
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {reorderMode ? 'Done' : 'Reorder'}
              </button>
            )}
            {!reorderMode && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Plus size={16} />
                <span>New Board</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* First-launch demo seed banner */}
      {!reorderMode && <OnboardingSeed />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {boardsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden min-h-[160px] shimmer" />
            ))}
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
        ) : reorderMode ? (
          /* ── Reorder list ── */
          <Reorder.Group
            axis="y"
            values={boards}
            onReorder={reorderBoards}
            className="flex flex-col gap-2"
          >
            {boards.map((board) => (
              <ReorderItem key={board.id} board={board}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{board.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
                      {board.name}
                    </p>
                    <p className="text-xs text-gray-400">{getItemCount(board.id)} clips</p>
                  </div>
                </div>
              </ReorderItem>
            ))}
          </Reorder.Group>
        ) : (
          /* ── Normal grid ── */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
