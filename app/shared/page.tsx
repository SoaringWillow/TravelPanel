'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Map, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { decodeSharePayload, sharedItemToSavedItem, SharedBoard, SharedItem } from '@/lib/shareBoard';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';

// ─── Shared clip card ─────────────────────────────────────────────────────────

function SharedClipCard({ item }: { item: SharedItem }) {
  const color = PLATFORM_COLORS[item.p as keyof typeof PLATFORM_COLORS] ?? '#6366f1';
  const label = PLATFORM_LABELS[item.p as keyof typeof PLATFORM_LABELS] ?? 'Web';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {item.g && (
        <img src={item.g} alt="" className="w-full h-36 object-cover" />
      )}
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-white text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: color }}
          >
            {label}
          </span>
          {item.c.length > 0 && (
            <span className="text-xs text-indigo-600 font-medium">
              📍 {item.c.length} location{item.c.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{item.l}</p>

        {item.d && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.d}</p>
        )}

        {item.c.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {item.c.slice(0, 3).map((loc, i) => (
              <p key={i} className="text-xs text-gray-500">
                📍 {loc.n}
              </p>
            ))}
          </div>
        )}

        {item.s.length > 0 && (
          <div className="mt-2 border-t border-gray-50 pt-2 space-y-1">
            {item.s.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-sm flex-shrink-0">
                  {s.t === 'tip' ? '💡' : s.t === 'warning' ? '⚠️' : s.t === 'recommendation' ? '⭐' : '💬'}
                </span>
                <p className="text-xs text-gray-600 leading-snug">{s.c}</p>
              </div>
            ))}
            {item.s.length > 2 && (
              <p className="text-xs text-gray-400">+{item.s.length - 2} more insights</p>
            )}
          </div>
        )}

        {item.a.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.a.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function SharedPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [board, setBoard]         = useState<SharedBoard | null>(null);
  const [error, setError]         = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importError, setImportError] = useState(false);

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) { setError(true); return; }

    const decoded = decodeSharePayload(data);
    if (!decoded) { setError(true); return; }

    setBoard(decoded);
  }, [searchParams]);

  async function handleImport() {
    if (!board || importing) return;
    setImporting(true);
    setImportError(false);
    try {
      const { saveBoard, saveItem, addItemToBoard } = await import('@/lib/db');
      const { Board } = await import('@/lib/types');

      const newBoardId = crypto.randomUUID();
      const newBoard = {
        id:             newBoardId,
        name:           board.b.n,
        emoji:          board.b.e,
        itemIds:        [],
        createdAt:      Date.now(),
        updatedAt:      Date.now(),
      };

      await saveBoard(newBoard);

      for (const si of board.x) {
        const item = sharedItemToSavedItem(si, newBoardId);
        await saveItem(item);
        await addItemToBoard(newBoardId, item.id);
      }

      setImportDone(true);
    } catch {
      setImportError(true);
    } finally {
      setImporting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle size={48} className="text-gray-300" />
        <h1 className="font-bold text-gray-700 text-lg">Invalid share link</h1>
        <p className="text-sm text-gray-500">This link may be expired or malformed.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Go to TravelPanel
        </button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Hero header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-16 pb-5 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="text-6xl mb-3"
        >
          {board.b.e}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-gray-900">{board.b.n}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {board.x.length} place{board.x.length !== 1 ? 's' : ''} · Shared from TravelPanel
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-4 mt-3"
        >
          {(() => {
            const locCount = board.x.reduce((n, i) => n + i.c.length, 0);
            const tipCount = board.x.reduce((n, i) => n + i.s.length, 0);
            return (
              <>
                {locCount > 0 && <span className="text-sm text-gray-600">📍 {locCount} locations</span>}
                {tipCount > 0 && <span className="text-sm text-gray-600">💡 {tipCount} insights</span>}
              </>
            );
          })()}
        </motion.div>

        {/* Import CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex flex-col gap-2"
        >
          {importDone ? (
            <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
              <CheckCircle2 size={18} />
              Saved to your TravelPanel!
            </div>
          ) : (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-5 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {importing ? 'Importing…' : 'Add to my TravelPanel'}
            </button>
          )}

          {importError && (
            <p className="text-xs text-red-500 text-center">Import failed — please try again.</p>
          )}

          {importDone && (
            <button
              onClick={() => router.push('/boards')}
              className="flex items-center justify-center gap-1.5 text-sm text-indigo-600 font-medium"
            >
              <Map size={14} />
              Open in TravelPanel
            </button>
          )}

          <a
            href="/"
            className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <ExternalLink size={11} />
            Open TravelPanel
          </a>
        </motion.div>
      </div>

      {/* Clip cards */}
      <div className="px-4 py-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
          Places in this collection
        </p>
        {board.x.map((item, i) => (
          <motion.div
            key={item.i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
          >
            <SharedClipCard item={item} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function SharedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <SharedPageInner />
    </Suspense>
  );
}
