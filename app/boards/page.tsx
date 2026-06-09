'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { reorderBoards } from '@/lib/db';
import { Board } from '@/lib/types';
import SortableBoardCard from '@/components/SortableBoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import { PullRefreshIndicator } from '@/components/PullRefreshIndicator';
import NavBar from '@/components/NavBar';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, refresh: refreshBoards } = useBoards();
  const { items, refresh: refreshItems } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [localBoards, setLocalBoards] = useState<Board[]>([]);

  useEffect(() => { setLocalBoards(boards); }, [boards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localBoards.findIndex((b) => b.id === active.id);
    const newIndex = localBoards.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(localBoards, oldIndex, newIndex);
    setLocalBoards(reordered);
    await reorderBoards(reordered.map((b) => b.id));
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshBoards(), refreshItems()]);
  }, [refreshBoards, refreshItems]);

  const { scrollRef, pullDistance, refreshing, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh({ onRefresh: handleRefresh });

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
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 header-safe pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600" size={22} />
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Boards</h1>
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
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-24"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <PullRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
        <div className="py-4">
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localBoards.map((b) => b.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {localBoards.map((board) => (
                  <SortableBoardCard
                    key={board.id}
                    board={board}
                    itemCount={getItemCount(board.id)}
                    onClick={() => router.push(`/boards/${board.id}`)}
                    onDelete={() => handleDelete(board.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        </div>
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
