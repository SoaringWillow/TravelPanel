'use client';

const LAST_NOTIF_KEY = 'travelpanel_last_daily_notif';
const PREF_KEY = 'travelpanel_daily_notif_enabled';
const MIN_GAP_MS = 23 * 60 * 60 * 1000; // 23h

export function isDailyNotifEnabled(): boolean {
  try { return localStorage.getItem(PREF_KEY) === '1'; } catch { return false; }
}

export function setDailyNotifEnabled(enabled: boolean) {
  try { localStorage.setItem(PREF_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Call on app open — shows notification if >23h since last one and user opted in */
export async function maybeShowDailyNotif(clipCount: number) {
  if (!isDailyNotifEnabled()) return;
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  const lastShown = Number(localStorage.getItem(LAST_NOTIF_KEY) ?? 0);
  if (Date.now() - lastShown < MIN_GAP_MS) return;

  // Only show during morning hours (7am–11am local)
  const hour = new Date().getHours();
  if (hour < 7 || hour > 11) return;

  localStorage.setItem(LAST_NOTIF_KEY, String(Date.now()));

  const body = clipCount > 0
    ? `You have ${clipCount} saved ideas. Ready to plan your next trip?`
    : 'Clip your first travel inspiration and start planning!';

  new Notification('TravelPanel ✈️', { body, icon: '/icon-192.png' });
}
