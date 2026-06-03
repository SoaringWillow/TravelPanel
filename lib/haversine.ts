// Returns the great-circle distance in kilometers between two lat/lng points.
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R  = 6371; // Earth radius in km
  const dL = (lat2 - lat1) * (Math.PI / 180);
  const dG = (lng2 - lng1) * (Math.PI / 180);
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns the minimum distance from a point to any of the given locations.
export function minDistanceKm(
  userLat: number, userLng: number,
  locations: Array<{ lat: number; lng: number }>,
): number | undefined {
  if (locations.length === 0) return undefined;
  let min = Infinity;
  for (const loc of locations) {
    const d = haversineKm(userLat, userLng, loc.lat, loc.lng);
    if (d < min) min = d;
  }
  return min === Infinity ? undefined : min;
}
