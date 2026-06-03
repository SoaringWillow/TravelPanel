'use client';

// Haptic feedback — wraps @capacitor/haptics with a graceful no-op fallback.
// Calling haptic() in a web/desktop context is always safe: it silently does nothing.

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

export async function haptic(style: HapticStyle): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

    switch (style) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  } catch {
    // Not a Capacitor context or haptics not available — silent no-op
  }
}
