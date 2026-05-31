'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';
import { getAllItems, getBoardById } from '@/lib/db';
import { SavedItem, Board } from '@/lib/types';
import NavBar from '@/components/NavBar';

// ── Haversine distance ────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtElapsed(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const { boardId } = useParams() as { boardId: string };
  const router = useRouter();

  const [board,   setBoard]   = useState<Board | null>(null);
  const [entries, setEntries] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [b, all] = await Promise.all([
        getBoardById(boardId),
        getAllItems(),
      ]);
      setBoard(b ?? null);

      const checked = all
        .filter((i) => i.boardId === boardId && i.checkedInAt != null)
        .sort((a, b) => (a.checkedInAt ?? 0) - (b.checkedInAt ?? 0));

      setEntries(checked);
      setLoading(false);
    }
    load();
  }, [boardId]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 scroll-safe-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pb-4 z-10 header-safe-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">
              {board ? `${board.emoji} ${board.name}` : 'Trip timeline'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {entries.length > 0
                ? `${entries.length} place${entries.length !== 1 ? 's' : ''} visited`
                : 'No check-ins yet'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5">
        {entries.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <MapPin size={28} className="text-indigo-400" />
            </div>
            <h2 className="text-base font-bold text-gray-700 mb-2">No check-ins yet</h2>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              While on your trip, open a clip and tap{' '}
              <span className="font-medium text-gray-600">"Check in here"</span>{' '}
              to build your timeline.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/boards/${boardId}`)}
              className="mt-6 text-sm font-semibold text-indigo-600 hover:underline"
            >
              Go to board →
            </button>
          </div>
        ) : (
          /* Timeline */
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-indigo-100" />

            <div className="space-y-0">
              {entries.map((item, idx) => {
                const prevItem   = idx > 0 ? entries[idx - 1] : null;
                const prevCoords = prevItem?.locations[0];
                const currCoords = item.locations[0];

                const distKm =
                  prevCoords && currCoords
                    ? haversineKm(prevCoords.lat, prevCoords.lng, currCoords.lat, currCoords.lng)
                    : null;

                const elapsed =
                  prevItem?.checkedInAt && item.checkedInAt
                    ? item.checkedInAt - prevItem.checkedInAt
                    : null;

                return (
                  <div key={item.id}>
                    {/* Between-stop connector */}
                    {(distKm != null || elapsed != null) && (
                      <div className="flex items-center gap-3 pl-12 py-2">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {distKm != null && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {fmtDist(distKm)}
                            </span>
                          )}
                          {elapsed != null && (
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {fmtElapsed(elapsed)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Entry row */}
                    <div className="flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 border-4 border-white shadow-sm flex items-center justify-center z-10">
                        <span className="text-white text-xs font-bold">{idx + 1}</span>
                      </div>

                      {/* Card */}
                      <button
                        type="button"
                        onClick={() => router.push(`/?itemId=${item.id}`)}
                        className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-1 text-left hover:shadow-md transition-shadow active:scale-[0.99]"
                      >
                        <div className="flex">
                          {item.thumbnail && (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-16 h-16 object-cover flex-shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="flex-1 px-3 py-2.5 min-w-0">
                            <p className="text-xs font-medium text-gray-400 mb-0.5">
                              {item.checkedInAt ? fmtTime(item.checkedInAt) : ''}
                            </p>
                            <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                              {item.title}
                            </p>
                            {item.locations[0] && (
                              <p className="text-xs text-indigo-500 mt-1 truncate">
                                📍 {item.locations[0].name}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
