'use client';

import { useMemo } from 'react';
import { impact } from '@/lib/haptics';
import { Drawer } from 'vaul';
import { MapPin, Navigation } from 'lucide-react';
import { SavedItem, Location } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/parse-url';

// ── Distance helpers ──────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface NearbyClip {
  item: SavedItem;
  nearestLocation: Location;
  distanceKm: number;
}

interface NearMeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SavedItem[];
  userLat: number;
  userLng: number;
  onItemClick: (item: SavedItem, location: Location) => void;
}

const MAX_DISTANCE_KM = 150;
const MAX_RESULTS      = 30;

// ── Component ─────────────────────────────────────────────────────────────────

export default function NearMeSheet({
  open,
  onOpenChange,
  items,
  userLat,
  userLng,
  onItemClick,
}: NearMeSheetProps) {

  const nearbyClips = useMemo<NearbyClip[]>(() => {
    const results: NearbyClip[] = [];

    for (const item of items) {
      if (item.locations.length === 0) continue;

      // Find the item's closest location to the user
      let nearest: Location | null = null;
      let minDist = Infinity;

      for (const loc of item.locations) {
        if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
        const d = haversineKm(userLat, userLng, loc.lat, loc.lng);
        if (d < minDist) { minDist = d; nearest = loc; }
      }

      if (nearest && minDist <= MAX_DISTANCE_KM) {
        results.push({ item, nearestLocation: nearest, distanceKm: minDist });
      }
    }

    return results
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_RESULTS);
  }, [items, userLat, userLng]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/30 z-[2000]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[2001] bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col outline-none"
          aria-labelledby="near-me-title"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-9 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 flex items-center gap-2 border-b border-gray-100 flex-shrink-0">
            <Navigation size={18} className="text-indigo-500" />
            <h2 id="near-me-title" className="font-bold text-gray-900 text-base">
              Near Me
            </h2>
            {nearbyClips.length > 0 && (
              <span className="ml-auto text-xs text-gray-400 font-medium">
                {nearbyClips.length} saved {nearbyClips.length === 1 ? 'place' : 'places'}
              </span>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 pb-safe">
            {nearbyClips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                <MapPin size={36} className="text-gray-200" />
                <p className="text-gray-500 text-sm font-medium">No saved places within {MAX_DISTANCE_KM} km</p>
                <p className="text-gray-400 text-xs">
                  Save travel inspiration from nearby destinations to see them here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {nearbyClips.map(({ item, nearestLocation, distanceKm }) => (
                  <button
                    key={`${item.id}-${nearestLocation.lat}`}
                    type="button"
                    onClick={() => {
                      impact('light');
                      onItemClick(item, nearestLocation);
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    {/* Thumbnail or platform dot */}
                    <div className="flex-shrink-0">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: PLATFORM_COLORS[item.platform] + '22' }}
                        >
                          <MapPin size={18} style={{ color: PLATFORM_COLORS[item.platform] }} />
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {nearestLocation.name}
                      </p>
                    </div>

                    {/* Distance badge */}
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {formatDistance(distanceKm)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
