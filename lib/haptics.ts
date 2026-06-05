'use client';

// Haptic feedback wrapper — uses @capacitor/haptics on iOS, navigator.vibrate() on web.
// All calls are no-ops if neither is available (e.g., desktop browsers).

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

// Maps our style vocabulary to Capacitor ImpactStyle / NotificationType values
const IMPACT_MAP: Record<string, string> = {
  light:  'Light',
  medium: 'Medium',
  heavy:  'Heavy',
};

const NOTIFICATION_MAP: Record<string, string> = {
  success: 'Success',
  warning: 'Warning',
  error:   'Error',
};

// Web vibration patterns (milliseconds) as fallback
const WEB_VIBRATE_MAP: Record<HapticStyle, number | number[]> = {
  light:   20,
  medium:  35,
  heavy:   60,
  success: [20, 40, 20],
  warning: [40, 30, 60],
  error:   [80, 40, 80],
};

export function isHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('tp_haptics') !== 'false';
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tp_haptics', enabled ? 'true' : 'false');
}

export async function feedback(style: HapticStyle = 'light'): Promise<void> {
  if (!isHapticsEnabled()) return;
  try {
    // Try Capacitor Haptics (iOS native)
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (style in IMPACT_MAP) {
      await Haptics.impact({ style: (ImpactStyle as Record<string, string>)[IMPACT_MAP[style]] as never });
    } else if (style in NOTIFICATION_MAP) {
      await Haptics.notification({ type: (NotificationType as Record<string, string>)[NOTIFICATION_MAP[style]] as never });
    }
  } catch {
    // Capacitor Haptics not available — try web vibration API
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(WEB_VIBRATE_MAP[style]);
      }
    } catch {
      // Vibration not supported — silent no-op
    }
  }
}
