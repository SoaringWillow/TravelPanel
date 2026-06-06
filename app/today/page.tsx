'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Navigation2, MapPin, CheckCircle2, Circle } from 'lucide-react';
import { Trip, Activity, Location } from '@/lib/types';
import { getAllTrips } from '@/lib/db';
import NavBar from '@/components/NavBar';

const RouteMapView = dynamic(() => import('@/components/RouteMapView'), { ssr: false });

const VISITED_PREFIX = 'visitedActivities:';

function isActiveToday(startDate: string, days: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  return today >= start && today <= end;
}

function todayDayIndex(startDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - start.getTime()) / 86400000);
}

function visitedKey(tripId: string, dayIdx: number, actIdx: number): string {
  return `${VISITED_PREFIX}${tripId}:${dayIdx}:${actIdx}`;
}

function haversineKm(a: Location, b: Location): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function TodayPage() {
  const router = useRouter();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  // Load active trip
  useEffect(() => {
    getAllTrips().then((trips) => {
      const found = trips.find((t) => t.startDate && isActiveToday(t.startDate, t.days));
      setActiveTrip(found ?? null);
      if (found) {
        const dayIdx = todayDayIndex(found.startDate!);
        const activities = found.plan?.days?.[dayIdx]?.activities ?? [];
        const visited = new Set<string>();
        activities.forEach((_, i) => {
          if (localStorage.getItem(visitedKey(found.id, dayIdx, i))) {
            visited.add(visitedKey(found.id, dayIdx, i));
          }
        });
        setVisitedSet(visited);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const toggleVisited = useCallback((tripId: string, dayIdx: number, actIdx: number) => {
    const key = visitedKey(tripId, dayIdx, actIdx);
    setVisitedSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        localStorage.removeItem(key);
      } else {
        next.add(key);
        localStorage.setItem(key, '1');
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-5">
            <Navigation2 size={36} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No active trip</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6 leading-relaxed">
            When you generate a plan with a start date that falls today, your trip activities appear here.
          </p>
          <button
            type="button"
            onClick={() => router.push('/boards')}
            className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            View my boards
          </button>
        </div>
        <NavBar active="today" />
      </div>
    );
  }

  const dayIdx = todayDayIndex(activeTrip.startDate!);
  const todayPlan = activeTrip.plan?.days?.[dayIdx];
  const activities: Activity[] = todayPlan?.activities ?? [];
  const firstUnvisited = activities.find(
    (_, i) => !visitedSet.has(visitedKey(activeTrip.id, dayIdx, i))
  );
  const nextStop = firstUnvisited ?? null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center gap-2 mb-1">
          <Navigation2 size={20} className="text-green-500" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">On-Trip Mode</h1>
          <span className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            Live
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Day {dayIdx + 1} — {activeTrip.boardName}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Mini map */}
        {todayPlan && (
          <div className="h-40 mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
            <RouteMapView
              items={[]}
              plan={{ days: [todayPlan] }}
              activeDayIndex={0}
            />
          </div>
        )}

        {/* Next stop card */}
        {nextStop && (
          <div className="mx-4 mt-4 bg-indigo-600 rounded-2xl px-4 py-4 text-white">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">Next stop</p>
            <h2 className="text-base font-bold truncate">{nextStop.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <MapPin size={12} className="text-indigo-200 flex-shrink-0" />
              <p className="text-xs text-indigo-200 truncate">{nextStop.location.name}</p>
              {gps && (
                <span className="text-xs text-indigo-200 ml-auto flex-shrink-0">
                  {haversineKm(
                    { lat: gps.lat, lng: gps.lng, name: 'You' },
                    nextStop.location
                  ).toFixed(1)} km away
                </span>
              )}
            </div>
          </div>
        )}

        {/* Activity checklist */}
        <div className="px-4 mt-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Today&apos;s activities
          </h2>
          <div className="space-y-2">
            {activities.map((activity, aIdx) => {
              const key = visitedKey(activeTrip.id, dayIdx, aIdx);
              const visited = visitedSet.has(key);
              return (
                <button
                  key={aIdx}
                  type="button"
                  onClick={() => toggleVisited(activeTrip.id, dayIdx, aIdx)}
                  className={`w-full flex items-start gap-3 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border text-left transition-all active:scale-[0.98] ${
                    visited
                      ? 'border-green-200 dark:border-green-800 opacity-60'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {visited
                    ? <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                    : <Circle size={20} className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug truncate ${visited ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {activity.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {activity.time} · {activity.duration}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {activities.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              No activities planned for today.
            </p>
          )}
        </div>
      </div>

      <NavBar active="today" />
    </div>
  );
}
