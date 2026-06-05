'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Globe2, ExternalLink, MapPin, Sparkles } from 'lucide-react';
import { decodeBoardShare, SharedBoard, SharedClip } from '@/lib/shareBoard';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import { Location } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Clip card (read-only) ────────────────────────────────────────────────────

function SharedClipCard({ clip }: { clip: SharedClip }) {
  const color = PLATFORM_COLORS[clip.platform];
  return (
    <a
      href={clip.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-[0.98] group"
    >
      {clip.thumbnail && (
        <div className="h-28 bg-gray-100 overflow-hidden">
          <img
            src={clip.thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3">
        <span
          className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5"
          style={{ background: `${color}18`, color }}
        >
          {PLATFORM_LABELS[clip.platform]}
        </span>
        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5">
          {clip.title}
        </p>
        {clip.locations.length > 0 && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <MapPin size={10} />
            {clip.locations.length} location{clip.locations.length !== 1 ? 's' : ''}
          </p>
        )}
        {(clip.substance?.length ?? 0) > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-gray-50 pt-2">
            {clip.substance!.slice(0, 2).map((s, i) => (
              <div key={i} className="flex gap-1.5">
                <span className="text-xs flex-shrink-0">
                  {s.type === 'tip' ? '💡' : s.type === 'warning' ? '⚠️' : s.type === 'recommendation' ? '⭐' : s.type === 'wisdom' ? '🧠' : s.type === 'context' ? '🌍' : '💬'}
                </span>
                <p className="text-xs text-gray-600 leading-snug line-clamp-2">{s.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SharedBoardPage() {
  const [data, setData] = useState<SharedBoard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) { setError(true); return; }
    const decoded = decodeBoardShare(hash);
    if (!decoded) { setError(true); return; }
    setData(decoded);
  }, []);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid share link</h1>
        <p className="text-sm text-gray-500 mb-6">This link may be expired or corrupted.</p>
        <a href="/" className="text-indigo-600 font-medium text-sm hover:underline">
          Open TravelPanel →
        </a>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </main>
    );
  }

  const allLocations = data.clips.flatMap((c) => c.locations);
  const hasMap = allLocations.length > 0;

  // Build fake SavedItem-like objects for MapView
  const mapItems = data.clips
    .filter((c) => c.locations.length > 0)
    .map((c) => ({
      id: c.id,
      url: c.url,
      title: c.title,
      thumbnail: c.thumbnail,
      platform: c.platform,
      locations: c.locations,
      activities: [],
      tags: c.tags,
      substance: c.substance ?? [],
      savedAt: c.savedAt,
      description: '',
      enrichmentStatus: 'done' as const,
      retryCount: 0,
    }));

  const clipUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share?url=`
    : '/share?url=';

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe2 className="text-indigo-500" size={18} />
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">TravelPanel</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{data.board.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{data.board.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.clips.length} clip{data.clips.length !== 1 ? 's' : ''} · shared{' '}
              {new Date(data.sharedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Map */}
      {hasMap && (
        <div className="relative w-full bg-gray-200" style={{ height: 220 }}>
          <MapView items={mapItems as any} onPinClick={() => {}} />
        </div>
      )}

      {/* Save to TravelPanel banner */}
      <div className="mx-4 mt-4 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Sparkles className="text-indigo-500 flex-shrink-0 mt-0.5" size={16} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-700">Inspired?</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Open any clip to save it to your own TravelPanel collection.
          </p>
        </div>
        <a
          href="/"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex-shrink-0 mt-0.5"
        >
          Open app →
        </a>
      </div>

      {/* Clips grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {data.clips.map((clip) => (
          <SharedClipCard key={clip.id} clip={clip} />
        ))}
      </div>
    </main>
  );
}
