'use client';

import { useState, useCallback } from 'react';
import { Navigation, X, Loader2 } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { haversineKm, formatDistance } from '@/lib/distance';

const NEARBY_RADIUS_KM = 10;

interface NearbyItem {
  item: SavedItem;
  distanceKm: number;
}

interface NearbyBannerProps {
  items: SavedItem[];
  onFlyTo: (lat: number, lng: number) => void;
  onSelectItem: (item: SavedItem) => void;
}

type State = 'idle' | 'loading' | 'showing' | 'denied';

export default function NearbyBanner({ items, onFlyTo, onSelectItem }: NearbyBannerProps) {
  const [state, setState] = useState<State>('idle');
  const [nearby, setNearby] = useState<NearbyItem[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  const handleNearby = useCallback(() => {
    if (state === 'showing') {
      setState('idle');
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        onFlyTo(lat, lng);

        const enrichedItems = items.filter(
          (i) => i.enrichmentStatus === 'done' && i.locations.length > 0
        );
        const nearbyItems: NearbyItem[] = enrichedItems
          .flatMap((item) =>
            item.locations.map((loc) => ({ item, distanceKm: haversineKm(lat, lng, loc.lat, loc.lng) }))
          )
          .filter(({ distanceKm }) => distanceKm <= NEARBY_RADIUS_KM)
          .sort((a, b) => a.distanceKm - b.distanceKm)
          // dedupe by item id, keep closest
          .filter((entry, idx, arr) => arr.findIndex((e) => e.item.id === entry.item.id) === idx);

        setNearby(nearbyItems);
        setState('showing');
      },
      () => setState('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [state, items, onFlyTo]);

  return (
    <>
      {/* Nearby button — shown in top bar */}
      <button
        type="button"
        onClick={handleNearby}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-all ${
          state === 'showing'
            ? 'bg-indigo-600 text-white'
            : 'bg-white/80 text-gray-700 hover:bg-white'
        }`}
      >
        {state === 'loading' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Navigation size={14} />
        )}
        {state === 'showing' ? 'Nearby ✓' : 'Nearby'}
      </button>

      {/* Bottom drawer */}
      {state === 'showing' && (
        <div className="absolute bottom-20 left-0 right-0 z-[1200] mx-3 bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[45vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                {nearby.length === 0 ? 'No clips nearby' : `${nearby.length} nearby`}
              </h3>
              {userPos && (
                <p className="text-xs text-gray-400">Within {NEARBY_RADIUS_KM} km of you</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setState('idle')}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Items list */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {nearby.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                <p className="text-4xl mb-3">📍</p>
                <p className="text-sm text-gray-500">
                  None of your saved clips are within {NEARBY_RADIUS_KM} km.
                </p>
              </div>
            ) : (
              nearby.map(({ item, distanceKm }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 truncate">{item.locations[0]?.name}</p>
                  </div>
                  <span className="text-xs font-medium text-indigo-600 flex-shrink-0 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {formatDistance(distanceKm)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Permission denied */}
      {state === 'denied' && (
        <div className="absolute top-20 left-4 right-4 z-[1200] bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-700">Location access denied — enable in Settings.</p>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="p-1 text-amber-400 hover:text-amber-600"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
