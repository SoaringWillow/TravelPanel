// Haptic feedback wrappers — no-op gracefully when Capacitor is not available
// (browser, simulator, or devices without haptics support).

export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light:  ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy:  ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[style] });
  } catch {
    // Capacitor not available (browser / simulator) — no-op
  }
}

export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error:   NotificationType.Error,
    };
    await Haptics.notification({ type: typeMap[type] });
  } catch {
    // Capacitor not available — no-op
  }
}
