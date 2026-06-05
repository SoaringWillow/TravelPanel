'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import { getAllTrips } from '@/lib/db';
import { Trip } from '@/lib/types';

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts));
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Group trips by month
function groupByMonth(trips: Trip[]): { label: string; trips: Trip[] }[] {
  const groups: Map<string, Trip[]> = new Map();
  for (const trip of trips) {
    const label = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
      new Date(trip.createdAt),
    );
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(trip);
  }
  return Array.from(groups.entries()).map(([label, trips]) => ({ label, trips }));
}

export default function TimelinePage() {
  const router  = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTrips()
      .then((all) => setTrips(all.sort((a, b) => b.createdAt - a.createdAt)))
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByMonth(trips);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-5 safe-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trip History</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {trips.length} plan{trips.length !== 1 ? 's' : ''} generated
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
          <div className="text-5xl mb-4">🗓</div>
          <p className="text-base font-semibold text-gray-700 mb-1">No trips planned yet</p>
          <p className="text-sm text-gray-400">
            Go to a Collection and tap "Plan this trip" to generate your first itinerary.
          </p>
        </div>
      ) : (
        <div className="px-4 pt-5 space-y-8">
          {groups.map(({ label, trips: groupTrips }) => (
            <div key={label}>
              {/* Month label */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <Calendar size={12} />
                  {label}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Trip cards */}
              <div className="space-y-3">
                {groupTrips.map((trip) => {
                  const overview      = trip.plan?.overview ?? '';
                  const dayCount      = trip.days;
                  const destinations  = trip.plan?.days.flatMap((d) => d.locations.map((l) => l.name)) ?? [];
                  const uniqueDests   = [...new Set(destinations)].slice(0, 3);

                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => router.push(`/plan/${trip.boardId}`)}
                      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Board + trip name */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm font-bold text-gray-900 truncate">
                              {trip.name ?? trip.boardName}
                            </span>
                            {trip.name && (
                              <span className="text-xs text-gray-400 truncate">· {trip.boardName}</span>
                            )}
                          </div>

                          {/* Meta: days + date */}
                          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {dayCount} day{dayCount !== 1 ? 's' : ''}
                            </span>
                            <span>{formatRelative(trip.createdAt)}</span>
                            <span className="text-gray-300">{formatDate(trip.createdAt)}</span>
                          </div>

                          {/* Top destinations */}
                          {uniqueDests.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mb-2">
                              <MapPin size={11} className="text-indigo-400 shrink-0" />
                              {uniqueDests.map((d) => (
                                <span
                                  key={d}
                                  className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Overview snippet */}
                          {overview && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                              {overview}
                            </p>
                          )}
                        </div>

                        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
