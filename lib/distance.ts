// Haversine great-circle distance in km between two lat/lng pairs.
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R  = 6371; // Earth radius km
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const dφ = ((lat2 - lat1) * Math.PI) / 180;
  const dλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 0.05) return 'You\'re here';
  if (km < 1)    return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}
