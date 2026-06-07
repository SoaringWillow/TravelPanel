'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Tag, ExternalLink, BookOpen } from 'lucide-react';
import { decodeBoard, SharedBoard } from '@/lib/shareBoard';

function SharedBoardInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('d') ?? '';
  const board = raw ? decodeBoard(raw) : null;

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl">🗺</div>
        <h1 className="text-xl font-bold text-gray-800">Board not found</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          This share link may have expired or be invalid. Ask the sender for a new one.
        </p>
        <a href="/" className="text-indigo-600 text-sm font-medium hover:underline">
          Open TravelPanel →
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">{board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{board.name}</h1>
            <p className="text-xs text-gray-400">
              {board.items.length} place{board.items.length !== 1 ? 's' : ''} · Shared via TravelPanel
            </p>
          </div>
        </div>
      </div>

      {/* Clips */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-12">
        {board.items.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            This board has no clips yet.
          </div>
        )}

        {board.items.map((item) => (
          <SharedClipCard key={item.id} item={item} />
        ))}

        {/* Powered by footer */}
        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <BookOpen size={15} />
            Open TravelPanel — save your own trips
          </a>
          <p className="text-xs text-gray-400 mt-3">
            TravelPanel — clip travel inspiration, plan smarter trips
          </p>
        </div>
      </div>
    </div>
  );
}

function SharedClipCard({ item }: { item: SharedBoard['items'][number] }) {
  const clipUrl = `/share?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="w-full h-40 object-cover bg-gray-100"
        />
      )}
      <div className="p-4 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm leading-snug">{item.title}</h2>

        {/* Locations */}
        {item.locations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.locations.slice(0, 4).map((loc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full"
              >
                <MapPin size={9} />
                {loc.name}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Substance snippet */}
        {item.substance.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 space-y-1">
            {item.substance.slice(0, 2).map((s, i) => (
              <p key={i} className="text-xs text-amber-800 leading-relaxed">
                {s.type === 'tip' && '💡'}
                {s.type === 'warning' && '⚠️'}
                {s.type === 'recommendation' && '⭐'}
                {s.type === 'wisdom' && '🧠'}
                {s.type === 'opinion' && '💬'}
                {s.type === 'context' && '🌍'}
                {' '}{s.content}
              </p>
            ))}
          </div>
        )}

        {/* CTA */}
        <a
          href={clipUrl}
          className="flex items-center justify-center gap-1.5 w-full border border-indigo-200 text-indigo-600 text-xs font-semibold py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          <ExternalLink size={12} />
          Clip to my TravelPanel
        </a>
      </div>
    </div>
  );
}

export default function SharedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <SharedBoardInner />
    </Suspense>
  );
}
