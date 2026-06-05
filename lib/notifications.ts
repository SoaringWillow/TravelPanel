'use client';

// Local notifications via @capacitor/local-notifications on iOS.
// On web, falls back silently (Notification API optional future addition).

async function getPlugin() {
  if (typeof window === 'undefined') return null;
  // Capacitor is only present in the native iOS shell
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      const { display: requested } = await LocalNotifications.requestPermissions();
      if (requested !== 'granted') return null;
    }
    return LocalNotifications;
  } catch {
    return null;
  }
}

export async function scheduleTripStartNotification(
  boardName: string,
  boardEmoji: string,
  tripStartMs: number,
) {
  const plugin = await getPlugin();
  if (!plugin) return;
  await plugin.schedule({
    notifications: [{
      id: Math.floor(Math.random() * 1_000_000),
      title: `${boardEmoji} Your ${boardName} trip starts today!`,
      body: 'Tap to open your itinerary.',
      schedule: { at: new Date(tripStartMs) },
      extra: { type: 'trip_start' },
    }],
  });
}

// Schedules a weekly reminder when the user has unplanned boards.
// Only schedules once per session (checked via sessionStorage).
export async function maybeScheduleUnplannedBoardsReminder(
  boardCount: number,
) {
  if (boardCount === 0) return;
  const SESSION_KEY = 'tp_unplanned_reminder_scheduled';
  if (sessionStorage.getItem(SESSION_KEY)) return;
  sessionStorage.setItem(SESSION_KEY, '1');

  const plugin = await getPlugin();
  if (!plugin) return;

  const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await plugin.schedule({
    notifications: [{
      id: 9_000_001,
      title: '🗺 You have trip boards waiting!',
      body: `${boardCount} board${boardCount !== 1 ? 's' : ''} ready to be turned into itineraries.`,
      schedule: { at: new Date(oneWeek) },
      extra: { type: 'unplanned_reminder' },
    }],
  });
}
