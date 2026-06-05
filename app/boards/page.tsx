'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';

const THRESHOLD = 64;

// ── Skeleton card shown while IndexedDB loads ─────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 min-h-[160px] p-4 animate-pulse">
      <div className="h-8 w-8 bg-gray-100 rounded-xl mb-3" />
      <div className="h-4 w-3/4 bg-gray-100 rounded-md mb-2" />
      <div className="h-3 w-2/5 bg-gray-100 rounded-md" />
    </div>
  );
}

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, refresh: refreshBoards } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const onRefresh = useCallback(async () => {
    await refreshBoards();
  }, [refreshBoards]);

  const { containerRef, pullY, isPulling, refreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: THRESHOLD,
  });

  function getItemCount(boardId: string): number {
    const board = boards.find((b) => b.id === boardId);
    return board ? board.itemIds.length : 0;
  }

  function getEnrichmentProgress(boardId: string): { enriched: number; total: number } {
    const board = boards.find((b) => b.id === boardId);
    if (!board || board.itemIds.length === 0) return { enriched: 0, total: 0 };
    const total = board.itemIds.length;
    const enriched = board.itemIds.filter((id) => {
      const item = items.find((i) => i.id === id);
      return item?.enrichmentStatus === 'done';
    }).length;
    return { enriched, total };
  }

  function getSubstanceCount(boardId: string): number {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return 0;
    return board.itemIds.reduce((sum, id) => {
      const item = items.find((i) => i.id === id);
      return sum + (item?.substance?.length ?? 0);
    }, 0);
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
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10 safe-top">
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
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-24"
        {...handlers}
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-end justify-center overflow-hidden"
          style={{
            height: refreshing ? 48 : isPulling ? pullY : 0,
            transition: isPulling ? 'none' : 'height 0.2s ease-out',
          }}
          aria-hidden
        >
          <div
            className="mb-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center"
            style={{ opacity: refreshing ? 1 : Math.min(pullY / 32, 1) }}
          >
            <RefreshCw
              size={16}
              className="text-indigo-600"
              style={
                refreshing
                  ? { animation: 'spin 0.8s linear infinite' }
                  : { transform: `rotate(${(pullY / THRESHOLD) * 360}deg)` }
              }
            />
          </div>
        </div>
        <div className="py-4">
        {boardsLoading ? (
          // Content-shaped skeleton instead of a spinner
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : boards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center h-60 text-center px-6"
          >
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
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {boards.map((board) => (
                <motion.div
                  key={board.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
                  }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                  layout
                >
                  <BoardCard
                    board={board}
                    itemCount={getItemCount(board.id)}
                    substanceCount={getSubstanceCount(board.id)}
                    enrichmentProgress={getEnrichmentProgress(board.id)}
                    onClick={() => router.push(`/boards/${board.id}`)}
                    onDelete={() => handleDelete(board.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
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
