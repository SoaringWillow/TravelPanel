// Unified notification helper — uses Capacitor LocalNotifications on native iOS,
// falls back to Web Notifications API in browser.

export async function notifyPlanReady(boardName: string): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: 'Trip plan ready ✈️',
              body: `Your ${boardName} itinerary is ready to explore!`,
              schedule: { at: new Date(Date.now() + 100) },
            },
          ],
        });
      }
      return;
    }
  } catch {
    // Not a Capacitor context
  }

  // Web Notifications fallback
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return;
    }
    new Notification('Trip plan ready ✈️', {
      body: `Your ${boardName} itinerary is ready to explore!`,
      icon: '/icon-192.png',
    });
  } catch {
    // Notifications not available
  }
}
