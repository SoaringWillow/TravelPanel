'use client';

// Graceful haptic wrappers — all calls no-op outside Capacitor native context.
// Importing is always safe; the Capacitor module lazy-loads only on device.

async function loadHaptics() {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    return { Haptics, ImpactStyle, NotificationType };
  } catch {
    return null;
  }
}

/** Short, light tap — button presses, selections */
export async function lightTap(): Promise<void> {
  const h = await loadHaptics();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Light }); } catch {}
}

/** Medium tap — saves, confirmations */
export async function mediumTap(): Promise<void> {
  const h = await loadHaptics();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Medium }); } catch {}
}

/** Success pattern — clip saved, plan generated */
export async function successVibration(): Promise<void> {
  const h = await loadHaptics();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Success }); } catch {}
}

/** Error pattern — enrichment failed after retries */
export async function errorVibration(): Promise<void> {
  const h = await loadHaptics();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Error }); } catch {}
}
