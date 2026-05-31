// Haptic feedback wrapper. Uses @capacitor/haptics on iOS, falls back to
// navigator.vibrate() on Android, and is a no-op everywhere else.

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const VIBRATE_PATTERNS: Record<HapticStyle, number | number[]> = {
  light:   15,
  medium:  30,
  heavy:   50,
  success: [20, 40, 20],
  warning: [30, 30, 30],
  error:   [50, 30, 50],
};

export async function taptic(style: HapticStyle = 'light'): Promise<void> {
  if (typeof window === 'undefined') return;

  // Try native Capacitor haptics first (iOS)
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
        style === 'heavy' ? ImpactStyle.Heavy :
        style === 'medium' ? ImpactStyle.Medium :
        ImpactStyle.Light;
      await Haptics.impact({ style: impactStyle });
    }
    return;
  } catch {
    // Not in a Capacitor context or @capacitor/haptics not installed
  }

  // Fallback: Vibration API (Android / some browsers)
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(VIBRATE_PATTERNS[style]);
    }
  } catch {
    // Vibration not supported — silent no-op
  }
}
