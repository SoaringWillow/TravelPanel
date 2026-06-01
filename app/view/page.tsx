'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Tag } from 'lucide-react';
import { decodeSharedBoard, SharedBoard } from '@/lib/shareBoard';
import { SavedItem } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Read-only clip card ──────────────────────────────────────────────────────

function SharedClipCard({ item }: { item: SharedBoard['items'][number] }) {
  const color = PLATFORM_COLORS[item.platform] ?? '#6366f1';
  const tips = item.substance?.filter((s) => s.type === 'tip' || s.type === 'recommendation') ?? [];
  const warnings = item.substance?.filter((s) => s.type === 'warning') ?? [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {item.thumbnail && (
        <div className="h-32 overflow-hidden bg-gray-100">
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3 space-y-2">
        {/* Platform badge + title */}
        <div className="flex items-start gap-2">
          <span
            className="flex-shrink-0 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5"
            style={{ backgroundColor: color }}
          >
            {PLATFORM_LABELS[item.platform] ?? item.platform}
          </span>
          <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">{item.title}</p>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Locations */}
        {item.locations.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
            <MapPin size={11} />
            <span className="truncate">{item.locations.map((l) => l.name).join(' · ')}</span>
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div className="space-y-1">
            {tips.slice(0, 2).map((tip, i) => (
              <div key={i} className="bg-emerald-50 rounded-lg px-2 py-1.5 border-l-2 border-emerald-300">
                <p className="text-xs text-emerald-900 leading-snug">💡 {tip.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.slice(0, 1).map((w, i) => (
              <div key={i} className="bg-amber-50 rounded-lg px-2 py-1.5 border-l-2 border-amber-300">
                <p className="text-xs text-amber-900 leading-snug">⚠️ {w.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main view page ───────────────────────────────────────────────────────────

export default function SharedBoardViewPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SharedBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const encoded = searchParams.get('d');
    if (!encoded) {
      setError('No board data found in this link.');
      setLoading(false);
      return;
    }

    decodeSharedBoard(encoded)
      .then((board) => {
        setData(board);
        setLoading(false);
      })
      .catch(() => {
        setError('This link appears to be invalid or corrupted.');
        setLoading(false);
      });
  }, [searchParams]);

  // Reconstruct SavedItem shape for MapView
  const mapItems: SavedItem[] = data
    ? data.items
        .filter((i) => i.locations.length > 0)
        .map((i) => ({
          id: i.id,
          url: '',
          platform: i.platform,
          title: i.title,
          description: '',
          thumbnail: i.thumbnail,
          locations: i.locations,
          activities: [],
          tags: i.tags,
          substance: i.substance,
          savedAt: 0,
          enrichmentStatus: 'done' as const,
          retryCount: 0,
        }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4 px-6 text-center">
        <div className="text-5xl">🗺</div>
        <h2 className="text-lg font-bold text-gray-800">Board not found</h2>
        <p className="text-sm text-gray-500">{error}</p>
        <a href="/" className="text-indigo-600 text-sm font-medium hover:underline">
          Open TravelPanel
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 safe-top">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <span className="text-3xl leading-none">{data.board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800 leading-tight">{data.board.name}</h1>
            {data.board.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{data.board.description}</p>
            )}
          </div>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {data.items.length} place{data.items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Shared board banner */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2.5">
        <p className="text-xs text-indigo-600 font-medium text-center">
          Shared board · <a href="/" className="underline hover:text-indigo-800">Save to TravelPanel →</a>
        </p>
      </div>

      {/* Map */}
      {mapItems.length > 0 && (
        <div className="relative bg-gray-200" style={{ height: 220 }}>
          <MapView
            items={mapItems}
            onPinClick={() => {}}
          />
        </div>
      )}

      {/* Clip grid */}
      <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Tag className="text-gray-300 mb-3" size={36} />
            <p className="text-sm text-gray-500">No places in this board.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {data.items.map((item) => (
              <SharedClipCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-6 text-center border-t border-gray-100 bg-white safe-bottom">
        <p className="text-sm text-gray-600 mb-3">
          Planning a trip? Capture inspiration from any app with TravelPanel.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Open TravelPanel
        </a>
      </div>
    </div>
  );
}
