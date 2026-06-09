'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, Cloud, ExternalLink } from 'lucide-react';
import { getBoardById } from '@/lib/db';
import { getAllItems } from '@/lib/db';
import { Board, SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function BoardPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const b = await getBoardById(boardId);
        if (!b) { setNotFound(true); setLoading(false); return; }
        const allItems = await getAllItems();
        const idSet = new Set(b.itemIds);
        setBoard(b);
        setItems(allItems.filter(i => idSet.has(i.id)));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boardId]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
        <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-safe-12 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl -ml-1"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Shared Board</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 text-center px-8 py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-5">
            <Cloud size={32} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Board not available</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
            This board was shared from a different device. Enable Cloud Sync to access shared boards across your devices.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            Cloud sync is coming soon — stay tuned.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Open TravelPanel
          </button>
        </div>

        <NavBar active="boards" />
      </div>
    );
  }

  if (!board) return null;

  const hasLocations = items.some(i => i.locations.length > 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-safe-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl -ml-1"
          >
            <ArrowLeft size={20} />
          </button>

          <span className="text-2xl leading-none">{board.emoji}</span>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 dark:text-white leading-tight truncate">
              {board.name}
            </h1>
          </div>

          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {items.length} place{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Read-only badge */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Read-only preview
          </span>
        </div>
      </div>

      {/* Map */}
      {hasLocations && (
        <div className="relative w-full bg-gray-200 dark:bg-gray-800" style={{ height: 'min(220px, 32vh)' }}>
          <MapView
            items={items}
            onPinClick={() => {}}
          />
        </div>
      )}

      {/* Clips grid */}
      <div className="px-4 py-4">
        {/* Open in TravelPanel CTA */}
        <button
          type="button"
          onClick={() => router.push(`/boards/${boardId}`)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200 mb-4"
        >
          <ExternalLink size={16} />
          Edit this board
        </button>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MapPin className="text-gray-300 mb-3" size={40} />
            <p className="text-sm text-gray-500 dark:text-gray-400">No clips in this board yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-24 object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="p-2.5">
                  <span className={`${PLATFORM_BG[item.platform]} text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block mb-1`}>
                    {PLATFORM_LABELS[item.platform]}
                  </span>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug mb-1">
                    {item.title}
                  </p>
                  {item.locations.length > 0 && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <MapPin size={9} className="text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{item.locations[0].name}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
