'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { decodeSharedBoard, SharedBoard } from '@/lib/shareBoard';
import { getAllBoards, saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { Board, SavedItem } from '@/lib/types';
import { detectPlatform } from '@/lib/parse-url';

function ImportBoardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [board, setBoard] = useState<SharedBoard | null>(null);
  const [decodeError, setDecodeError] = useState(false);
  const [importState, setImportState] = useState<'preview' | 'importing' | 'done' | 'error'>('preview');

  useEffect(() => {
    const d = searchParams.get('d');
    if (!d) { setDecodeError(true); return; }
    const decoded = decodeSharedBoard(d);
    if (!decoded) { setDecodeError(true); return; }
    setBoard(decoded);
  }, [searchParams]);

  async function handleImport() {
    if (!board) return;
    setImportState('importing');
    try {
      // Check for an existing board with the same name to avoid duplicates
      const existing = await getAllBoards();
      let targetBoardId: string;

      const match = existing.find((b) => b.name === board.name && b.emoji === board.emoji);
      if (match) {
        targetBoardId = match.id;
      } else {
        const newBoard: Board = {
          id: crypto.randomUUID(),
          name: board.name,
          emoji: board.emoji,
          itemIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveBoard(newBoard);
        targetBoardId = newBoard.id;
      }

      // Import clips
      for (const clip of board.clips) {
        const item: SavedItem = {
          id: crypto.randomUUID(),
          url: clip.url,
          title: clip.title,
          platform: detectPlatform(clip.url),
          description: clip.description ?? '',
          thumbnail: undefined,
          locations: clip.locations,
          activities: clip.activities,
          tags: clip.tags,
          substance: clip.substance.map((s) => ({
            type: s.type as SavedItem['substance'][0]['type'],
            content: s.content,
            applies_to: s.applies_to,
          })),
          savedAt: Date.now(),
          enrichmentStatus: 'done',
          retryCount: 0,
          boardId: targetBoardId,
        };
        await saveItem(item);
        await addItemToBoard(targetBoardId, item.id);
      }

      setImportState('done');
    } catch {
      setImportState('error');
    }
  }

  if (decodeError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <AlertCircle size={40} className="text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid share link</h1>
        <p className="text-sm text-gray-500 mb-6">This link may be expired or incomplete.</p>
        <button onClick={() => router.push('/')} className="text-indigo-600 font-medium text-sm hover:underline">
          Open TravelPanel →
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

  const totalSpots = board.clips.reduce((s, c) => s + c.locations.length, 0);
  const totalTips = board.clips.reduce((s, c) => s + c.substance.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-12">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100 px-5 py-8 text-center">
        <div className="text-5xl mb-3">{board.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Travel board shared via TravelPanel</p>

        {/* Stats */}
        <div className="flex justify-center gap-6 mt-4">
          {[
            { label: 'Clips', value: board.clips.length },
            { label: 'Spots', value: totalSpots },
            { label: 'Tips', value: totalTips },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-indigo-600">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Import CTA */}
      <div className="px-5 py-5">
        {importState === 'preview' && (
          <button
            onClick={handleImport}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 text-base"
          >
            <Download size={20} />
            Import to TravelPanel
          </button>
        )}

        {importState === 'importing' && (
          <div className="flex items-center justify-center gap-3 py-4 text-indigo-600">
            <motion.div
              className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            />
            <span className="font-medium">Importing {board.clips.length} clips…</span>
          </div>
        )}

        {importState === 'done' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <CheckCircle2 size={36} className="text-green-500" />
            <p className="font-bold text-gray-800">Board imported!</p>
            <button
              onClick={() => router.push('/boards')}
              className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              View in TravelPanel →
            </button>
          </motion.div>
        )}

        {importState === 'error' && (
          <div className="text-center py-4">
            <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600 font-medium">Import failed. Please try again.</p>
            <button onClick={() => setImportState('preview')} className="text-indigo-600 text-sm mt-2 hover:underline">
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Clips preview */}
      <div className="px-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          What's in this board
        </p>
        <div className="space-y-3">
          {board.clips.map((clip, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">{clip.title}</h3>

              {clip.locations.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {clip.locations.slice(0, 3).map((loc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium"
                    >
                      <MapPin size={8} />
                      {loc.name}
                    </span>
                  ))}
                </div>
              )}

              {clip.substance.length > 0 && (
                <div className="text-xs text-gray-500 italic line-clamp-2">
                  💡 {clip.substance[0].content}
                  {clip.substance.length > 1 && ` (+${clip.substance.length - 1} more tips)`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ImportBoardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <ImportBoardInner />
    </Suspense>
  );
}
