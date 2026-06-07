/** Haversine distance in km between two lat/lng points. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Estimates driving time for a sequence of stops.
 * Uses 40 km/h for legs ≤ 30 km (city), 80 km/h for longer legs (highway).
 * Returns a human-readable string, or null if fewer than 2 stops or negligible time.
 */
export function estimateDrivingTime(locations: { lat: number; lng: number }[]): string | null {
  if (locations.length < 2) return null;
  let totalMinutes = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const dist = haversineKm(
      locations[i].lat, locations[i].lng,
      locations[i + 1].lat, locations[i + 1].lng,
    );
    const speed = dist > 30 ? 80 : 40;
    totalMinutes += (dist / speed) * 60;
  }
  if (totalMinutes < 5) return null;
  if (totalMinutes < 60) return `~${Math.round(totalMinutes)} min driving`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return mins > 0 ? `~${hours}h ${mins}min driving` : `~${hours}h driving`;
}
