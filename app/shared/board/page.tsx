'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Download, CheckCircle2 } from 'lucide-react';
import { decodeBoardShare, SharedBoardPayload } from '@/lib/shareBoard';
import { saveItem, saveBoard, addItemToBoard } from '@/lib/db';
import { SavedItem, Board } from '@/lib/types';
import { track } from '@/lib/analytics';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function SharedBoardPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<SharedBoardPayload | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    // Read from URL hash (never sent to server — privacy-safe)
    const hash = window.location.hash.slice(1);
    if (!hash) { setInvalid(true); return; }
    const decoded = decodeBoardShare(hash);
    if (!decoded) { setInvalid(true); return; }
    setPayload(decoded);
  }, []);

  async function handleImport() {
    if (!payload || importing || imported) return;
    setImporting(true);
    try {
      const boardId = crypto.randomUUID();
      const now = Date.now();
      const board: Board = {
        id: boardId,
        name: payload.board.name,
        emoji: payload.board.emoji,
        description: payload.board.description,
        itemIds: [],
        createdAt: now,
        updatedAt: now,
        isDemo: false,
      };
      await saveBoard(board);

      for (const itemData of payload.items) {
        const item: SavedItem = {
          ...itemData,
          id: crypto.randomUUID(), // fresh ID to avoid conflicts
          boardId,
          thumbnail: undefined,
          enrichmentStatus: 'done', // data already extracted
          retryCount: 0,
          isDemo: false,
        };
        await saveItem(item);
        await addItemToBoard(boardId, item.id);
      }

      track('shared_board_imported', {
        itemCount: payload.items.length,
        boardName: payload.board.name,
      });
      setImported(true);
      setTimeout(() => router.push(`/boards/${boardId}`), 1200);
    } catch {
      setImporting(false);
    }
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🔗</div>
        <h1 className="text-xl font-bold text-gray-800">Invalid share link</h1>
        <p className="text-sm text-gray-500">This link may have expired or been truncated. Ask the sender to share again.</p>
        <button onClick={() => router.push('/')} className="text-indigo-600 text-sm font-medium">Go to TravelPanel</button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const { board, items } = payload;
  // Reconstruct minimal SavedItem objects for map display
  const mapItems: SavedItem[] = items.map((i) => ({
    ...i,
    thumbnail: undefined,
    enrichmentStatus: 'done' as const,
    retryCount: 0,
  }));
  const hasLocations = items.some((i) => i.locations && i.locations.length > 0);
  const locationCount = items.reduce((n, i) => n + (i.locations?.length ?? 0), 0);
  const substanceCount = items.reduce((n, i) => n + (i.substance?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 safe-top">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{board.emoji}</span>
            <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{board.name}</h1>
          </div>
          {board.description && (
            <p className="text-sm text-gray-500">{board.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>✈️ {items.length} clip{items.length !== 1 ? 's' : ''}</span>
            <span>📍 {locationCount} location{locationCount !== 1 ? 's' : ''}</span>
            <span>💡 {substanceCount} tip{substanceCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      {hasLocations && (
        <div className="relative w-full bg-gray-200" style={{ height: 'min(220px, 32vh)' }}>
          <MapView items={mapItems} onPinClick={() => {}} />
        </div>
      )}

      {/* Import CTA */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        {imported ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-semibold text-sm py-3 bg-green-50 rounded-2xl">
            <CheckCircle2 size={18} />
            Imported! Taking you there…
          </div>
        ) : (
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <Download size={18} />
            {importing ? 'Importing…' : `Import this board to my TravelPanel`}
          </button>
        )}
        <p className="text-xs text-gray-400 text-center mt-2">
          View-only — import to save and edit in your own account
        </p>
      </div>

      {/* Clips list */}
      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto pb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          {items.length} Clip{items.length !== 1 ? 's' : ''}
        </h2>
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm space-y-1.5"
          >
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
            )}
            {item.locations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.locations.slice(0, 3).map((loc, i) => (
                  <span key={i} className="flex items-center gap-0.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    <MapPin size={9} />
                    {loc.name}
                  </span>
                ))}
              </div>
            )}
            {item.substance && item.substance.length > 0 && (
              <div className="space-y-1 pt-0.5">
                {item.substance.slice(0, 2).map((s, i) => (
                  <p key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1">
                    {s.type === 'tip' ? '💡' : s.type === 'warning' ? '⚠️' : s.type === 'recommendation' ? '⭐' : '📝'} {s.content}
                  </p>
                ))}
                {item.substance.length > 2 && (
                  <p className="text-xs text-gray-400">+{item.substance.length - 2} more tips</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
