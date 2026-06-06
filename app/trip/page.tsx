'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation2, X, Loader2, RefreshCw, CheckSquare } from 'lucide-react';
import { getAllItems, getTripsForBoard, saveCheckin } from '@/lib/db';
import { SavedItem, Activity, Trip } from '@/lib/types';
import NavBar from '@/components/NavBar';

// ─── Haversine distance (metres) ─────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// ─── Navigate button ─────────────────────────────────────────────────────────

function navigateTo(lat: number, lng: number, name: string) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const url = isIOS
    ? `maps://?q=${encodeURIComponent(name)}&ll=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, '_blank');
}

// ─── Page ────────────────────────────────────────────────────────────────────

type GeoState = 'idle' | 'loading' | 'ok' | 'denied';

interface Pos { lat: number; lng: number }

export default function TripPage() {
  const router = useRouter();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [boardItems, setBoardItems] = useState<SavedItem[]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [checkedIn, setCheckedIn] = useState<Set<number>>(new Set());

  // ── Load trip data ─────────────────────────────────────────────────────────

  useEffect(() => {
    const id = localStorage.getItem('activeTripBoardId');
    if (!id) { router.replace('/boards'); return; }
    setBoardId(id);

    async function load() {
      const [trips, allItems] = await Promise.all([getTripsForBoard(id!), getAllItems()]);
      const sorted = trips.sort((a, b) => b.createdAt - a.createdAt);
      if (sorted[0]) setTrip(sorted[0]);
      setBoardItems(allItems.filter((i) => i.boardId === id));
    }
    load();
  }, [router]);

  // ── GPS ────────────────────────────────────────────────────────────────────

  const requestGPS = useCallback(() => {
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoState('ok');
      },
      () => setGeoState('denied'),
      { timeout: 10_000, maximumAge: 30_000 }
    );
  }, []);

  useEffect(() => { requestGPS(); }, [requestGPS]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const days = trip?.plan?.days ?? [];
  const activeDay = days[activeDayIdx] ?? null;
  const activities: Activity[] = activeDay?.activities ?? [];

  // Sort activities by time (HH:MM format assumed)
  const sortedActivities = [...activities].sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  // Find the "next" activity: the nearest one by distance when GPS is available
  const nextActivityIdx = pos
    ? sortedActivities.reduce<number>((best, act, i) => {
        const d = haversine(pos.lat, pos.lng, act.location.lat, act.location.lng);
        const bestD = best === -1
          ? Infinity
          : haversine(pos.lat, pos.lng, sortedActivities[best].location.lat, sortedActivities[best].location.lng);
        return d < bestD ? i : best;
      }, -1)
    : 0;

  // Nearby clips (within 2km)
  const nearbyItems = pos
    ? boardItems.flatMap((item) =>
        item.locations
          .filter((loc) => haversine(pos.lat, pos.lng, loc.lat, loc.lng) <= 2000)
          .map((loc) => ({
            item,
            loc,
            dist: haversine(pos.lat, pos.lng, loc.lat, loc.lng),
          }))
      ).sort((a, b) => a.dist - b.dist).slice(0, 8)
    : [];

  // ── End trip ───────────────────────────────────────────────────────────────

  function endTrip() {
    localStorage.removeItem('activeTripBoardId');
    window.dispatchEvent(new Event('storage'));
    router.push('/boards');
  }

  if (!trip) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center">
        <Loader2 size={28} className="text-indigo-500 animate-spin" />
        <p className="text-sm text-gray-400 mt-3">Loading trip…</p>
        <NavBar active="trip" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-12 pb-3 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Active Trip</p>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{trip.boardName}</h1>
          </div>
          <button
            type="button"
            onClick={endTrip}
            className="flex items-center gap-1 text-xs text-red-500 font-medium border border-red-200 dark:border-red-900 rounded-full px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <X size={12} />
            End Trip
          </button>
        </div>

        {/* GPS status */}
        <div className="flex items-center gap-2 mt-2">
          {geoState === 'loading' && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 size={11} className="animate-spin" />
              Getting location…
            </span>
          )}
          {geoState === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live location
            </span>
          )}
          {geoState === 'denied' && (
            <button
              type="button"
              onClick={requestGPS}
              className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium"
            >
              <RefreshCw size={11} />
              Location unavailable — tap to retry
            </button>
          )}
        </div>
      </div>

      {/* Day selector */}
      {days.length > 1 && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {days.map((day, idx) => (
              <button
                key={day.day}
                type="button"
                onClick={() => setActiveDayIdx(idx)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  activeDayIdx === idx
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Day {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-5">

        {/* ── Today's activities ── */}
        {sortedActivities.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              {activeDay?.theme ?? `Day ${activeDayIdx + 1}`}
            </p>

            <div className="space-y-3">
              {sortedActivities.map((activity, idx) => {
                const isNext = idx === nextActivityIdx;
                const dist = pos
                  ? haversine(pos.lat, pos.lng, activity.location.lat, activity.location.lng)
                  : null;

                return (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm overflow-hidden ${
                      isNext
                        ? 'border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-900'
                        : 'border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    {/* Next badge */}
                    {isNext && (
                      <div className="bg-indigo-600 px-4 py-1.5">
                        <p className="text-xs font-bold text-white tracking-wide">
                          {pos ? '📍 Nearest stop' : '▶ Next up'}
                        </p>
                      </div>
                    )}

                    <div className={`p-4 ${isNext ? '' : 'p-3'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              {activity.time}
                            </span>
                            <span className="text-xs text-indigo-500 dark:text-indigo-400">
                              {activity.duration}
                            </span>
                          </div>
                          <p className={`font-semibold text-gray-800 dark:text-gray-100 leading-snug ${isNext ? 'text-base' : 'text-sm'}`}>
                            {activity.name}
                          </p>
                          <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {activity.location.name}
                          </p>
                          {dist !== null && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              🚶 {formatDist(dist)} away
                            </p>
                          )}
                        </div>

                        {/* Navigate button */}
                        <button
                          type="button"
                          onClick={() => navigateTo(activity.location.lat, activity.location.lng, activity.location.name)}
                          className={`flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-xl transition-colors ${
                            isNext
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          aria-label={`Navigate to ${activity.location.name}`}
                        >
                          <Navigation2 size={isNext ? 18 : 15} />
                          <span className="text-[10px] font-medium">Go</span>
                        </button>
                      </div>

                      {/* Tips */}
                      {activity.tips.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {activity.tips.slice(0, 2).map((tip, tIdx) => (
                            <li key={tIdx} className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                              · {tip}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Check in */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (checkedIn.has(idx) || !boardId) return;
                          await saveCheckin({
                            id: crypto.randomUUID(),
                            boardId,
                            activityName: activity.name,
                            locationName: activity.location.name,
                            checkedInAt: Date.now(),
                          });
                          setCheckedIn((prev) => new Set([...prev, idx]));
                        }}
                        className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                          checkedIn.has(idx)
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <CheckSquare size={12} />
                        {checkedIn.has(idx) ? 'Checked in ✓' : 'Check in'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Nearby from your clips ── */}
        {pos && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Nearby from your clips
            </p>

            {nearbyItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                No clips within 2km of your current position.
              </p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {nearbyItems.map(({ item, loc, dist }, idx) => (
                    <motion.div
                      key={`${item.id}-${loc.name}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 flex items-center gap-3"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <MapPin size={16} className="text-indigo-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{loc.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.title}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">🚶 {formatDist(dist)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateTo(loc.lat, loc.lng, loc.name)}
                        className="flex-shrink-0 p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                        aria-label={`Navigate to ${loc.name}`}
                      >
                        <Navigation2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        )}

        {sortedActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-4">🗺</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">No activities for this day</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Generate a plan for this board to get started.</p>
          </div>
        )}
      </div>

      <NavBar active="trip" />
    </div>
  );
}
