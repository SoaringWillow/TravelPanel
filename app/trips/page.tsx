'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, MapPin, Calendar, Navigation } from 'lucide-react';
import { Trip } from '@/lib/types';
import { getAllTrips, deleteTrip } from '@/lib/db';
import NavBar from '@/components/NavBar';

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTrips()
      .then((t) => setTrips(t.sort((a, b) => b.createdAt - a.createdAt)))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(tripId: string) {
    await deleteTrip(tripId);
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  }

  function openPlan(trip: Trip) {
    router.push(`/plan/${trip.boardId}?tripId=${trip.id}`);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Trip History</h1>
          </div>
          <span className="ml-auto bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
            {trips.length}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-24 shimmer" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-5xl mb-4">✈️</div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No trips yet</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Generate your first plan from a board to see your trip history here.
            </p>
            <button
              type="button"
              onClick={() => router.push('/boards')}
              className="bg-indigo-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Go to Boards
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {trips.map((trip) => {
                const date = new Date(trip.createdAt).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
                });
                const activityCount = trip.plan?.days?.flatMap((d) => d.activities).length ?? 0;
                const visitedCount = trip.actualTimeline?.logs.filter((l) => l.status === 'visited').length ?? 0;

                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-transparent dark:border-gray-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => openPlan(trip)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                          ✈️
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                            {trip.name ?? `Plan — ${trip.boardName}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{trip.boardName}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar size={11} />
                              {trip.days} day{trip.days !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin size={11} />
                              {activityCount} activities
                            </span>
                            {visitedCount > 0 && (
                              <span className="text-xs text-emerald-600 font-medium">
                                ✓ {visitedCount} visited
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-400">{date}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                            aria-label="Delete trip"
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      <NavBar active="settings" />
    </div>
  );
}
