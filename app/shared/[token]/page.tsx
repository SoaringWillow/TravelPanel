'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Globe2, MapPin, Tag, Download, Check } from 'lucide-react';
import { decodeShareToken, SharePayload } from '@/lib/shareBoard';
import { SavedItem, Board } from '@/lib/types';
import { saveItem, saveBoard } from '@/lib/db';
import { track } from '@/lib/analytics';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Read-only clip card ──────────────────────────────────────────────────────

function SharedClipCard({ item }: { item: SharePayload['items'][number] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {item.thumbnail && (
        <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-slate-700">
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget.closest('.relative') as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 leading-snug line-clamp-2 mb-2">
          {item.title}
        </p>

        {item.locations.length > 0 && (
          <div className="flex items-start gap-1 mb-2">
            <MapPin size={12} className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-snug line-clamp-1">
              {item.locations.map((l) => l.name).join(' · ')}
            </p>
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SharedBoardPage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const [payload, setPayload] = useState<SharePayload | null | 'invalid'>(null);
  const [importState, setImportState] = useState<'idle' | 'importing' | 'done'>('idle');

  useEffect(() => {
    const decoded = decodeShareToken(token);
    setPayload(decoded ?? 'invalid');
  }, [token]);

  async function handleImportBoard() {
    if (!payload || payload === 'invalid' || importState !== 'idle') return;
    setImportState('importing');

    const { board, items } = payload;
    const newBoardId = crypto.randomUUID();
    const itemIds: string[] = [];

    for (const sharedItem of items) {
      const newId = crypto.randomUUID();
      itemIds.push(newId);
      const fullItem: SavedItem = {
        id:               newId,
        url:              '',
        platform:         'other',
        title:            sharedItem.title,
        description:      '',
        thumbnail:        sharedItem.thumbnail,
        locations:        sharedItem.locations,
        activities:       sharedItem.activities,
        tags:             sharedItem.tags,
        substance:        [],
        savedAt:          Date.now(),
        enrichmentStatus: 'done',
        retryCount:       0,
      };
      await saveItem(fullItem);
    }

    const newBoard: Board = {
      id:          newBoardId,
      name:        board.name,
      emoji:       board.emoji,
      description: board.description,
      itemIds,
      createdAt:   Date.now(),
      updatedAt:   Date.now(),
    };
    await saveBoard(newBoard);

    track('board_imported_from_share_link', { clipCount: items.length });

    setImportState('done');
    setTimeout(() => router.push(`/boards/${newBoardId}`), 1200);
  }

  // Loading
  if (payload === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Invalid token
  if (payload === 'invalid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 px-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2">Link not valid</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          This shared board link may have been corrupted or expired.
        </p>
      </div>
    );
  }

  const { board, items } = payload;
  const hasLocations = items.some((i) => i.locations.length > 0);

  // Build fake SavedItem-like objects just enough for MapView
  const fakeMapItems = items
    .filter((i) => i.locations.length > 0)
    .map((i) => ({
      id:               i.id,
      url:              '',
      platform:         'other' as const,
      title:            i.title,
      description:      '',
      thumbnail:        i.thumbnail,
      locations:        i.locations,
      activities:       i.activities,
      tags:             i.tags,
      substance:        [],
      savedAt:          0,
      enrichmentStatus: 'done' as const,
      retryCount:       0,
    }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm px-4 pt-safe-top pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Globe2 className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" size={20} />
          <span className="font-bold text-gray-800 dark:text-slate-100 text-base">TravelPanel</span>
          <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">Shared board</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        {/* Board title */}
        <div className="pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl leading-none">{board.emoji}</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-50 leading-tight">
              {board.name}
            </h1>
          </div>
          {board.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 ml-12">
              {board.description}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 ml-12">
            {items.length} place{items.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Map */}
        {hasLocations && (
          <div
            className="relative w-full rounded-2xl overflow-hidden mb-6 bg-gray-200 dark:bg-slate-800"
            style={{ height: 240 }}
          >
            <MapView
              items={fakeMapItems}
              onPinClick={() => {}}
            />
          </div>
        )}

        {/* Clips grid */}
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-10">
            This board has no clips.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <SharedClipCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Import CTA */}
        <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-4 text-center">
          {items.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                Save this board to your TravelPanel
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mb-3">
                {items.length} clip{items.length !== 1 ? 's' : ''} will be added to your collection.
              </p>
              <button
                onClick={handleImportBoard}
                disabled={importState !== 'idle'}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {importState === 'done' ? (
                  <>
                    <Check size={16} />
                    {items.length} clip{items.length !== 1 ? 's' : ''} saved!
                  </>
                ) : importState === 'importing' ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Save to my TravelPanel
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                Save your own travel inspiration
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mb-3">
                TravelPanel clips spots and wisdom from any social post.
              </p>
              <a
                href="/"
                className="inline-block bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Try TravelPanel →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
