'use client';

// Thin wrapper around @capacitor/haptics.
// No-ops on web (non-native contexts) so calling code never has to guard.

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export async function haptic(style: HapticStyle = 'light'): Promise<void> {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (style === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (style === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      const impactStyle =
        style === 'heavy' ? ImpactStyle.Heavy
        : style === 'medium' ? ImpactStyle.Medium
        : ImpactStyle.Light;
      await Haptics.impact({ style: impactStyle });
    }
  } catch {
    // Not in a Capacitor native context — no-op
  }
}
