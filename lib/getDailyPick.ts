import { SavedItem } from './types';

const STORAGE_KEY = 'tp_resurface_dismiss';
const MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function isDismissedToday(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === todayKey();
  } catch {
    return false;
  }
}

export function dismissToday(): void {
  try {
    localStorage.setItem(STORAGE_KEY, todayKey());
  } catch {
    // localStorage unavailable
  }
}

// Pick one enriched, substance-rich, older clip deterministically per day.
export function getDailyPick(items: SavedItem[]): SavedItem | null {
  const eligible = items.filter(
    (item) =>
      item.enrichmentStatus === 'done' &&
      item.locations.length > 0 &&
      (item.substance?.length ?? 0) > 0 &&
      Date.now() - item.savedAt >= MIN_AGE_MS,
  );

  if (eligible.length === 0) return null;

  // Consistent pick for the calendar day (rotates every day)
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return eligible[dayOfYear % eligible.length];
}
