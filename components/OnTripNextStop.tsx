'use client';

import { Navigation, MapPin, CheckCircle2, ExternalLink } from 'lucide-react';
import { Activity } from '@/lib/types';

interface Props {
  activity: Activity;
  dayIdx: number;
  actIdx: number;
  userPosition: { lat: number; lng: number } | null;
  isChecked: boolean;
  onCheckIn: () => void;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMapsUrl(lat: number, lng: number): string {
  // Apple Maps deep link on iOS; Google Maps on others
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`;
  return `https://maps.google.com/?daddr=${lat},${lng}&travelmode=walking`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatWalkingTime(km: number): string {
  const mins = Math.round((km / 5) * 60); // ~5 km/h walking
  if (mins < 2) return '< 2 min walk';
  return `~${mins} min walk`;
}

export function OnTripNextStop({ activity, userPosition, isChecked, onCheckIn }: Props) {
  const { lat, lng, name } = activity.location;
  const distance = userPosition ? haversineKm(userPosition.lat, userPosition.lng, lat, lng) : null;
  const mapsUrl = getMapsUrl(lat, lng);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[2000] safe-bottom">
      <div className="mx-4 mb-4 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Navigation size={13} className="text-indigo-200" />
            <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wide">
              {isChecked ? 'All done for the day! 🎉' : 'Next stop'}
            </span>
          </div>
          {distance !== null && !isChecked && (
            <span className="text-xs text-indigo-200">
              {formatDistance(distance)} · {formatWalkingTime(distance)}
            </span>
          )}
        </div>

        {/* Content */}
        {!isChecked && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <MapPin size={13} className="text-indigo-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-indigo-600 truncate">{name}</p>
              </div>
              <p className="text-sm text-gray-800 truncate">{activity.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{activity.time} · {activity.duration}</p>
            </div>

            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {/* Directions */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <ExternalLink size={11} />
                Directions
              </a>
              {/* Check in */}
              <button
                onClick={onCheckIn}
                className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-green-100 transition-colors"
              >
                <CheckCircle2 size={11} />
                Check in
              </button>
            </div>
          </div>
        )}

        {isChecked && (
          <div className="px-4 py-3 text-sm text-gray-500 text-center">
            You&apos;ve completed all stops for today. Check tomorrow&apos;s plan!
          </div>
        )}
      </div>
    </div>
  );
}
