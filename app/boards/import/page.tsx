'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { decodeShareLink, parseBoardFile, importBoard, SharedBoardPayload } from '@/lib/shareBoard';

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function ImportPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [payload,    setPayload]    = useState<SharedBoardPayload | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [importing,  setImporting]  = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [dragging,   setDragging]   = useState(false);

  // Decode ?data= param from a share link
  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) return;
    const decoded = decodeShareLink(data);
    if (decoded) {
      setPayload(decoded);
    } else {
      setError('The share link is invalid or corrupted.');
    }
  }, [searchParams]);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    const result = await parseBoardFile(file);
    if (result) {
      setPayload(result);
    } else {
      setError('Could not read the file. Make sure it is a valid .tpboard file.');
    }
  }, []);

  const handleFileDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  async function handleImport() {
    if (!payload) return;
    setImporting(true);
    try {
      const newBoardId = await importBoard(payload);
      setImportedId(newBoardId);
    } catch {
      setError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────

  if (importedId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Board imported!</h2>
        <p className="text-sm text-gray-500 mb-6">
          {payload?.board.emoji} <strong>{payload?.board.name}</strong> and{' '}
          {payload?.clips.length ?? 0} clip{(payload?.clips.length ?? 0) !== 1 ? 's' : ''} are now in your library.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(`/boards/${importedId}`)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Open board →
          </button>
          <Link href="/boards" className="flex items-center px-5 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            All boards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/boards" className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Import Board</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {payload ? (
          /* ── Preview ── */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <span className="text-3xl">{payload.board.emoji}</span>
              <div>
                <h2 className="text-base font-bold text-gray-900">{payload.board.name}</h2>
                <p className="text-xs text-gray-400">
                  {payload.clips.length} clip{payload.clips.length !== 1 ? 's' : ''} ·
                  Shared {new Date(payload.sharedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Clip thumbnails */}
            {payload.clips.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3">
                {payload.clips.slice(0, 8).map((clip) =>
                  clip.thumbnail ? (
                    <img
                      key={clip.id}
                      src={clip.thumbnail}
                      alt={clip.title}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      key={clip.id}
                      className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 text-lg"
                    >
                      {payload.board.emoji}
                    </div>
                  )
                )}
                {payload.clips.length > 8 && (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                    +{payload.clips.length - 8}
                  </div>
                )}
              </div>
            )}

            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing…' : `Import ${payload.board.emoji} ${payload.board.name}`}
              </button>
            </div>
          </div>
        ) : (
          /* ── File upload ── */
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Upload a <strong>.tpboard</strong> file shared by another TravelPanel user, or paste a share link in your browser.
            </p>

            <label
              className={`flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-colors ${
                dragging
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
            >
              <Upload size={28} className="text-indigo-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Drop a .tpboard file here</p>
                <p className="text-xs text-gray-400 mt-1">or tap to browse</p>
              </div>
              <input
                type="file"
                accept=".tpboard,application/json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </label>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={null}>
      <ImportPageInner />
    </Suspense>
  );
}
