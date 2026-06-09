'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowLeft, MapPin } from 'lucide-react';
import { decodeBoardShare, DecodedBoard } from '@/lib/shareBoard';
import { saveItem, saveBoard, addItemToBoard } from '@/lib/db';
import { Board, SavedItem } from '@/lib/types';

// ─── Inner (needs useSearchParams) ───────────────────────────────────────────

function ImportBoardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [decoded, setDecoded] = useState<DecodedBoard | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
  const [importedBoardId, setImportedBoardId] = useState<string | null>(null);

  useEffect(() => {
    const b = searchParams.get('b');
    if (!b) { setInvalid(true); return; }
    const result = decodeBoardShare(b);
    if (!result) { setInvalid(true); return; }
    setDecoded(result);
  }, [searchParams]);

  async function handleImport() {
    if (!decoded) return;
    setStatus('importing');

    try {
      const boardId = crypto.randomUUID();
      const now = Date.now();

      const newBoard: Board = {
        id: boardId,
        name: decoded.boardName,
        emoji: decoded.boardEmoji,
        itemIds: [],
        createdAt: now,
        updatedAt: now,
      };
      await saveBoard(newBoard);

      for (const raw of decoded.items) {
        const item: SavedItem = {
          ...raw,
          id: crypto.randomUUID(),
          description: '',
          activities: [],
          savedAt: now,
          enrichmentStatus: 'done',
          retryCount: 0,
          boardId,
          substance: raw.substance ?? [],
        };
        await saveItem(item);
        await addItemToBoard(boardId, item.id);
      }

      setImportedBoardId(boardId);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  // ── Invalid / error states ────────────────────────────────────────────────

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Invalid share link</h2>
        <p className="text-sm text-gray-500 mb-6">This link may be broken or has expired.</p>
        <button onClick={() => router.push('/')} className="text-indigo-600 text-sm font-medium">
          Go to TravelPanel →
        </button>
      </div>
    );
  }

  if (!decoded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 14 }}
        >
          <CheckCircle2 size={64} className="text-green-500 mb-4" />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Board added!</h2>
        <p className="text-sm text-gray-500 mb-6">
          {decoded.boardEmoji} {decoded.boardName} is now in your collections.
        </p>
        <button
          onClick={() => importedBoardId ? router.push(`/boards/${importedBoardId}`) : router.push('/boards')}
          className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-2xl text-sm hover:bg-indigo-700 active:scale-95 transition-all"
        >
          View board →
        </button>
      </div>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  const locationCount = decoded.items.reduce((n, i) => n + i.locations.length, 0);
  const previewItems = decoded.items.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5 safe-top">
        <button onClick={() => router.back()} className="text-gray-400 mb-4 flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{decoded.boardEmoji}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{decoded.boardName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {decoded.items.length} clip{decoded.items.length !== 1 ? 's' : ''} · {locationCount} place{locationCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-3">
        {/* Preview clips */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Preview</p>
        {previewItems.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-start gap-3 shadow-sm">
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 line-clamp-1">{item.title}</p>
              {item.locations.length > 0 && (
                <p className="text-xs text-indigo-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={10} />
                  {item.locations[0].name}
                  {item.locations.length > 1 && ` +${item.locations.length - 1}`}
                </p>
              )}
              {item.tags.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{item.tags.slice(0, 3).join(' · ')}</p>
              )}
            </div>
          </div>
        ))}
        {decoded.items.length > 4 && (
          <p className="text-center text-xs text-gray-400 py-1">
            + {decoded.items.length - 4} more clip{decoded.items.length - 4 !== 1 ? 's' : ''}
          </p>
        )}

        {/* Import CTA */}
        <div className="pt-2">
          {status === 'error' && (
            <p className="text-sm text-red-500 text-center mb-3">Import failed — please try again.</p>
          )}
          <button
            onClick={handleImport}
            disabled={status === 'importing'}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl text-base hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 transition-all shadow-md shadow-indigo-200"
          >
            {status === 'importing' ? 'Adding…' : `Add to my collections`}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            This board will be added to your TravelPanel on this device.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ImportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <ImportBoardInner />
    </Suspense>
  );
}
