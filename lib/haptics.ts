'use client';

// Thin wrapper around @capacitor/haptics.
// In web/desktop context the import fails gracefully — all calls become no-ops.

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

async function getHaptics() {
  try {
    const { Haptics, ImpactStyle: IS, NotificationType: NT } = await import('@capacitor/haptics');
    return { Haptics, ImpactStyle: IS, NotificationType: NT };
  } catch {
    return null;
  }
}

export async function impact(style: ImpactStyle = 'light'): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  const styleMap = { light: h.ImpactStyle.Light, medium: h.ImpactStyle.Medium, heavy: h.ImpactStyle.Heavy };
  await h.Haptics.impact({ style: styleMap[style] }).catch(() => {});
}

export async function notification(type: NotificationType = 'success'): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  const typeMap = { success: h.NotificationType.Success, warning: h.NotificationType.Warning, error: h.NotificationType.Error };
  await h.Haptics.notification({ type: typeMap[type] }).catch(() => {});
}
