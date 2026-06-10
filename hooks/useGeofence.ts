'use client';

import { useEffect, useState } from 'react';
import { SavedItem } from '@/lib/types';

const RADIUS_KM = 0.5;
const SETTING_KEY = 'geofenceEnabled';
const FIRED_PREFIX = 'geofence_fired_';
const SESSION_KEY = 'geofence_ran';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hasFiredToday(itemId: string): boolean {
  return localStorage.getItem(`${FIRED_PREFIX}${itemId}_${todayKey()}`) === '1';
}

function markFired(itemId: string) {
  localStorage.setItem(`${FIRED_PREFIX}${itemId}_${todayKey()}`, '1');
}

async function scheduleNotification(title: string, body: string) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [{
        id: (Date.now() + Math.floor(Math.random() * 1000)) % 2_147_483_647,
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) },
      }],
    });
  } catch {
    // Not on native or notifications unavailable — silent fail
  }
}

async function checkGeofences(
  lat: number,
  lng: number,
  clips: SavedItem[],
  onNearby?: (name: string) => void,
) {
  for (const item of clips) {
    for (const loc of item.locations) {
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
      const dist = haversineKm(lat, lng, loc.lat, loc.lng);
      if (dist <= RADIUS_KM) {
        const place = loc.name || item.title || 'a saved spot';
        onNearby?.(place);
        if (!hasFiredToday(item.id)) {
          const weeks = Math.round((Date.now() - item.savedAt) / (7 * 24 * 3_600_000));
          const when = weeks === 0 ? 'recently' : `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
          markFired(item.id);
          await scheduleNotification('📍 Nearby saved spot', `You're near ${place} — saved ${when}`);
        }
        break;
      }
    }
  }
}

export function useGeofence(items: SavedItem[]): { nearbyName: string | null } {
  const [nearbyName, setNearbyName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(SETTING_KEY) !== '1') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const clips = items.filter(
      (i) =>
        !i.isDemo &&
        i.enrichmentStatus === 'done' &&
        i.locations.some((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng)),
    );
    if (clips.length === 0) return;

    sessionStorage.setItem(SESSION_KEY, '1');

    async function run() {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: false });
        await checkGeofences(pos.coords.latitude, pos.coords.longitude, clips, setNearbyName);
      } catch {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => checkGeofences(pos.coords.latitude, pos.coords.longitude, clips, setNearbyName),
            () => {},
            { timeout: 8000, enableHighAccuracy: false },
          );
        }
      }
    }

    run();
  // Re-evaluate only when the item set changes from empty → loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0 ? 'loaded' : 'empty']);

  return { nearbyName };
}
