'use client';

// Haptic feedback wrapper.
// On iOS (Capacitor): uses @capacitor/haptics for native impact/notification feel.
// On web: falls back to navigator.vibrate() with short patterns.
// No-ops silently if neither is available.

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const WEB_PATTERNS: Record<HapticStyle, number | number[]> = {
  light:   10,
  medium:  20,
  heavy:   40,
  success: [10, 50, 20],
  error:   [30, 30, 30],
};

export async function haptic(style: HapticStyle = 'light'): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (style === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (style === 'error') {
        await Haptics.notification({ type: NotificationType.Error });
      } else {
        const impactMap: Record<string, ImpactStyle> = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: impactMap[style] ?? ImpactStyle.Medium });
      }
      return;
    }
  } catch {
    // Capacitor unavailable or haptics not supported
  }

  // Web vibration fallback
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(WEB_PATTERNS[style]);
    }
  } catch {
    // vibrate not supported
  }
}
