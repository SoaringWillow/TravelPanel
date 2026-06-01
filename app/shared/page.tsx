'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle2, AlertCircle, Import } from 'lucide-react';
import { decodeBoard } from '@/lib/shareBoard';
import { saveItem, saveBoard, addItemToBoard } from '@/lib/db';
import { SavedItem, Board } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Inner (uses useSearchParams) ────────────────────────────────────────────

function SharedBoardInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const encoded      = searchParams.get('data') ?? '';
  const payload      = encoded ? decodeBoard(encoded) : null;

  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');

  async function handleImport() {
    if (!payload) return;
    setStatus('importing');

    try {
      const newBoard: Board = {
        id:             crypto.randomUUID(),
        name:           payload.board.name,
        emoji:          payload.board.emoji,
        itemIds:        [],
        createdAt:      Date.now(),
        updatedAt:      Date.now(),
      };
      await saveBoard(newBoard);

      for (const src of payload.items) {
        const item: SavedItem = {
          id:               crypto.randomUUID(),
          url:              src.url,
          title:            src.title,
          description:      src.description,
          platform:         src.platform as SavedItem['platform'],
          thumbnail:        undefined,
          locations:        src.locations,
          activities:       src.activities,
          tags:             src.tags,
          substance:        src.substance,
          savedAt:          Date.now(),
          enrichmentStatus: 'done',
          retryCount:       0,
          boardId:          newBoard.id,
        };
        await saveItem(item);
        await addItemToBoard(newBoard.id, item.id);
      }

      setStatus('done');
      setTimeout(() => router.push(`/boards/${newBoard.id}`), 1800);
    } catch {
      setStatus('error');
    }
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🔗</p>
          <h1 className="text-lg font-bold text-gray-800 mb-1">Invalid share link</h1>
          <p className="text-sm text-gray-500 mb-6">This link is missing or corrupted.</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            Go to TravelPanel →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-5">
        <p className="text-xs text-gray-400 mb-1">Shared with you</p>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{payload.board.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{payload.board.name}</h1>
            <p className="text-sm text-gray-500">
              {payload.items.length} place{payload.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Import CTA */}
      <div className="px-4 py-4">
        {status === 'idle' && (
          <button
            onClick={handleImport}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
          >
            <Import size={18} />
            Save board to TravelPanel
          </button>
        )}

        {status === 'importing' && (
          <div className="w-full flex items-center justify-center gap-2 bg-indigo-100 text-indigo-600 font-semibold py-3.5 rounded-2xl">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            Importing…
          </div>
        )}

        {status === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 font-semibold py-3.5 rounded-2xl"
          >
            <CheckCircle2 size={18} />
            Saved! Opening board…
          </motion.div>
        )}

        {status === 'error' && (
          <div className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-semibold py-3.5 rounded-2xl">
            <AlertCircle size={18} />
            Import failed — please try again
          </div>
        )}
      </div>

      {/* Item preview list */}
      <div className="px-4 space-y-3">
        {payload.items.map((item, i) => {
          const color = PLATFORM_COLORS[item.platform as keyof typeof PLATFORM_COLORS] ?? '#6366f1';
          const label = PLATFORM_LABELS[item.platform as keyof typeof PLATFORM_LABELS] ?? 'Web';
          return (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: color }}
                >
                  {label}
                </span>
                {item.locations.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={10} />
                    {item.locations[0].name}
                    {item.locations.length > 1 && ` +${item.locations.length - 1}`}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
              )}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SharedBoardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <SharedBoardInner />
    </Suspense>
  );
}
