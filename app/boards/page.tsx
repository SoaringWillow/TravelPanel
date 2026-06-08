'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Upload, RefreshCw, X } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';
import { importBoardFromFile } from '@/lib/shareBoard';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SavedItem } from '@/lib/types';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard, setBoardCover, refresh: refreshBoards } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const doRefresh = useCallback(async () => { await refreshBoards(); }, [refreshBoards]);
  const { scrollRef, pullRatio, refreshing, touchHandlers } = usePullToRefresh(doRefresh);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverPickBoardId, setCoverPickBoardId] = useState<string | null>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const json = await file.text();
      const { boardName, itemCount } = await importBoardFromFile(json);
      alert(`Imported "${boardName}" with ${itemCount} place${itemCount !== 1 ? 's' : ''}.`);
      router.refresh();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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

  function getBoardItemsWithThumbnails(boardId: string): SavedItem[] {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return [];
    return board.itemIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is SavedItem => !!i && !!i.thumbnail);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600" size={22} />
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Boards</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-sm font-medium px-3 py-2 rounded-xl hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all"
              title="Import a .tpboard file"
            >
              <Upload size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tpboard,application/json"
              className="hidden"
              onChange={handleImport}
            />
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

      {importError && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">
          {importError}
        </div>
      )}

      {/* First-launch demo seed banner */}
      <OnboardingSeed />

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-24"
        {...touchHandlers}
      >
        {(pullRatio > 0 || refreshing) && (
          <div className="flex justify-center pb-3 -mt-1" style={{ opacity: pullRatio }}>
            <RefreshCw
              size={18}
              className={`text-indigo-500 ${refreshing ? 'animate-spin' : 'transition-transform'}`}
              style={{ transform: refreshing ? undefined : `rotate(${pullRatio * 180}deg)` }}
            />
          </div>
        )}
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
                itemCount={getItemCount(board.id)}
                onClick={() => router.push(`/boards/${board.id}`)}
                onDelete={() => handleDelete(board.id)}
                onLongPress={() => {
                  if (getBoardItemsWithThumbnails(board.id).length > 0) {
                    setCoverPickBoardId(board.id);
                  }
                }}
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

      {/* Cover photo picker sheet */}
      {coverPickBoardId && (() => {
        const coverItems = getBoardItemsWithThumbnails(coverPickBoardId);
        return (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setCoverPickBoardId(null)} />
            <div className="relative w-full bg-white rounded-t-3xl p-5 pb-10 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-base">Set Cover Photo</h3>
                <button
                  type="button"
                  onClick={() => setCoverPickBoardId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {coverItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={async () => {
                      await setBoardCover(coverPickBoardId, item.thumbnail!);
                      setCoverPickBoardId(null);
                    }}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all focus:outline-none"
                  >
                    <img src={item.thumbnail!} alt={item.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <NavBar active="boards" />
    </div>
  );
}
