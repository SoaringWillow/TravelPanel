'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, DayPlan } from './types';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: number;
}

export interface NearbyActivity {
  activity: Activity;
  distanceMeters: number;
  dayIndex: number;
  activityIndex: number;
}

// Haversine distance in meters between two lat/lng pairs
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(meters: number): string {
  if (meters < 50) return 'You are here';
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

export function formatWalkTime(meters: number): string {
  // Assumes ~4.5 km/h walking speed
  const minutes = Math.round((meters / 4500) * 60);
  if (minutes < 1) return '< 1 min walk';
  if (minutes === 1) return '1 min walk';
  return `${minutes} min walk`;
}

// Find all activities within a given day plan ranked by distance from pos
export function rankActivitiesByDistance(
  dayPlan: DayPlan,
  dayIndex: number,
  pos: GeoPosition
): NearbyActivity[] {
  return dayPlan.activities
    .map((activity, activityIndex) => ({
      activity,
      distanceMeters: haversineMeters(
        pos.lat, pos.lng,
        activity.location.lat, activity.location.lng
      ),
      dayIndex,
      activityIndex,
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseGpsTrackingOptions {
  enabled: boolean;
  days: DayPlan[];
  activeDayIndex: number;
}

interface GpsTrackingState {
  position: GeoPosition | null;
  error: string | null;
  nearbyActivities: NearbyActivity[];
  nextActivity: NearbyActivity | null;
  arrivedAt: NearbyActivity | null; // activity within 100m
}

const ARRIVED_THRESHOLD_M = 120;

export function useGpsTracking({ enabled, days, activeDayIndex }: UseGpsTrackingOptions): GpsTrackingState {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      if (!navigator?.geolocation) setError('GPS not available on this device');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        setError(
          err.code === 1 ? 'Location permission denied. Enable in iOS Settings → Privacy → Location.'
          : err.code === 2 ? 'Location unavailable — check GPS signal.'
          : 'Location request timed out.'
        );
      },
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled]);

  const activeDayPlan = days[activeDayIndex];

  if (!position || !activeDayPlan) {
    return { position, error, nearbyActivities: [], nextActivity: null, arrivedAt: null };
  }

  const ranked = rankActivitiesByDistance(activeDayPlan, activeDayIndex, position);
  const nextActivity = ranked[0] ?? null;
  const arrivedAt = nextActivity && nextActivity.distanceMeters <= ARRIVED_THRESHOLD_M ? nextActivity : null;

  return { position, error, nearbyActivities: ranked, nextActivity, arrivedAt };
}
