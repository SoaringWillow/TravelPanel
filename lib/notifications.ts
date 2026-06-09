'use client';

import { getAllItems } from '@/lib/db';

const NOTIF_ID = 42; // stable ID for weekly reminder

async function getPlugin() {
  if (typeof window === 'undefined') return null;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    // Only use on native platform — no-op in browser
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    return LocalNotifications;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const { display } = await plugin.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function isNotificationPermissionGranted(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const { display } = await plugin.checkPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleWeeklyReminder(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;

  try {
    // Count unassigned inbox items for a personal body message
    const items = await getAllItems();
    const inboxCount = items.filter((i) => !i.boardId).length;
    const body =
      inboxCount > 0
        ? `You have ${inboxCount} saved place${inboxCount !== 1 ? 's' : ''} ready to plan. Open TravelPanel →`
        : 'Your travel inspiration awaits — ready to plan your next trip?';

    // Cancel previous reminder before scheduling
    await cancelReminders();

    // Schedule every Monday at 9am
    await plugin.schedule({
      notifications: [
        {
          id: NOTIF_ID,
          title: 'TravelPanel ✈️',
          body,
          schedule: {
            on: { weekday: 2, hour: 9, minute: 0 }, // weekday 2 = Monday
            repeats: true,
          },
          sound: undefined,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#6366f1',
        },
      ],
    });
  } catch {
    // Silently fail — notifications are non-critical
  }
}

export async function cancelReminders(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id: NOTIF_ID }] });
  } catch {
    // no-op
  }
}
