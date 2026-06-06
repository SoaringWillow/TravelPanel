'use client';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Fire a haptic effect. No-ops gracefully in browsers or when @capacitor/haptics
 * is unavailable. Always call from a user-gesture handler (click/touch).
 */
export async function haptic(style: HapticStyle = 'light'): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

    if (style === 'success' || style === 'warning' || style === 'error') {
      await Haptics.notification({
        type:
          style === 'success' ? NotificationType.Success :
          style === 'warning' ? NotificationType.Warning :
                                NotificationType.Error,
      });
    } else {
      await Haptics.impact({
        style:
          style === 'heavy'  ? ImpactStyle.Heavy  :
          style === 'medium' ? ImpactStyle.Medium  :
                               ImpactStyle.Light,
      });
    }
  } catch {
    // Not a Capacitor context or haptics unavailable — silent no-op
  }
}
