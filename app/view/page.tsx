'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Tag, Lightbulb, Download, ArrowLeft, AlertTriangle } from 'lucide-react';
import { decodeBoardFromSharing, SharedBoardPayload } from '@/lib/shareBoard';
import { saveItem, saveBoard, addItemToBoard } from '@/lib/db';
import { Board, SavedItem } from '@/lib/types';
import { track } from '@/lib/analytics';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const SUBSTANCE_ICONS: Record<string, string> = {
  tip: '💡', warning: '⚠️', opinion: '💬',
  wisdom: '🧠', context: '🌍', recommendation: '⭐',
};

// ─── Inner component ─────────────────────────────────────────────────────────

function ViewPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const data         = searchParams.get('data') ?? '';

  const [payload, setPayload]         = useState<SharedBoardPayload | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [expandedItem, setExpanded]   = useState<number | null>(null);

  useEffect(() => {
    if (!data) { setError(true); setLoading(false); return; }
    decodeBoardFromSharing(data)
      .then((p) => {
        if (!p) { setError(true); } else { setPayload(p); }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [data]);

  async function handleSaveToMyTravelPanel() {
    if (!payload || saving || saved) return;
    setSaving(true);

    const boardId = crypto.randomUUID();
    const newBoard: Board = {
      id: boardId,
      name: payload.board.name,
      emoji: payload.board.emoji,
      description: payload.board.description,
      itemIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveBoard(newBoard);

    for (const item of payload.items) {
      const newItem: SavedItem = {
        id: crypto.randomUUID(),
        url: item.url,
        platform: item.platform,
        title: item.title,
        description: item.description,
        thumbnail: item.thumbnail,
        locations: item.locations,
        activities: item.activities,
        tags: item.tags,
        substance: item.substance,
        savedAt: Date.now(),
        enrichmentStatus: 'done',
        retryCount: 0,
        boardId,
      };
      await saveItem(newItem);
      await addItemToBoard(boardId, newItem.id);
    }

    track('shared_board_saved', { itemCount: payload.items.length });
    setSaving(false);
    setSaved(true);
  }

  // Flatten all locations for the map
  const allItems: SavedItem[] = (payload?.items ?? []).map((item, i) => ({
    id: String(i),
    url: item.url,
    platform: item.platform,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    locations: item.locations,
    activities: item.activities,
    tags: item.tags,
    substance: item.substance,
    savedAt: Date.now(),
    enrichmentStatus: 'done' as const,
    retryCount: 0,
  }));

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400 animate-pulse">Decoding shared board…</div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle size={48} className="text-red-300" />
        <h1 className="text-lg font-bold text-gray-800">Invalid share link</h1>
        <p className="text-sm text-gray-500">This link may be broken or expired.</p>
        <button onClick={() => router.push('/')} className="text-indigo-600 text-sm font-medium">
          Open TravelPanel →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">Shared Board</p>
            <h1 className="text-base font-bold text-gray-900 truncate">
              {payload.board.emoji} {payload.board.name}
            </h1>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
            {payload.items.length} clip{payload.items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {payload.board.description && (
          <p className="text-sm text-gray-600 mt-2 ml-10">{payload.board.description}</p>
        )}
      </header>

      {/* Map preview */}
      {allItems.some((i) => i.locations.length > 0) && (
        <div className="h-48 bg-gray-200">
          <MapView items={allItems} onPinClick={() => {}} />
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Save CTA */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">Save to My TravelPanel</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              Import all {payload.items.length} clip{payload.items.length !== 1 ? 's' : ''} with locations &amp; wisdom into your own collection.
            </p>
          </div>
          <button
            onClick={handleSaveToMyTravelPanel}
            disabled={saving || saved}
            className={`flex-shrink-0 flex items-center gap-1.5 font-semibold text-xs px-3 py-2 rounded-xl transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60'
            }`}
          >
            {saving ? (
              <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full inline-block" />
            ) : (
              <Download size={13} />
            )}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Clip list */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Clips ({payload.items.length})
          </h2>
          <div className="space-y-3">
            {payload.items.map((item, i) => {
              const isOpen = expandedItem === i;
              const substanceCount = item.substance?.length ?? 0;

              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Thumbnail */}
                  {item.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-32 object-cover"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}

                  <div className="p-3.5">
                    <h3 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    )}

                    {/* Locations */}
                    {item.locations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.locations.slice(0, 4).map((loc, j) => (
                          <span key={j} className="flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            <MapPin size={9} />
                            {loc.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            <Tag size={8} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Substance toggle */}
                    {substanceCount > 0 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : i)}
                        className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 font-semibold"
                      >
                        <Lightbulb size={12} />
                        {substanceCount} tip{substanceCount !== 1 ? 's' : ''} &amp; wisdom
                        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                      </button>
                    )}

                    {isOpen && item.substance && (
                      <div className="mt-2 space-y-2">
                        {item.substance.map((s, j) => (
                          <div key={j} className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">
                              {SUBSTANCE_ICONS[s.type] ?? '💡'} {s.type}
                            </p>
                            <p className="text-xs text-amber-900 leading-relaxed">{s.content}</p>
                            {s.source_quote && (
                              <p className="text-[10px] italic text-amber-600 mt-1">"{s.source_quote}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Sticky save bar */}
      {!saved && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3">
          <button
            onClick={handleSaveToMyTravelPanel}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            <Download size={16} />
            {saving ? 'Saving…' : `Save "${payload.board.name}" to TravelPanel`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
      </div>
    }>
      <ViewPageInner />
    </Suspense>
  );
}
