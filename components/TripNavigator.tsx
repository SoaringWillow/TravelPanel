'use client';

import { useEffect, useRef, useCallback } from 'react';
import { TripPlan, Activity } from '@/lib/types';
import { Navigation, ChevronLeft, ChevronRight, X, MapPin, Clock, Footprints } from 'lucide-react';

// ── Haversine distance in metres ─────────────────────────────────────────────

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function walkMinutes(m: number): number {
  return Math.ceil(m / 80); // avg walking speed ~80 m/min
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserLocation {
  lat: number;
  lng: number;
}

export interface TripNavigatorProps {
  plan: TripPlan;
  activeDayIndex: number;
  activityIndex: number;
  userLocation: UserLocation | null;
  onEnd: () => void;
  onAdvance: () => void;
  onPrevious: () => void;
  onDayChange: (day: number) => void;
  onActivityChange: (idx: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripNavigator({
  plan,
  activeDayIndex,
  activityIndex,
  userLocation,
  onEnd,
  onAdvance,
  onPrevious,
  onDayChange,
  onActivityChange,
}: TripNavigatorProps) {
  const dayPlan     = plan.days[activeDayIndex];
  const activities  = dayPlan?.activities ?? [];
  const current     = activities[activityIndex] ?? null;
  const next        = activities[activityIndex + 1] ?? null;
  const autoAdvanced = useRef(false);

  // Distance from user to current and next activity
  const distToCurrent = userLocation && current?.location
    ? distanceM(userLocation.lat, userLocation.lng, current.location.lat, current.location.lng)
    : null;
  const distToNext = userLocation && next?.location
    ? distanceM(userLocation.lat, userLocation.lng, next.location.lat, next.location.lng)
    : null;

  // Auto-advance when within 300m of the NEXT stop
  useEffect(() => {
    if (!next || distToNext === null) return;
    if (distToNext < 300 && !autoAdvanced.current) {
      autoAdvanced.current = true;
      onAdvance();
    }
    if (distToNext > 500) {
      autoAdvanced.current = false; // reset for next transition
    }
  }, [distToNext, next, onAdvance]);

  const openMapsNav = useCallback((activity: Activity) => {
    if (!activity.location) return;
    const { lat, lng, name } = activity.location;
    // On iOS, open Apple Maps; on Android/other, Google Maps
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://?daddr=${lat},${lng}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking&destination_place_name=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  }, []);

  if (!dayPlan || !current) return null;

  const totalStops   = activities.length;
  const stopLabel    = `Stop ${activityIndex + 1} of ${totalStops}`;
  const isLastStop   = activityIndex >= activities.length - 1;
  const isFirstStop  = activityIndex === 0;
  const isLastDay    = activeDayIndex >= plan.days.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[2000] pointer-events-none">
      {/* Frosted card */}
      <div
        className="pointer-events-auto mx-auto max-w-lg bg-white/96 backdrop-blur-lg rounded-t-3xl shadow-2xl"
        style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              <Navigation size={11} />
              On Trip
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Day {activeDayIndex + 1} · {stopLabel}
            </span>
          </div>
          <button
            onClick={onEnd}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="End trip"
          >
            <X size={17} />
          </button>
        </div>

        {/* Current stop */}
        <div className="px-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 truncate">{current.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {current.time && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={11} /> {current.time}
                  </span>
                )}
                {current.duration && (
                  <span className="text-xs text-gray-400">{current.duration}</span>
                )}
                {distToCurrent !== null && (
                  <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    <Footprints size={11} />
                    {formatDist(distToCurrent)} · ~{walkMinutes(distToCurrent)} min walk
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => openMapsNav(current)}
              className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <Navigation size={13} />
              Go
            </button>
          </div>

          {/* Tips preview */}
          {current.tips?.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 line-clamp-2 italic">
              💡 {current.tips[0]}
            </div>
          )}
        </div>

        {/* Next stop */}
        {next ? (
          <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-gray-400 font-medium flex-shrink-0">Next →</span>
                <span className="text-sm text-gray-700 font-medium truncate">{next.name}</span>
              </div>
              {distToNext !== null && (
                <span className="flex-shrink-0 text-xs text-gray-400 ml-3">
                  <MapPin size={11} className="inline mb-0.5" /> {formatDist(distToNext)}
                </span>
              )}
            </div>
          </div>
        ) : !isLastDay ? (
          <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100">
            <span className="text-xs text-gray-400">
              Last stop of Day {activeDayIndex + 1} · Day {activeDayIndex + 2} starts tomorrow
            </span>
          </div>
        ) : (
          <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
            <span className="text-xs text-emerald-600 font-medium">🎉 Final stop of the trip!</span>
          </div>
        )}

        {/* Navigation controls */}
        <div className="flex items-center justify-between px-4 py-3 pb-safe">
          <button
            onClick={isFirstStop ? undefined : onPrevious}
            disabled={isFirstStop && activeDayIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-default text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          {/* Day dots */}
          {plan.days.length > 1 && (
            <div className="flex gap-1.5">
              {plan.days.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { onDayChange(i); onActivityChange(0); }}
                  className={`rounded-full transition-all ${
                    i === activeDayIndex
                      ? 'w-4 h-2 bg-indigo-600'
                      : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Day ${i + 1}`}
                />
              ))}
            </div>
          )}

          <button
            onClick={isLastStop && isLastDay ? onEnd : onAdvance}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isLastStop && isLastDay
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isLastStop && isLastDay ? 'Done' : 'Next'}
            {!(isLastStop && isLastDay) && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
