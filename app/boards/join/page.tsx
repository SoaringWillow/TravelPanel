'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { parseShareFile, importSharedBoard, SharedBoardPackage, ImportBoardResult } from '@/lib/shareBoard';

type State = 'idle' | 'loading' | 'done' | 'error';

function JoinBoardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<ImportBoardResult | null>(null);
  const [error, setError] = useState('');

  async function handlePackage(pkg: SharedBoardPackage) {
    setState('loading');
    try {
      const r = await importSharedBoard(pkg);
      setResult(r);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setState('error');
    }
  }

  // Auto-import from URL ?data= param
  useEffect(() => {
    const encoded = searchParams.get('data');
    if (!encoded) return;
    try {
      const json = decodeURIComponent(escape(atob(encoded)));
      const pkg = JSON.parse(json) as SharedBoardPackage;
      handlePackage(pkg);
    } catch {
      setError('The share link is invalid or expired.');
      setState('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setState('loading');
    try {
      const pkg = await parseShareFile(file);
      await handlePackage(pkg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
      setState('error');
    }
  }

  const isAutoImport = !!searchParams.get('data');

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✈️</div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">TravelPanel</h1>
          <p className="text-sm text-gray-500 mt-1">Shared board import</p>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">Importing board…</p>
          </div>
        )}

        {/* Success */}
        {state === 'done' && result && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {result.board.emoji} {result.board.name}
            </h2>
            <p className="text-sm text-gray-500 mb-2">Added to your collections</p>
            <p className="text-xs text-gray-400 mb-6">
              {result.newItems} clip{result.newItems !== 1 ? 's' : ''} imported
              {result.skippedItems > 0 ? `, ${result.skippedItems} already existed` : ''}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/boards/${result.board.id}`)}
              className="w-full bg-indigo-600 text-white rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              Open Board <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Import failed</h2>
            <p className="text-sm text-red-600 mb-6">{error}</p>
            <button
              type="button"
              onClick={() => { setState('idle'); setError(''); }}
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Idle — file upload */}
        {state === 'idle' && !isAutoImport && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Import a board</h2>
            <p className="text-sm text-gray-500 mb-6">
              Open a <code className="bg-gray-100 px-1 rounded text-xs">.tpboard</code> file shared with you to add it to your collections.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <Upload size={24} className="text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Tap to select file</span>
              <span className="text-xs text-gray-400">.tpboard or .json</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tpboard,.json,application/json"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}
      </div>
    </main>
  );
}

export default function JoinBoardPage() {
  return (
    <Suspense fallback={null}>
      <JoinBoardInner />
    </Suspense>
  );
}
