'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Navigation2,
  MapPin,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
  Footprints,
  BarChart2,
} from 'lucide-react';
import { Board, Trip, Activity, DayPlan } from '@/lib/types';
import { getBoardById, getTripsForBoard } from '@/lib/db';
import { haversineKm, formatDistance, mapsDeepLink } from '@/lib/geo';

const TripMapView = dynamic(() => import('@/components/TripMapView'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadChecked(tripId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`trip-checked-${tripId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(tripId: string, checked: Set<string>) {
  try {
    localStorage.setItem(`trip-checked-${tripId}`, JSON.stringify([...checked]));
  } catch { /* quota */ }
}

function activityKey(dayIdx: number, actIdx: number) {
  return `${dayIdx}-${actIdx}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TripModePage() {
  const params  = useParams();
  const router  = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard]           = useState<Board | null>(null);
  const [trip, setTrip]             = useState<Trip | null>(null);
  const [loading, setLoading]       = useState(true);

  const [position, setPosition]     = useState<UserPosition | null>(null);
  const [gpsError, setGpsError]     = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);

  const [activeDayIdx, setActiveDayIdx]   = useState(0);
  const [checked, setChecked]             = useState<Set<string>>(new Set());
  const [expandedIdx, setExpandedIdx]     = useState<number | null>(null);
  const [showMap, setShowMap]             = useState(true);

  const watchId = useRef<number | null>(null);

  // ── Load board + latest trip ─────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [b, trips] = await Promise.all([
          getBoardById(boardId),
          getTripsForBoard(boardId),
        ]);
        setBoard(b ?? null);
        if (trips.length > 0) {
          const latest = trips.sort((a, b) => b.createdAt - a.createdAt)[0];
          setTrip(latest);
          setChecked(loadChecked(latest.id));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boardId]);

  // ── GPS tracking ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device');
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsLoading(false);
        setGpsError(null);
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? 'Location access denied. Enable in device settings.'
            : 'Unable to get location. Check GPS signal.'
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  // ── Check/uncheck activity ────────────────────────────────────────────────

  const toggleChecked = useCallback(
    (dayIdx: number, actIdx: number) => {
      if (!trip) return;
      const key = activityKey(dayIdx, actIdx);
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        saveChecked(trip.id, next);
        return next;
      });
    },
    [trip]
  );

  // ── Derived ───────────────────────────────────────────────────────────────

  const days: DayPlan[] = trip?.plan?.days ?? [];
  const activeDay: DayPlan | null = days[activeDayIdx] ?? null;

  const activitiesWithDistance: Array<Activity & { distanceKm: number | null; key: string }> =
    (activeDay?.activities ?? []).map((act, i) => ({
      ...act,
      key: activityKey(activeDayIdx, i),
      distanceKm:
        position
          ? haversineKm(position.lat, position.lng, act.location.lat, act.location.lng)
          : null,
    }));

  const completedCount = activitiesWithDistance.filter((a) => checked.has(a.key)).length;
  const totalCount     = activitiesWithDistance.length;
  const progress       = totalCount > 0 ? completedCount / totalCount : 0;

  // ── Loading / empty states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400 animate-pulse">Loading trip…</div>
      </div>
    );
  }

  if (!trip || !trip.plan || days.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center gap-4">
        <Footprints size={48} className="text-gray-300" />
        <h2 className="text-lg font-bold text-gray-800">No trip plan yet</h2>
        <p className="text-sm text-gray-500">
          Generate a plan for {board?.name ?? 'this board'} first, then start On-Trip mode.
        </p>
        <button
          onClick={() => router.push(`/plan/${boardId}`)}
          className="bg-indigo-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Create Plan →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">On-Trip Mode</p>
            <h1 className="text-base font-bold text-gray-900 truncate">
              {board?.emoji} {board?.name ?? 'Trip'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {/* GPS indicator */}
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              gpsLoading  ? 'bg-yellow-50 text-yellow-600' :
              gpsError    ? 'bg-red-50 text-red-500' :
                            'bg-green-50 text-green-600'
            }`}>
              <Compass size={12} className={gpsLoading ? 'animate-spin' : ''} />
              {gpsLoading ? 'Finding…' : gpsError ? 'No GPS' : 'Live'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Day {activeDayIdx + 1} progress</span>
              <span>{completedCount}/{totalCount} done</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── Map toggle ─────────────────────────────────────────────────── */}
      {showMap && (
        <div className="h-48 flex-shrink-0 relative">
          <TripMapView
            activities={activitiesWithDistance}
            userPosition={position}
            checkedKeys={checked}
          />
          <button
            onClick={() => setShowMap(false)}
            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs text-gray-600 px-2.5 py-1 rounded-full shadow-sm border border-gray-200"
          >
            Hide map
          </button>
        </div>
      )}
      {!showMap && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setShowMap(true)}
            className="text-xs text-indigo-600 font-medium flex items-center gap-1"
          >
            <MapPin size={12} /> Show map
          </button>
        </div>
      )}

      {/* ── Day selector ────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0 scrollbar-none">
        {days.map((day, i) => {
          const dayActivities = day.activities.map((_, j) => activityKey(i, j));
          const dayDone = dayActivities.filter((k) => checked.has(k)).length;
          const isActive = i === activeDayIdx;
          return (
            <button
              key={i}
              onClick={() => { setActiveDayIdx(i); setExpandedIdx(null); }}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>Day {day.day}</span>
              {dayActivities.length > 0 && (
                <span className={`text-[10px] mt-0.5 ${isActive ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {dayDone}/{dayActivities.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Day theme ───────────────────────────────────────────────────── */}
      {activeDay && (
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex-shrink-0">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Today&apos;s theme</p>
          <p className="text-sm font-medium text-indigo-900 mt-0.5">{activeDay.theme}</p>
        </div>
      )}

      {/* ── GPS error banner ─────────────────────────────────────────────── */}
      {gpsError && (
        <div className="px-4 py-2.5 bg-yellow-50 border-b border-yellow-200 flex-shrink-0">
          <p className="text-xs text-yellow-700">{gpsError} — distances unavailable.</p>
        </div>
      )}

      {/* ── Activity list ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 space-y-3 pb-8">
          {/* Summary link (shown once any activity is checked off) */}
          {trip && completedCount > 0 && (
            <button
              onClick={() => router.push(`/summary/${trip.id}`)}
              className="w-full flex items-center justify-center gap-2 border border-indigo-200 text-indigo-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <BarChart2 size={15} />
              View Trip Summary
            </button>
          )}
          {activitiesWithDistance.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">
              No activities planned for this day.
            </div>
          )}

          {activitiesWithDistance.map((act, i) => {
            const isDone  = checked.has(act.key);
            const isOpen  = expandedIdx === i;
            const hasTips = (act.tips?.length ?? 0) > 0 || (act.sourcedTips?.length ?? 0) > 0;

            return (
              <div
                key={act.key}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  isDone ? 'border-green-200 opacity-70' : 'border-gray-200'
                }`}
              >
                {/* Main row */}
                <div className="px-4 py-3 flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleChecked(activeDayIdx, i)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {isDone ? (
                      <CheckCircle2 size={22} className="text-green-500" />
                    ) : (
                      <Circle size={22} className="text-gray-300" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm leading-tight ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {act.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={11} />
                            {act.time}
                            {act.duration && ` · ${act.duration}`}
                          </span>
                          {act.distanceKm !== null && (
                            <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                              <MapPin size={11} />
                              {formatDistance(act.distanceKm)} away
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{act.location.name}</p>
                      </div>

                      {/* Navigate button */}
                      <a
                        href={mapsDeepLink(act.location.lat, act.location.lng, act.location.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation2 size={12} />
                        Go
                      </a>
                    </div>
                  </div>
                </div>

                {/* Expand row for tips */}
                {hasTips && (
                  <>
                    <button
                      onClick={() => setExpandedIdx(isOpen ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <span>Tips &amp; wisdom</span>
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-3 pt-1 space-y-2 bg-gray-50">
                        {act.tips?.map((tip, j) => (
                          <p key={j} className="text-xs text-gray-600 leading-relaxed flex gap-2">
                            <span className="text-gray-400 flex-shrink-0">•</span>
                            {tip}
                          </p>
                        ))}
                        {act.sourcedTips?.map((tip, j) => (
                          <div key={`src-${j}`} className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2">
                            <p className="text-xs text-emerald-800 leading-relaxed">{tip.content}</p>
                            <p className="text-[10px] text-emerald-600 mt-1">from your clip: {tip.sourceTitle}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
