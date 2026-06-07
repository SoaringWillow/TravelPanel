'use client';

// Thin wrapper around @capacitor/haptics.
// All calls are no-ops outside a Capacitor native context.

type ImpactStyle  = 'light' | 'medium' | 'heavy';
type NotifyStyle  = 'success' | 'warning' | 'error';

async function getHaptics() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { Haptics, ImpactStyle: IS, NotificationType: NT } = await import('@capacitor/haptics');
    return { Haptics, IS, NT };
  } catch {
    return null;
  }
}

export async function impact(style: ImpactStyle = 'light') {
  const h = await getHaptics();
  if (!h) return;
  const map = { light: h.IS.Light, medium: h.IS.Medium, heavy: h.IS.Heavy };
  await h.Haptics.impact({ style: map[style] });
}

export async function notification(type: NotifyStyle = 'success') {
  const h = await getHaptics();
  if (!h) return;
  const map = { success: h.NT.SUCCESS, warning: h.NT.WARNING, error: h.NT.ERROR };
  await h.Haptics.notification({ type: map[type] });
}

export async function selectionChanged() {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.selectionChanged();
}
