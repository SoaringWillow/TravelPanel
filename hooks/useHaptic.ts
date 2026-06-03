'use client';

// Wraps @capacitor/haptics — no-ops silently in web/non-native contexts.

type ImpactLevel = 'light' | 'medium' | 'heavy';
type NotificationKind = 'success' | 'warning' | 'error';

async function tryHaptics(): Promise<typeof import('@capacitor/haptics') | null> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    return await import('@capacitor/haptics');
  } catch {
    return null;
  }
}

export async function hapticImpact(style: ImpactLevel = 'medium'): Promise<void> {
  const h = await tryHaptics();
  if (!h) return;
  const map = { light: h.ImpactStyle.Light, medium: h.ImpactStyle.Medium, heavy: h.ImpactStyle.Heavy };
  await h.Haptics.impact({ style: map[style] }).catch(() => {});
}

export async function hapticNotification(type: NotificationKind = 'success'): Promise<void> {
  const h = await tryHaptics();
  if (!h) return;
  const map = { success: h.NotificationType.Success, warning: h.NotificationType.Warning, error: h.NotificationType.Error };
  await h.Haptics.notification({ type: map[type] }).catch(() => {});
}
