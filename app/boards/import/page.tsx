'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { decodePayload, SharedBoardPayload } from '@/lib/shareBoard';
import { saveBoard, saveItem, getBoardById } from '@/lib/db';
import { Board, SavedItem } from '@/lib/types';

type State =
  | { type: 'loading' }
  | { type: 'preview'; payload: SharedBoardPayload }
  | { type: 'importing' }
  | { type: 'done'; boardId: string }
  | { type: 'error'; msg: string };

function ImportPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>({ type: 'loading' });

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) {
      setState({ type: 'error', msg: 'No board data found in this link.' });
      return;
    }
    const payload = decodePayload(data);
    if (!payload) {
      setState({ type: 'error', msg: 'This link is invalid or has expired.' });
      return;
    }
    setState({ type: 'preview', payload });
  }, [searchParams]);

  async function handleImport(payload: SharedBoardPayload) {
    setState({ type: 'importing' });
    try {
      // Give the imported board a fresh ID to avoid collisions
      const newBoardId = `shared-${crypto.randomUUID()}`;
      const existing = await getBoardById(payload.board.id).catch(() => null);

      const board: Board = {
        ...payload.board,
        id: existing ? newBoardId : payload.board.id,
        name: existing ? `${payload.board.name} (imported)` : payload.board.name,
        itemIds: payload.items.map((i) => i.id),
        updatedAt: Date.now(),
      };

      await Promise.all([
        saveBoard(board),
        ...payload.items.map((item: SavedItem) =>
          saveItem({ ...item, boardId: board.id }),
        ),
      ]);

      setState({ type: 'done', boardId: board.id });
    } catch (err) {
      setState({ type: 'error', msg: err instanceof Error ? err.message : 'Import failed' });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        {state.type === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            <p className="text-sm text-gray-500">Loading shared board…</p>
          </div>
        )}

        {state.type === 'preview' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="text-5xl mb-3">{state.payload.board.emoji}</div>
              <h1 className="text-xl font-bold text-gray-900">{state.payload.board.name}</h1>
              {state.payload.board.description && (
                <p className="text-sm text-gray-500 mt-1">{state.payload.board.description}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-3 text-sm text-gray-500">
                <span>📍 {state.payload.items.reduce((n, i) => n + i.locations.length, 0)} locations</span>
                <span>·</span>
                <span>📌 {state.payload.items.length} clips</span>
              </div>
            </div>

            {/* Preview top 3 clips */}
            {state.payload.items.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 text-lg">
                    🗺️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                  {item.locations[0] && (
                    <p className="text-xs text-gray-400 truncate">{item.locations[0].name}</p>
                  )}
                </div>
              </div>
            ))}
            {state.payload.items.length > 3 && (
              <p className="text-xs text-gray-400 text-center">
                +{state.payload.items.length - 3} more clips
              </p>
            )}

            <button
              type="button"
              onClick={() => handleImport(state.payload)}
              className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 active:scale-98 transition-all shadow-md shadow-indigo-200"
            >
              Import "{state.payload.board.name}"
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {state.type === 'importing' && (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            <p className="text-sm text-gray-500">Importing board…</p>
          </div>
        )}

        {state.type === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <CheckCircle2 size={64} className="text-green-500" strokeWidth={1.5} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Board imported!</h2>
              <p className="text-sm text-gray-500 mt-1">All clips and locations are saved.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/boards/${state.boardId}`)}
              className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all"
            >
              Open board →
            </button>
          </motion.div>
        )}

        {state.type === 'error' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle size={48} className="text-red-400" strokeWidth={1.5} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import failed</h2>
              <p className="text-sm text-gray-500 mt-1">{state.msg}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              Go to TravelPanel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImportBoardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>}>
      <ImportPageInner />
    </Suspense>
  );
}
