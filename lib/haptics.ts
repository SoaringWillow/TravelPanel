'use client';

// Haptic feedback helpers — no-op gracefully on web and when Capacitor is
// not available. All functions are fire-and-forget (no awaiting needed at call sites).

async function getHaptics() {
  if (typeof window === 'undefined') return null;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function tapLight() {
  const h = await getHaptics();
  if (!h) return;
  const { ImpactStyle } = await import('@capacitor/haptics');
  h.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export async function tapMedium() {
  const h = await getHaptics();
  if (!h) return;
  const { ImpactStyle } = await import('@capacitor/haptics');
  h.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export async function tapHeavy() {
  const h = await getHaptics();
  if (!h) return;
  const { ImpactStyle } = await import('@capacitor/haptics');
  h.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}

export async function successNotification() {
  const h = await getHaptics();
  if (!h) return;
  const { NotificationType } = await import('@capacitor/haptics');
  h.notification({ type: NotificationType.Success }).catch(() => {});
}

export async function errorNotification() {
  const h = await getHaptics();
  if (!h) return;
  const { NotificationType } = await import('@capacitor/haptics');
  h.notification({ type: NotificationType.Error }).catch(() => {});
}

export async function warningNotification() {
  const h = await getHaptics();
  if (!h) return;
  const { NotificationType } = await import('@capacitor/haptics');
  h.notification({ type: NotificationType.Warning }).catch(() => {});
}
