// Haversine distance in meters between two lat/lng points
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 50) return 'Right here';
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

// Rough walking time (80m/min pace)
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}
