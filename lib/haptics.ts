'use client';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

/**
 * Trigger a haptic feedback event. No-ops in browser environments where
 * @capacitor/haptics is unavailable.
 */
export async function triggerHaptic(style: HapticStyle = 'light'): Promise<void> {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (style === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (style === 'selection') {
      await Haptics.selectionChanged();
    } else {
      const impactStyle =
        style === 'heavy' ? ImpactStyle.Heavy :
        style === 'medium' ? ImpactStyle.Medium :
        ImpactStyle.Light;
      await Haptics.impact({ style: impactStyle });
    }
  } catch {
    // @capacitor/haptics not installed or not in native context — no-op
  }
}
