'use client';

// Thin wrapper around @capacitor/haptics.
// All functions no-op gracefully outside a Capacitor native context.

type ImpactStyle = 'Heavy' | 'Medium' | 'Light';
type NotificationType = 'Success' | 'Warning' | 'Error';

async function getHaptics() {
  try {
    const { Haptics, ImpactStyle: IS, NotificationType: NT } = await import('@capacitor/haptics');
    return { Haptics, ImpactStyle: IS, NotificationType: NT };
  } catch {
    return null;
  }
}

export async function impact(style: ImpactStyle = 'Medium'): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try {
    await h.Haptics.impact({ style: h.ImpactStyle[style] });
  } catch { /* not a native context */ }
}

export async function notification(type: NotificationType = 'Success'): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try {
    await h.Haptics.notification({ type: h.NotificationType[type] });
  } catch { /* not a native context */ }
}

export async function selection(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try {
    await h.Haptics.selectionStart();
    await h.Haptics.selectionEnd();
  } catch { /* not a native context */ }
}
