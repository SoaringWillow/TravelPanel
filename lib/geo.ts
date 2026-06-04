// Haversine distance between two GPS coordinates, in kilometres.
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// Human-readable distance label.
export function formatDistance(km: number): string {
  if (km < 0.1) return `${Math.round(km * 1000)} m`;
  if (km < 10)  return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// Deep-link to Apple Maps (iOS) or Google Maps (Android / web fallback).
export function navigateToCoords(lat: number, lng: number, label: string): void {
  const enc = encodeURIComponent(label);
  // Apple Maps scheme — iOS will intercept this in the native shell.
  // Falls back to Google Maps web on non-iOS.
  const appleUrl  = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

  // Detect iOS (Capacitor native or Safari)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel';
  window.open(isIOS ? appleUrl : googleUrl, '_blank');
}
