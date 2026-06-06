'use client';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

// Maps our semantic types to Capacitor ImpactStyle
const IMPACT_MAP: Record<string, 'Light' | 'Medium' | 'Heavy'> = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
  success: 'Medium',
  error: 'Heavy',
  warning: 'Medium',
};

// Maps our semantic types to Capacitor NotificationType
const NOTIFICATION_MAP: Record<string, 'Success' | 'Warning' | 'Error'> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
};

export async function haptic(type: HapticType): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (type in NOTIFICATION_MAP) {
        await Haptics.notification({ type: NotificationType[NOTIFICATION_MAP[type]] });
      } else {
        await Haptics.impact({ style: ImpactStyle[IMPACT_MAP[type]] });
      }
    } else if (navigator.vibrate) {
      // Web/Android fallback
      const ms = type === 'heavy' || type === 'error' ? 60 : type === 'success' ? 30 : 20;
      navigator.vibrate(ms);
    }
  } catch {
    // Haptics unavailable — no-op
  }
}
