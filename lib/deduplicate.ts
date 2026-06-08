import { SavedItem } from './types';

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

function normalizedTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '').slice(0, 40);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns the most similar existing item, or null if no duplicate found.
export function findSimilarItem(
  newUrl: string,
  newLocations: { lat: number; lng: number }[],
  newTitle: string,
  newPlatform: string,
  existing: SavedItem[]
): SavedItem | null {
  for (const item of existing) {
    // Exact URL match
    try {
      const a = new URL(newUrl).pathname + new URL(newUrl).search;
      const b = new URL(item.url).pathname + new URL(item.url).search;
      if (a === b) return item;
    } catch { /* malformed URL */ }

    // Same platform + any location within 50m
    if (item.platform === newPlatform && newLocations.length > 0) {
      for (const nl of newLocations) {
        for (const el of item.locations) {
          if (distKm(nl.lat, nl.lng, el.lat, el.lng) < 0.05) return item;
        }
      }
    }

    // Similar title (normalized Levenshtein distance < 0.2)
    const ta = normalizedTitle(newTitle);
    const tb = normalizedTitle(item.title);
    if (ta.length > 4 && tb.length > 4) {
      const maxLen = Math.max(ta.length, tb.length);
      if (levenshtein(ta, tb) / maxLen < 0.2) return item;
    }
  }
  return null;
}
