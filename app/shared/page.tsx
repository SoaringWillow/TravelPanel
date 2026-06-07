'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Lightbulb, Download, ExternalLink, Tag } from 'lucide-react';
import { decodeBoardShare, SharedBoardPayload } from '@/lib/shareBoard';
import { saveBoard, saveItem, addItemToBoard } from '@/lib/db';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';
import { Board, SavedItem } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

function SharedBoardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const encoded = searchParams.get('d') ?? '';

  const [payload, setPayload]     = useState<SharedBoardPayload | null>(null);
  const [invalid, setInvalid]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported]   = useState(false);

  useEffect(() => {
    if (!encoded) { setInvalid(true); return; }
    const p = decodeBoardShare(encoded);
    if (!p) { setInvalid(true); return; }
    setPayload(p);
  }, [encoded]);

  // Build temporary SavedItem stubs for the map preview (no IDs needed for display)
  const previewItems: SavedItem[] = payload?.items.map((item, i) => ({
    id:               `preview-${i}`,
    url:              item.url,
    platform:         item.platform,
    title:            item.title,
    description:      '',
    thumbnail:        item.thumbnail,
    locations:        item.locations ?? [],
    activities:       item.activities ?? [],
    tags:             item.tags ?? [],
    substance:        item.substance ?? [],
    savedAt:          item.savedAt,
    enrichmentStatus: 'done' as const,
    retryCount:       0,
  })) ?? [];

  const totalLocations = previewItems.reduce((n, i) => n + i.locations.length, 0);
  const totalInsights  = previewItems.reduce((n, i) => n + i.substance.length, 0);

  async function handleImport() {
    if (!payload || importing || imported) return;
    setImporting(true);

    try {
      const board: Board = {
        id:          crypto.randomUUID(),
        name:        payload.board.name,
        emoji:       payload.board.emoji,
        description: payload.board.description,
        itemIds:     [],
        createdAt:   Date.now(),
        updatedAt:   Date.now(),
      };
      await saveBoard(board);

      for (const raw of payload.items) {
        const item: SavedItem = {
          id:               crypto.randomUUID(),
          url:              raw.url,
          platform:         raw.platform,
          title:            raw.title,
          description:      '',
          thumbnail:        raw.thumbnail,
          locations:        raw.locations ?? [],
          activities:       raw.activities ?? [],
          tags:             raw.tags ?? [],
          substance:        raw.substance ?? [],
          savedAt:          raw.savedAt,
          enrichmentStatus: 'done',
          retryCount:       0,
          boardId:          board.id,
        };
        await saveItem(item);
        await addItemToBoard(board.id, item.id);
      }

      setImported(true);
      setTimeout(() => router.push('/boards'), 1500);
    } catch {
      setImporting(false);
    }
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Invalid share link</h2>
        <p className="text-sm text-gray-500 mb-6">This link may have expired or been corrupted.</p>
        <button onClick={() => router.push('/')} className="text-indigo-600 text-sm font-medium">
          ← Go to TravelPanel
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-5">
        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none">{payload.board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{payload.board.name}</h1>
            {payload.board.description && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{payload.board.description}</p>
            )}
            <div className="flex gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={11} /> {totalLocations} location{totalLocations !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Lightbulb size={11} /> {totalInsights} insight{totalInsights !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Tag size={11} /> {payload.items.length} clip{payload.items.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Import CTA */}
        <button
          onClick={handleImport}
          disabled={importing || imported}
          className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
            imported
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-md shadow-indigo-200'
          } disabled:opacity-60`}
        >
          {imported ? (
            '✓ Added to your TravelPanel!'
          ) : importing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Download size={16} />
              Add to my TravelPanel
            </>
          )}
        </button>
      </div>

      {/* Map preview */}
      {totalLocations > 0 && (
        <div className="relative w-full bg-gray-200" style={{ height: '220px' }}>
          <MapView items={previewItems} onPinClick={() => {}} />
        </div>
      )}

      {/* Clip list */}
      <div className="px-4 py-4 space-y-3">
        {payload.items.map((item, i) => {
          const platformColor = PLATFORM_COLORS[item.platform];
          const platformLabel = PLATFORM_LABELS[item.platform];
          return (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                {item.thumbnail ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLDivElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${platformColor}18` }}
                  >
                    {payload.board.emoji}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span
                      className="text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: platformColor }}
                    >
                      {platformLabel}
                    </span>
                    {(item.locations?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                        <MapPin size={10} /> {item.locations.length}
                      </span>
                    )}
                    {(item.substance?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                        <Lightbulb size={10} /> {item.substance.length}
                      </span>
                    )}
                  </div>
                  {item.locations?.[0] && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate">📍 {item.locations[0].name}</p>
                  )}
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
                  aria-label="Open original"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={14} />
                </a>
              </div>
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
