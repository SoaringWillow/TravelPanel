'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import { getAllItems } from '@/lib/db';
import { SavedItem, Location } from '@/lib/types';
import { haversineDistance, formatDistance } from '@/lib/geo';
import { PLATFORM_BG, PLATFORM_LABELS } from '@/lib/parse-url';

interface NearbyClip {
  item: SavedItem;
  location: Location;
  distanceKm: number;
}

type GeoState = 'idle' | 'loading' | 'denied' | 'unavailable' | 'ready';

export default function NearbyPage() {
  const router = useRouter();
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [nearby, setNearby] = useState<NearbyClip[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoState('unavailable');
      return;
    }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGeoState('ready');
      },
      (err) => {
        setGeoState(err.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Compute nearby clips once we have coordinates and items
  useEffect(() => {
    if (geoState !== 'ready' || userLat === null || userLng === null) return;

    getAllItems().then((items) => {
      const candidates: NearbyClip[] = [];
      for (const item of items) {
        if (item.isDemo) continue;
        for (const loc of item.locations) {
          if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') continue;
          const distanceKm = haversineDistance(userLat, userLng, loc.lat, loc.lng);
          candidates.push({ item, location: loc, distanceKm });
        }
      }
      // Deduplicate by item — keep only the closest location per item
      const byItem = new Map<string, NearbyClip>();
      for (const c of candidates) {
        const existing = byItem.get(c.item.id);
        if (!existing || c.distanceKm < existing.distanceKm) {
          byItem.set(c.item.id, c);
        }
      }
      const sorted = [...byItem.values()].sort((a, b) => a.distanceKm - b.distanceKm);
      setNearby(sorted.slice(0, 50));
    });
  }, [geoState, userLat, userLng]);

  function handleClipTap(clip: NearbyClip) {
    const { lat, lng } = clip.location;
    router.push(`/?flyTo=${lat},${lng}&itemId=${clip.item.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <Navigation size={20} className="text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Nearby</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Saved spots close to you</p>
      </div>

      <div className="px-4 py-4">
        {/* States */}
        {geoState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Getting your location…</span>
          </div>
        )}

        {geoState === 'denied' && (
          <EmptyState
            icon={<AlertCircle size={32} className="text-amber-400" />}
            title="Location access denied"
            body="Enable location permission for TravelPanel in Settings → Privacy → Location Services, then come back."
          />
        )}

        {geoState === 'unavailable' && (
          <EmptyState
            icon={<AlertCircle size={32} className="text-gray-400" />}
            title="Location unavailable"
            body="Your device doesn't support location services or it's unavailable right now."
          />
        )}

        {geoState === 'ready' && nearby.length === 0 && (
          <EmptyState
            icon={<MapPin size={32} className="text-indigo-300" />}
            title="No saved spots nearby"
            body="Clip some places you want to visit and they'll show up here when you're close."
          />
        )}

        {geoState === 'ready' && nearby.length > 0 && (
          <div className="space-y-3">
            {nearby.map((clip) => (
              <NearbyCard
                key={`${clip.item.id}-${clip.location.name}`}
                clip={clip}
                onTap={() => handleClipTap(clip)}
              />
            ))}
          </div>
        )}
      </div>

      <NavBar active="nearby" />
    </div>
  );
}

function NearbyCard({ clip, onTap }: { clip: NearbyClip; onTap: () => void }) {
  const { item, location, distanceKm } = clip;
  const platformLabel = PLATFORM_LABELS[item.platform];
  const platformBg = PLATFORM_BG[item.platform];

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform"
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail or platform badge */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100"
          />
        ) : (
          <div className={`w-16 h-16 rounded-xl flex-shrink-0 ${platformBg} flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{platformLabel.slice(0, 2)}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
            {item.title}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 truncate">{location.name}</span>
          </div>
          {item.substance.length > 0 && (
            <div className="text-xs text-indigo-500 mt-1">
              {item.substance.length} tip{item.substance.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Distance badge */}
        <div className="flex-shrink-0 flex flex-col items-end justify-start pt-0.5">
          <span className="text-sm font-bold text-indigo-600 tabular-nums">
            {formatDistance(distanceKm)}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">away</span>
        </div>
      </div>
    </button>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
      {icon}
      <div className="font-semibold text-gray-700 text-base">{title}</div>
      <div className="text-sm text-gray-400 leading-relaxed max-w-xs">{body}</div>
    </div>
  );
}
