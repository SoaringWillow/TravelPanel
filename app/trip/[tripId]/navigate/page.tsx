'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Navigation2, ChevronLeft, ChevronRight, Map as MapIcon, ClipboardList } from 'lucide-react';
import { getTripById } from '@/lib/db';
import type { Trip } from '@/lib/types';
import type { NavStop } from '@/components/NavigateMapView';

const NavigateMapView = dynamic(() => import('@/components/NavigateMapView'), { ssr: false });

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NavigatePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<NavStop[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    getTripById(tripId).then((t) => {
      if (!t?.plan) return;
      setTrip(t);
      const flat: NavStop[] = [];
      t.plan.days.forEach((day) => {
        day.activities.forEach((activity) => {
          flat.push({ activity, dayNum: day.day, globalIdx: flat.length });
        });
      });
      setStops(flat);
    });
  }, [tripId]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('GPS not supported');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsError(null);
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const activeStop = stops[activeIdx] ?? null;

  const distanceKm =
    userLat !== null && userLng !== null && activeStop
      ? haversineKm(userLat, userLng, activeStop.activity.location.lat, activeStop.activity.location.lng)
      : null;

  const etaMinutes = distanceKm !== null ? Math.round((distanceKm / 5) * 60) : null;

  function openDirections() {
    if (!activeStop) return;
    const { lat, lng, name } = activeStop.activity.location;
    const q = encodeURIComponent(name);
    // maps:// opens Apple Maps on iOS; falls back to browser on desktop
    const iosUrl = `maps://?daddr=${lat},${lng}&dirflg=w`;
    const webUrl = `https://maps.apple.com/?daddr=${lat},${lng}&q=${q}&dirflg=w`;
    window.location.href = iosUrl;
    setTimeout(() => window.open(webUrl, '_blank'), 300);
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-gray-900">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <NavigateMapView stops={stops} activeIdx={activeIdx} userLat={userLat} userLng={userLng} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-12 pb-5 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto p-2 bg-white/20 backdrop-blur-sm rounded-full text-white active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{trip.boardName}</p>
          <p className="text-white/70 text-xs">{stops.length} stops · {trip.days} day{trip.days !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => router.push(`/trip/${tripId}/timeline`)}
          className="pointer-events-auto p-2 bg-white/20 backdrop-blur-sm rounded-full text-white active:scale-95 transition-transform"
          title="Log Trip"
        >
          <ClipboardList size={18} />
        </button>
        {gpsError && (
          <span className="pointer-events-auto text-amber-300 text-xs bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            No GPS
          </span>
        )}
      </div>

      {/* Bottom HUD */}
      {activeStop && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-8">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Stop {activeIdx + 1} / {stops.length} · Day {activeStop.dayNum}
            </span>
            <span className="text-xs text-gray-400">{activeStop.activity.time}</span>
          </div>

          {/* Location name + activity */}
          <h2 className="text-lg font-bold text-gray-900 leading-tight mt-2 mb-0.5">
            {activeStop.activity.location.name}
          </h2>
          <p className="text-sm text-gray-500 mb-3 line-clamp-1">{activeStop.activity.name}</p>

          {/* Distance / ETA row */}
          {distanceKm !== null ? (
            <div className="flex items-center gap-3 mb-4 bg-gray-50 rounded-xl px-3 py-2">
              <Navigation2 size={15} className="text-indigo-500 flex-shrink-0" />
              <span className="text-sm font-bold text-gray-800">
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} m`
                  : `${distanceKm.toFixed(1)} km`}
              </span>
              <span className="text-xs text-gray-400">
                ~{etaMinutes} min walk
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-xl px-3 py-2">
              <Navigation2 size={15} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400">Waiting for GPS…</span>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={openDirections}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm"
            >
              <MapIcon size={15} />
              Directions
            </button>

            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.min(stops.length - 1, i + 1))}
              disabled={activeIdx === stops.length - 1}
              className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Next stop preview */}
          {activeIdx < stops.length - 1 && (
            <p className="text-center text-xs text-gray-400 mt-3">
              Next: {stops[activeIdx + 1].activity.location.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
