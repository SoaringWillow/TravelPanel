'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { Location } from '@/lib/types';

interface NearbyPlace {
  id:       number;
  name:     string;
  category: string;
  emoji:    string;
  lat:      number;
  lng:      number;
  distanceM: number;
}

interface NearbyPlacesProps {
  location: Location;
}

export default function NearbyPlaces({ location }: NearbyPlacesProps) {
  const [places, setPlaces]   = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/nearby?lat=${location.lat}&lng=${location.lng}&radius=500`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setPlaces(data.places ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [location.lat, location.lng]);

  if (error || (!loading && places.length === 0)) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Nearby
      </p>

      {loading ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {places.map((place, i) => (
            <motion.a
              key={place.id}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&center=${place.lat},${place.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex-shrink-0 w-28 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl p-2.5 transition-colors"
            >
              <span className="text-xl block mb-1">{place.emoji}</span>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2">
                {place.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                <Navigation size={8} />
                {place.distanceM < 1000
                  ? `${place.distanceM}m`
                  : `${(place.distanceM / 1000).toFixed(1)}km`}
              </p>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}
