'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { decodeBoardShare, importSharedBoard, SharedBoardPayload } from '@/lib/shareBoard';

function JoinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const data = searchParams.get('data') ?? '';

  const [payload, setPayload] = useState<SharedBoardPayload | null>(null);
  const [parseError, setParseError] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importedBoardId, setImportedBoardId] = useState('');

  useEffect(() => {
    if (!data) { setParseError(true); return; }
    const p = decodeBoardShare(data);
    if (!p) { setParseError(true); return; }
    setPayload(p);
  }, [data]);

  async function handleImport() {
    if (!payload) return;
    setImporting(true);
    try {
      const { boardId } = await importSharedBoard(payload);
      setImportedBoardId(boardId);
      setDone(true);
    } catch {
      setParseError(true);
    } finally {
      setImporting(false);
    }
  }

  if (parseError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <h1 className="text-lg font-bold text-gray-800">Invalid share link</h1>
        <p className="text-sm text-gray-500">This link may have expired or been corrupted.</p>
        <button
          onClick={() => router.push('/boards')}
          className="mt-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          Go to my boards
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }}>
          <CheckCircle2 size={72} className="text-green-500" strokeWidth={1.5} />
        </motion.div>
        <div className="space-y-1">
          <p className="text-xl font-bold text-gray-900">Board added!</p>
          <p className="text-sm text-gray-500">
            {payload.board.emoji} {payload.board.name} is now in your collections.
          </p>
        </div>
        <button
          onClick={() => router.push(`/boards/${importedBoardId}`)}
          className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl"
        >
          View board →
        </button>
      </div>
    );
  }

  const locationCount = payload.items.reduce((n, i) => n + i.locations.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm px-5 pt-14 pb-5">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Shared with you</p>
        <h1 className="text-2xl font-bold text-gray-900">
          {payload.board.emoji} {payload.board.name}
        </h1>
        {payload.board.description && (
          <p className="text-sm text-gray-500 mt-1">{payload.board.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-3 gap-3">
        {[
          { value: payload.items.length, label: 'Places' },
          { value: locationCount,        label: 'Locations' },
          { value: payload.items.reduce((n, i) => n + (i.substance?.length ?? 0), 0), label: 'Tips' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-xl font-bold text-indigo-600">{value}</p>
            <p className="text-[10px] text-gray-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Preview items */}
      <div className="flex-1 px-5 space-y-2 pb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview</p>
        {payload.items.slice(0, 5).map((item, i) => (
          <div key={i} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <MapPin size={14} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
              <p className="text-xs text-gray-400">
                {item.locations.length} location{item.locations.length !== 1 ? 's' : ''} · {item.substance?.length ?? 0} tips
              </p>
            </div>
          </div>
        ))}
        {payload.items.length > 5 && (
          <p className="text-xs text-center text-gray-400 py-1">
            +{payload.items.length - 5} more places
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-indigo-200"
        >
          {importing ? (
            <><Loader2 size={17} className="animate-spin" /> Adding to my collections…</>
          ) : (
            <>Add {payload.board.emoji} {payload.board.name} to my TravelPanel</>
          )}
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          All {payload.items.length} places will be saved to your device.
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
