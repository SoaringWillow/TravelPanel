'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Download, Upload } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { exportAllData, importAllData } from '@/lib/exportData';
import BoardCard from '@/components/BoardCard';
import CreateBoardModal from '@/components/CreateBoardModal';
import OnboardingSeed from '@/components/OnboardingSeed';
import NavBar from '@/components/NavBar';

export default function BoardsPage() {
  const { boards, loading: boardsLoading, createBoard, removeBoard } = useBoards();
  const { items } = useSavedItems();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  async function handleRestoreFile(file: File) {
    try {
      const text = await file.text();
      const counts = await importAllData(text);
      setBackupMsg(`Restored ${counts.items} clips, ${counts.boards} boards, ${counts.trips} plans.`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : 'Restore failed.');
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-indigo-600" size={22} />
            <h1 className="text-xl font-bold text-gray-800">My Boards</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => exportAllData()}
              title="Back up all my data (JSON)"
              aria-label="Back up all my data"
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              title="Restore from backup"
              aria-label="Restore from backup"
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Upload size={18} />
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRestoreFile(file);
                e.target.value = '';
              }}
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
        {backupMsg && (
          <p className="text-xs text-indigo-600 mt-2">{backupMsg}</p>
        )}
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
