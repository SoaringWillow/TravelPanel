'use client';

// Haptic feedback wrappers — no-op in browser, tactile in native iOS.
// Import and call these at key interaction moments.

async function getHaptics() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    return { Haptics, ImpactStyle, NotificationType };
  } catch {
    return null;
  }
}

/** Chip taps, nav taps, board selection */
export async function hapticsLight(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.impact({ style: h.ImpactStyle.Light }).catch(() => {});
}

/** Clip saved successfully, board created */
export async function hapticsMedium(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.impact({ style: h.ImpactStyle.Medium }).catch(() => {});
}

/** Trip plan generation complete */
export async function hapticsHeavy(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.impact({ style: h.ImpactStyle.Heavy }).catch(() => {});
}

/** Enrichment failed after all retries, validation error */
export async function hapticsError(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.notification({ type: h.NotificationType.Error }).catch(() => {});
}

/** Subtle tick — scroll snapping, selection change */
export async function hapticsTick(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.selectionChanged().catch(() => {});
}
