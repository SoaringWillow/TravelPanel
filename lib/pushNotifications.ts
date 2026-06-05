'use client';

import { SavedItem } from './types';

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function hasNotificationPermission(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

// ─── Location cluster check ───────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const CLUSTER_THRESHOLD = 3;
const STALENESS_DAYS = 7;
const NOTIF_COOLDOWN_KEY = 'lastGeoClusterNotif';
const COOLDOWN_MS = 7 * DAY_MS; // max once per week

function extractGeoKey(item: SavedItem): string[] {
  const names = item.locations.map((l) => l.name).join(' ');
  return names.match(/\b[A-Z][a-z]{3,}\b/g) ?? [];
}

// Checks if there are 3+ clips with the same geo keyword older than 7 days.
// Returns the cluster info if found, or null.
function findGeoCluster(
  items: SavedItem[]
): { place: string; count: number } | null {
  const map = new Map<string, number>();
  for (const item of items) {
    if (item.isDemo) continue;
    const ageDays = (Date.now() - item.savedAt) / DAY_MS;
    if (ageDays < STALENESS_DAYS) continue;
    for (const key of extractGeoKey(item)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  for (const [place, count] of map.entries()) {
    if (count >= CLUSTER_THRESHOLD) return { place, count };
  }
  return null;
}

// ─── Show notification ────────────────────────────────────────────────────────

function showNotification(title: string, body: string, url = '/inbox') {
  if (!hasNotificationPermission()) return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/icons/icon192.png',
      badge: '/icons/icon192.png',
      tag: 'travelpanel-resurface',
      renotify: false,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  } catch {
    // Not supported in this context (e.g. iOS PWA without SW)
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

// Called on app focus. Shows at most once per cooldown period.
export function checkAndNotify(items: SavedItem[]): void {
  if (!hasNotificationPermission()) return;
  try {
    const lastNotif = Number(localStorage.getItem(NOTIF_COOLDOWN_KEY) ?? '0');
    if (Date.now() - lastNotif < COOLDOWN_MS) return;
  } catch {
    return;
  }

  const cluster = findGeoCluster(items);
  if (!cluster) return;

  try {
    localStorage.setItem(NOTIF_COOLDOWN_KEY, String(Date.now()));
  } catch { /* */ }

  showNotification(
    `${cluster.count} ${cluster.place} clips ready to plan`,
    'You've been saving inspiration for a while — time to turn it into a trip.',
    '/inbox'
  );
}
