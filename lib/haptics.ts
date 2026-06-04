'use client';

// Capacitor haptics wrappers that no-op gracefully on web / non-native environments.
// Import dynamically to avoid server-side import errors.

async function getHaptics() {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    return { Haptics, ImpactStyle, NotificationType };
  } catch {
    return null;
  }
}

export async function tapLight(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Light }); } catch { /* web */ }
}

export async function tapMedium(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Medium }); } catch { /* web */ }
}

export async function tapSuccess(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Success }); } catch { /* web */ }
}

export async function tapWarning(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Warning }); } catch { /* web */ }
}
