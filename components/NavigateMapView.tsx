'use client';

import { useEffect, useRef } from 'react';
import Map, { Marker, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Activity } from '@/lib/types';

export interface NavStop {
  activity: Activity;
  dayNum: number;
  globalIdx: number;
}

interface NavigateMapViewProps {
  stops: NavStop[];
  activeIdx: number;
  userLat: number | null;
  userLng: number | null;
}

function FlyController({ stops, activeIdx }: { stops: NavStop[]; activeIdx: number }) {
  const { current: map } = useMap();
  const prevIdx = useRef(-1);

  useEffect(() => {
    if (!map || stops.length === 0) return;
    const stop = stops[activeIdx];
    if (!stop) return;
    if (prevIdx.current === activeIdx) return;
    prevIdx.current = activeIdx;
    const { lat, lng } = stop.activity.location;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
  }, [map, stops, activeIdx]);

  return null;
}

export default function NavigateMapView({ stops, activeIdx, userLat, userLng }: NavigateMapViewProps) {
  const firstValid = stops.find((s) => Number.isFinite(s.activity.location.lat));
  const center: [number, number] = firstValid
    ? [firstValid.activity.location.lng, firstValid.activity.location.lat]
    : [0, 0];

  return (
    <Map
      initialViewState={{ longitude: center[0], latitude: center[1], zoom: 13 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
    >
      <FlyController stops={stops} activeIdx={activeIdx} />

      {/* User GPS dot */}
      {userLat !== null && userLng !== null && (
        <Marker longitude={userLng} latitude={userLat} anchor="center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-10 h-10 bg-blue-400 rounded-full opacity-30 animate-ping" />
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
          </div>
        </Marker>
      )}

      {/* Stop markers */}
      {stops.map((stop, idx) => {
        const { lat, lng, name } = stop.activity.location;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const isActive = idx === activeIdx;
        const isPast = idx < activeIdx;
        return (
          <Marker key={idx} longitude={lng} latitude={lat} anchor="bottom">
            <div className="flex flex-col items-center">
              {isActive && (
                <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg whitespace-nowrap max-w-[130px] truncate mb-1">
                  {name}
                </div>
              )}
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <div className="absolute w-8 h-8 bg-indigo-400 rounded-full opacity-40 animate-ping" />
                )}
                <div
                  className={`rounded-full border-2 border-white shadow ${
                    isActive
                      ? 'w-5 h-5 bg-indigo-600'
                      : isPast
                      ? 'w-3.5 h-3.5 bg-gray-400'
                      : 'w-3.5 h-3.5 bg-gray-300'
                  }`}
                />
              </div>
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
