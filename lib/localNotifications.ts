'use client';

const NOTIF_ID = 1001;
const PREF_KEY = 'tp_digest_notif_enabled';

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch {
    // Web or permissions API not available
    return false;
  }
}

export async function scheduleWeeklyDigest(unvisitedCount: number): Promise<void> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    // Cancel any existing digest notification first
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });

    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((7 - nextMonday.getDay() + 1) % 7 || 7));
    nextMonday.setHours(9, 0, 0, 0);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_ID,
          title: 'Your travel inspo awaits 🗺',
          body:
            unvisitedCount > 0
              ? `You have ${unvisitedCount} unvisited saved spot${unvisitedCount !== 1 ? 's' : ''}. Time to plan your next trip!`
              : "You've got saved clips to explore. Plan your next adventure →",
          schedule: {
            at: nextMonday,
            repeats: true,
            every: 'week',
          },
          actionTypeId: 'OPEN_DIGEST',
          extra: { route: '/digest' },
        },
      ],
    });
  } catch {
    // Silently fail on web
  }
}

export async function cancelDigestNotification(): Promise<void> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
  } catch {}
}

export function isDigestNotifEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDigestNotifEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  } catch {}
}
