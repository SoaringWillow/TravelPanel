import type { SavedItem, Location } from './types';

export function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export type NearbyClip = SavedItem & {
  nearestKm: number;
  nearestLocation: Location;
};

export function nearbyClips(
  items: SavedItem[],
  userLat: number,
  userLng: number,
  maxKm = 50,
): NearbyClip[] {
  const result: NearbyClip[] = [];
  for (const item of items) {
    if (item.locations.length === 0) continue;
    let minDist = Infinity;
    let nearest = item.locations[0];
    for (const loc of item.locations) {
      const d = distanceKm(userLat, userLng, loc.lat, loc.lng);
      if (d < minDist) { minDist = d; nearest = loc; }
    }
    if (minDist <= maxKm) {
      result.push({ ...item, nearestKm: minDist, nearestLocation: nearest });
    }
  }
  return result.sort((a, b) => a.nearestKm - b.nearestKm);
}
