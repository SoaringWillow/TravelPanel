import { SavedItem } from './types';

const DAY = 86_400_000;

// Distance in metres (Haversine)
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

// Detect current season/month keywords — for loose seasonal matching
function currentSeasonKeywords(): string[] {
  const month = new Date().getMonth(); // 0=Jan
  if (month <= 1 || month === 11) return ['winter', 'december', 'january', 'february', 'cold', 'snow'];
  if (month <= 4)  return ['spring', 'march', 'april', 'may', 'blossom', 'cherry'];
  if (month <= 7)  return ['summer', 'june', 'july', 'august', 'hot', 'beach', 'festival'];
  return ['autumn', 'fall', 'september', 'october', 'november', 'foliage', 'harvest'];
}

export interface ResurfaceItem {
  item: SavedItem;
  reason: 'nearby' | 'seasonal' | 'forgotten' | 'rich';
  reasonLabel: string;
  distanceMetres?: number;
}

// Returns up to `limit` items worth resurfacing, with reasons.
export function getResurfaceItems(
  items: SavedItem[],
  opts: { userLat?: number; userLng?: number; limit?: number } = {}
): ResurfaceItem[] {
  const { userLat, userLng, limit = 6 } = opts;
  const now = Date.now();
  const seasonKws = currentSeasonKeywords();

  const enriched = items.filter(
    (i) => i.enrichmentStatus === 'done' && i.locations.length > 0 && !i.isDemo
  );

  const scored: Array<ResurfaceItem & { score: number }> = enriched.map((item) => {
    const ageMs = now - item.savedAt;
    const ageDays = ageMs / DAY;
    let score = 0;
    let reason: ResurfaceItem['reason'] = 'forgotten';
    let reasonLabel = 'Saved a while ago';
    let distM: number | undefined;

    // Nearby boost (strong signal when GPS available)
    if (userLat != null && userLng != null) {
      const minDist = Math.min(
        ...item.locations.map((l) => distanceMetres(userLat, userLng, l.lat, l.lng))
      );
      if (minDist < 50_000) { // within 50 km
        score += 30 - Math.floor(minDist / 2000); // closer = higher
        reason = 'nearby';
        reasonLabel = minDist < 1000
          ? 'You\'re nearby!'
          : `${Math.round(minDist / 1000)} km away`;
        distM = minDist;
      }
    }

    // Seasonal boost
    const haystack = [
      item.title,
      item.description,
      ...(item.substance ?? []).map((s) => s.content),
    ].join(' ').toLowerCase();
    if (seasonKws.some((kw) => haystack.includes(kw))) {
      score += 8;
      if (reason !== 'nearby') {
        reason = 'seasonal';
        reasonLabel = 'Seasonal pick';
      }
    }

    // Substance richness boost
    const substanceCount = item.substance?.length ?? 0;
    if (substanceCount >= 3) {
      score += Math.min(substanceCount, 8);
      if (reason === 'forgotten') {
        reason = 'rich';
        reasonLabel = `${substanceCount} tips inside`;
      }
    }

    // Age sweet spot: items 7–60 days old are "forgotten"
    if (ageDays >= 7 && ageDays <= 60) score += 10;
    else if (ageDays > 60) score += 5;

    // Don't resurface already-visited items
    if (item.visitedAt) score -= 20;

    return { item, reason, reasonLabel, distanceMetres: distM, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, reason, reasonLabel, distanceMetres }) => ({
      item, reason, reasonLabel, distanceMetres,
    }));
}
