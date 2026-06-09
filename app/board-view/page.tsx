'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { decodeSharePayload, SharedBoardPayload } from '@/lib/shareBoard';
import { saveItem, saveBoard, addItemToBoard, getAllBoards } from '@/lib/db';
import { Board, SavedItem } from '@/lib/types';
import InboxCard from '@/components/InboxCard';

type ImportState = 'idle' | 'importing' | 'done' | 'error';

function useSharedBoard() {
  const [payload, setPayload] = useState<SharedBoardPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setError('No board data found in this link.');
      return;
    }
    const decoded = decodeSharePayload(hash);
    if (!decoded) {
      setError('This link is invalid or has expired.');
      return;
    }
    setPayload(decoded);
  }, []);

  return { payload, error };
}

export default function BoardViewPage() {
  const router = useRouter();
  const { payload, error } = useSharedBoard();
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importError, setImportError] = useState('');

  async function handleImport() {
    if (!payload) return;
    setImportState('importing');
    setImportError('');

    try {
      // Create a new board (new ID to avoid collision)
      const newBoardId = crypto.randomUUID();
      const newBoard: Board = {
        id: newBoardId,
        name: payload.board.name,
        emoji: payload.board.emoji,
        itemIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveBoard(newBoard);

      // Import all items (new IDs to avoid collision)
      for (const srcItem of payload.items) {
        const newItemId = crypto.randomUUID();
        const item: SavedItem = {
          ...srcItem,
          id: newItemId,
          boardId: newBoardId,
          savedAt: Date.now(),
          enrichmentStatus: 'done', // already enriched
          retryCount: 0,
          isDemo: false,
        };
        await saveItem(item);
        await addItemToBoard(newBoardId, newItemId);
      }

      setImportState('done');
    } catch {
      setImportState('error');
      setImportError('Import failed. Please try again.');
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h1 className="text-lg font-bold text-gray-800 mb-2">Invalid link</h1>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          Open TravelPanel
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  const { board, items } = payload;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pb-4" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-2xl">{board.emoji}</span>
          <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{board.name}</h1>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            {items.length} clip{items.length !== 1 ? 's' : ''} · shared board (read-only)
          </p>

          <AnimatePresence mode="wait">
            {importState === 'done' ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-green-700 bg-green-50 text-xs font-semibold px-3 py-1.5 rounded-xl"
              >
                <CheckCircle2 size={14} />
                Saved to your boards!
              </motion.div>
            ) : (
              <motion.button
                key="import"
                type="button"
                onClick={handleImport}
                disabled={importState === 'importing'}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
              >
                {importState === 'importing' ? (
                  <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                {importState === 'importing' ? 'Saving…' : 'Save to my TravelPanel'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {importError && (
          <p className="text-xs text-red-500 mt-1">{importError}</p>
        )}
      </div>

      {/* Board clips grid */}
      <div className="px-4 py-4 pb-12">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-gray-500">This board has no clips yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Read-only card — disable interactive actions */}
                <InboxCard
                  item={item}
                  onDelete={() => {}}
                  onViewOnMap={() => {}}
                  onMoveToBoard={() => {}}
                  onRetry={() => {}}
                  readOnly
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
