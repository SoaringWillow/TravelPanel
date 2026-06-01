'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { BoardsSkeleton } from '@/components/SkeletonCard';
import EmptyState from '@/components/EmptyState';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600 dark:text-indigo-400" size={22} />
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">My Boards</h1>
          </div>
          <motion.button
            type="button"
            onClick={() => setShowCreate(true)}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-indigo-700 transition-all"
          >
            <Plus size={16} />
            <span>New Board</span>
          </motion.button>
        </div>
      </div>

      {/* First-launch demo seed banner */}
      <OnboardingSeed />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {boardsLoading ? (
          <BoardsSkeleton />
        ) : boards.length === 0 ? (
          <EmptyState
            type="boards"
            headline="No boards yet"
            description="Create a board for each destination — a collection of clips, ready to plan from."
            action={{ label: '+ Create a Board', onClick: () => setShowCreate(true) }}
          />
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
