'use client';

// Notification wrapper: uses @capacitor/local-notifications in native context,
// Web Notifications API in browser, silently no-ops if both are unavailable.

let permissionRequested = false;
let webPermission: NotificationPermission = 'default';

async function requestWebPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (webPermission === 'granted') return true;
  if (permissionRequested) return webPermission === 'granted';
  permissionRequested = true;
  webPermission = await Notification.requestPermission();
  return webPermission === 'granted';
}

async function tryCapacitor(title: string, body: string): Promise<boolean> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    let granted = display === 'granted';
    if (!granted) {
      const res = await LocalNotifications.requestPermissions();
      granted = res.display === 'granted';
    }
    if (!granted) return false;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100_000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

function tryWeb(title: string, body: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (webPermission !== 'granted') return false;
  try {
    new Notification(title, { body, icon: '/icon-192.png' });
    return true;
  } catch {
    return false;
  }
}

export async function notifyEnrichmentDone(
  clipTitle: string,
  locationCount: number,
  tipCount: number
): Promise<void> {
  const title = '✅ Clip ready!';
  const parts: string[] = [];
  if (locationCount > 0) parts.push(`${locationCount} location${locationCount !== 1 ? 's' : ''}`);
  if (tipCount > 0) parts.push(`${tipCount} tip${tipCount !== 1 ? 's' : ''}`);
  const body = parts.length > 0
    ? `${clipTitle} — ${parts.join(', ')} found`
    : clipTitle;

  // Try Capacitor (native iOS/Android), then Web Notifications
  const nativeSent = await tryCapacitor(title, body);
  if (!nativeSent) {
    await requestWebPermission();
    tryWeb(title, body);
  }
}
