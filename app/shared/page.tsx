'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Globe2, Download, MapPin, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { decodeSharedBoard, SharedBoardPayload } from '@/lib/shareBoard';
import { saveItem, saveBoard, addItemToBoard } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { detectPlatform } from '@/lib/parse-url';
import { Board, SavedItem } from '@/lib/types';

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function SharedPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const encoded      = searchParams.get('b') ?? '';

  const [payload, setPayload]         = useState<SharedBoardPayload | null>(null);
  const [invalid, setInvalid]         = useState(false);
  const [importState, setImportState] = useState<'idle' | 'importing' | 'done'>('idle');
  const [progress, setProgress]       = useState(0);

  useEffect(() => {
    if (!encoded) { setInvalid(true); return; }
    const p = decodeSharedBoard(encoded);
    if (!p) { setInvalid(true); return; }
    setPayload(p);
  }, [encoded]);

  async function handleImport() {
    if (!payload) return;
    setImportState('importing');
    setProgress(0);

    const board: Board = {
      id:        crypto.randomUUID(),
      name:      payload.name,
      emoji:     payload.emoji,
      itemIds:   [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveBoard(board);

    let done = 0;
    for (const src of payload.items) {
      const itemId  = crypto.randomUUID();
      const item: SavedItem = {
        id:               itemId,
        url:              src.url,
        title:            src.title,
        platform:         detectPlatform(src.url),
        description:      '',
        thumbnail:        undefined,
        locations:        [],
        activities:       [],
        tags:             [],
        substance:        [],
        savedAt:          Date.now(),
        enrichmentStatus: 'pending',
        retryCount:       0,
        boardId:          board.id,
      };
      await saveItem(item);
      await addItemToBoard(board.id, itemId);
      // Fire-and-forget enrichment (same as the share page does)
      enrichItem(itemId, src.url);
      done++;
      setProgress(Math.round((done / payload.items.length) * 100));
    }

    setImportState('done');
  }

  // ── Invalid link ───────────────────────────────────────────────────────────
  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl">🔗</div>
        <h1 className="text-lg font-bold text-gray-800">Invalid share link</h1>
        <p className="text-sm text-gray-500">This link may be broken or expired.</p>
        <button onClick={() => router.push('/')} className="text-sm text-indigo-600 font-medium">
          Go to TravelPanel →
        </button>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (importState === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-5">
        <CheckCircle2 size={56} className="text-green-500" strokeWidth={1.5} />
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-gray-900">
            {payload.emoji} {payload.name} imported!
          </h1>
          <p className="text-sm text-gray-500">
            {payload.items.length} place{payload.items.length !== 1 ? 's' : ''} added to your Collections.
            AI extraction is running in the background.
          </p>
        </div>
        <button
          onClick={() => router.push('/boards')}
          className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          View Collections →
        </button>
      </div>
    );
  }

  // ── Main import screen ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-5">
        <div className="flex items-center gap-2 text-gray-400 mb-4">
          <Globe2 size={16} />
          <span className="text-xs">TravelPanel · Shared board</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{payload.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{payload.name}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin size={12} />
              {payload.items.length} place{payload.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Items preview */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Places in this board</p>
        <div className="space-y-2">
          {payload.items.map((item, i) => {
            let hostname = item.url;
            try { hostname = new URL(item.url).hostname.replace(/^www\./, ''); } catch { /* */ }
            return (
              <div key={i} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-start gap-2.5">
                <MapPin size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 truncate">{hostname}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-4 pb-safe space-y-3">
        {importState === 'importing' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Importing…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <button
          onClick={handleImport}
          disabled={importState === 'importing'}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-indigo-200"
        >
          <Download size={18} />
          {importState === 'importing' ? 'Importing…' : `Import ${payload.emoji} ${payload.name}`}
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full text-center text-sm text-gray-400 py-2"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function SharedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    }>
      <SharedPageInner />
    </Suspense>
  );
}
