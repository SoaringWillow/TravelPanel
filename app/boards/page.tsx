'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { EmptyState } from '@/components/EmptyState';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { PullToRefresh } from '@/components/PullToRefresh';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, refresh: refreshBoards } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  function getBoardStats(boardId: string) {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return { itemCount: 0, locationCount: 0, tipCount: 0 };
    const boardItems = items.filter((i) => board.itemIds.includes(i.id));
    return {
      itemCount: boardItems.length,
      locationCount: boardItems.reduce((s, i) => s + i.locations.length, 0),
      tipCount: boardItems.reduce((s, i) => s + (i.substance?.length ?? 0), 0),
    };
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
      <div className="bg-white shadow-sm px-4 pb-4 z-10" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
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
      <PullToRefresh onRefresh={refreshBoards} className="flex-1 px-4 py-4" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' } as React.CSSProperties}>
        {boardsLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : boards.length === 0 ? (
          <EmptyState
            illustration="boards"
            title="No boards yet"
            subtitle="Create your first collection to organise your travel ideas."
            action={
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-5 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
                Create a Board
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {boards.map((board) => {
              const stats = getBoardStats(board.id);
              return (
              <SwipeToDelete key={board.id} onDelete={() => handleDelete(board.id)}>
                <BoardCard
                  board={board}
                  itemCount={stats.itemCount}
                  locationCount={stats.locationCount}
                  tipCount={stats.tipCount}
                  onClick={() => router.push(`/boards/${board.id}`)}
                />
              </SwipeToDelete>
              );
            })}
          </div>
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
