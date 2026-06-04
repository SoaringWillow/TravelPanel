'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Loader2 } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { SkeletonGrid } from '@/components/SkeletonCard';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, refresh } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { refreshing, pullY } = usePullToRefresh(refresh, scrollRef);

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Pull-to-refresh indicator */}
        {(pullY > 0 || refreshing) && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ height: refreshing ? 40 : pullY, overflow: 'hidden' }}
          >
            <Loader2
              size={20}
              className={`text-indigo-500 ${refreshing ? 'animate-spin' : ''}`}
              style={{ opacity: refreshing ? 1 : pullY / 64 }}
            />
          </div>
        )}
        {boardsLoading ? (
          <SkeletonGrid count={6} variant="board" />
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            {/* Collection illustration */}
            <svg width="130" height="100" viewBox="0 0 130 100" fill="none" className="mb-6 opacity-90">
              {/* Stacked cards */}
              <rect x="25" y="30" width="80" height="55" rx="10" fill="#F5F3FF" stroke="#DDD6FE" strokeWidth="2" transform="rotate(-6 65 57)"/>
              <rect x="25" y="28" width="80" height="55" rx="10" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="2" transform="rotate(-2 65 55)"/>
              <rect x="25" y="26" width="80" height="55" rx="10" fill="white" stroke="#C7D2FE" strokeWidth="2"/>
              {/* Card content */}
              <rect x="35" y="38" width="30" height="20" rx="5" fill="#EEF2FF"/>
              <rect x="35" y="62" width="50" height="5" rx="2.5" fill="#E0E7FF"/>
              <rect x="35" y="71" width="35" height="5" rx="2.5" fill="#E0E7FF"/>
              {/* Globe icon on card */}
              <circle cx="50" cy="48" r="8" fill="#C7D2FE"/>
              <circle cx="50" cy="48" r="4" fill="#6366F1"/>
              {/* Plus badge */}
              <circle cx="95" cy="25" r="14" fill="#4F46E5" stroke="white" strokeWidth="3"/>
              <path d="M95 19 L95 31 M89 25 L101 25" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Create your first collection</h3>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
              Boards help you organise clips by destination or trip. Group your Japan ideas, beach escapes, and weekend getaways.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
            >
              <Plus size={16} />
              + New Board
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
