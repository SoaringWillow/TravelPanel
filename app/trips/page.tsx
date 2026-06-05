'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, ChevronRight, Calendar } from 'lucide-react';
import { getAllTrips } from '@/lib/db';
import { Trip } from '@/lib/types';
import NavBar from '@/components/NavBar';

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function tripLocationCount(trip: Trip): number {
  return trip.plan?.days.reduce((sum, d) => sum + d.activities.length, 0) ?? 0;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getAllTrips().then((all) => {
      // Newest first
      setTrips(all.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 safe-top">
        <div className="flex items-center gap-2">
          <Clock className="text-indigo-600" size={22} />
          <h1 className="text-xl font-bold text-gray-800">Trip History</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">All your AI-generated trip plans</p>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-6">
            <div className="text-5xl mb-4">🗺</div>
            <h3 className="font-semibold text-gray-700 mb-2">No trips planned yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Open a board with saved clips and tap "Plan Trip" to generate your first AI itinerary.
            </p>
            <button
              type="button"
              onClick={() => router.push('/boards')}
              className="mt-5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Go to Boards
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const activityCount = tripLocationCount(trip);
              const dayLabel = `${trip.days} day${trip.days !== 1 ? 's' : ''}`;

              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => router.push(`/plan/${trip.boardId}`)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md active:scale-98 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Left: date column */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-xs font-bold text-indigo-600 uppercase">
                        {new Date(trip.createdAt).toLocaleDateString(undefined, { month: 'short' })}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 leading-tight">
                        {new Date(trip.createdAt).getDate()}
                      </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">
                          {trip.name ?? `Trip to ${trip.boardName}`}
                        </span>
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {dayLabel}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5">{trip.boardName}</p>

                      {trip.preferences && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">
                          "{trip.preferences}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {activityCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {activityCount} activit{activityCount !== 1 ? 'ies' : 'y'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatRelativeDate(trip.createdAt)}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
