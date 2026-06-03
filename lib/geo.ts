// Haversine great-circle distance (km) between two lat/lng points
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Navigation deep link — prefers Apple Maps on iOS, falls back to Google Maps
export function mapsDeepLink(lat: number, lng: number, name: string): string {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    return `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`;
  }
  return `https://maps.google.com/maps?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`;
}
