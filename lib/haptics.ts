'use client';

// Thin wrappers around @capacitor/haptics.
// No-ops on web and when the package is unavailable.

export async function impact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: styleMap[style] });
  } catch { /* not a native context or package unavailable */ }
}

export async function notification(type: 'success' | 'warning' | 'error'): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    await Haptics.notification({ type: typeMap[type] });
  } catch { /* not a native context or package unavailable */ }
}
