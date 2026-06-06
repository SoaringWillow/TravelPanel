'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import { PullToRefresh } from '@/components/PullToRefresh';
import NavBar from '@/components/NavBar';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, refresh: refreshBoards } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  function getItemCount(boardId: string): number {
    const board = boards.find((b) => b.id === boardId);
    return board ? board.itemIds.length : 0;
  }

  function getLocationItemCount(boardId: string): number {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return 0;
    const boardItemIds = new Set(board.itemIds);
    return items.filter((i) => boardItemIds.has(i.id) && i.locations.length > 0).length;
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
      <PullToRefresh onRefresh={refreshBoards} className="flex-1">
      <div className="px-4 py-4 pb-24">
        {boardsLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : boards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center justify-center py-16 text-center px-6"
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5">
              <LayoutGrid size={36} className="text-indigo-400" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-2">No collections yet.</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6 leading-relaxed">
              Create a board for each trip — Tokyo Highlights, Bali Food Trail, etc. — then move clips into it and let AI plan your itinerary.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
            >
              <Plus size={18} />
              Create Your First Board
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                itemCount={getItemCount(board.id)}
                locationItemCount={getLocationItemCount(board.id)}
                onClick={() => router.push(`/boards/${board.id}`)}
                onDelete={() => handleDelete(board.id)}
                onQuickPlan={() => router.push(`/plan/${board.id}`)}
              />
            ))}
          </div>
        )}
      </div>
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
