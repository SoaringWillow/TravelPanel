'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, MapPin, Lightbulb, Loader2 } from 'lucide-react';
import { decodeShare, importSharedBoard, BoardSharePayload } from '@/lib/shareBoard';

// ─── Inner (uses useSearchParams) ────────────────────────────────────────────

function ImportPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const encoded      = searchParams.get('d') ?? '';

  const [payload, setPayload]         = useState<BoardSharePayload | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [importing, setImporting]     = useState(false);
  const [imported, setImported]       = useState(false);
  const [importedBoardId, setImportedBoardId] = useState<string | null>(null);

  // Decode on mount
  useEffect(() => {
    if (!encoded) {
      setDecodeError('No share data found in this link.');
      return;
    }
    try {
      setPayload(decodeShare(encoded));
    } catch {
      setDecodeError('This link appears to be invalid or expired.');
    }
  }, [encoded]);

  async function handleImport() {
    if (!payload) return;
    setImporting(true);
    try {
      const result = await importSharedBoard(payload);
      setImportedBoardId(result.board.id);
      setImported(true);
    } catch {
      setDecodeError('Import failed — please try again.');
    } finally {
      setImporting(false);
    }
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (decodeError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <AlertCircle size={48} className="text-red-400" strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-gray-900">Can't open this board</h1>
        <p className="text-sm text-gray-500 max-w-xs">{decodeError}</p>
        <button
          onClick={() => router.push('/boards')}
          className="text-indigo-600 text-sm font-semibold mt-2"
        >
          Go to my boards
        </button>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  const { board, items } = payload;
  const locationCount = items.reduce((sum, i) => sum + (i.locations?.length ?? 0), 0);
  const substanceCount = items.reduce((sum, i) => sum + (i.substance?.length ?? 0), 0);
  const sharedDate = new Date(payload.sharedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  // ── Success state ────────────────────────────────────────────────────────────
  if (imported && importedBoardId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-5">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 300 }}
        >
          <CheckCircle2 size={64} className="text-green-500" strokeWidth={1.5} />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Board imported!</h1>
          <p className="text-sm text-gray-500 mt-1">
            {board.emoji} {board.name} is now in your collections.
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push(`/boards/${importedBoardId}`)}
            className="flex-1 bg-indigo-600 text-white font-semibold text-sm py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Open board
          </button>
          <button
            onClick={() => router.push('/boards')}
            className="flex-1 border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
          >
            All boards
          </button>
        </div>
      </div>
    );
  }

  // ── Preview + confirm ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-5 text-center">
        <div className="text-4xl mb-3">{board.emoji}</div>
        <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
        {board.description && (
          <p className="text-sm text-gray-500 mt-1">{board.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">Shared on {sharedDate}</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Stats */}
        <div className="grid grid-cols-3 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {[
            { value: items.length, label: 'Clips' },
            { value: locationCount, label: 'Spots' },
            { value: substanceCount, label: 'Tips' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center py-4 border-r border-gray-100 last:border-0">
              <span className="text-2xl font-bold text-gray-900">{value}</span>
              <span className="text-xs text-gray-400 font-medium mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Place preview */}
        {items.some((i) => i.locations?.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-indigo-400" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Locations</span>
              </div>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {items
                .flatMap((i) => i.locations ?? [])
                .slice(0, 12)
                .map((loc, idx) => (
                  <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {loc.name}
                  </span>
                ))}
              {locationCount > 12 && (
                <span className="text-xs text-gray-400 font-medium px-2.5 py-1">
                  +{locationCount - 12} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Substance preview */}
        {substanceCount > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  Travel Wisdom Included
                </span>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                This board includes <strong>{substanceCount} tips, warnings, and insights</strong> extracted
                from the original posts — not just pin locations.
              </p>
            </div>
          </div>
        )}

        {/* Import CTA */}
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 text-sm"
        >
          {importing ? (
            <><Loader2 size={18} className="animate-spin" /> Importing…</>
          ) : (
            <>Add {board.emoji} {board.name} to my TravelPanel</>
          )}
        </button>

        <p className="text-xs text-center text-gray-400 leading-relaxed px-4">
          This creates a copy of the board in your local TravelPanel.
          Your travel companion's data is not affected.
        </p>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function BoardImportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="text-indigo-400 animate-spin" />
      </div>
    }>
      <ImportPageInner />
    </Suspense>
  );
}
