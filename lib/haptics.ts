'use client';

// Haptic feedback wrapper.
// On native iOS (Capacitor): uses @capacitor/haptics for precise physical feedback.
// On web: falls back to the Vibration API (supported on Android Chrome; no-op on iOS Safari).
// Always no-ops gracefully if neither API is available.

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

async function nativeHaptic(style: HapticStyle): Promise<boolean> {
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
        style === 'light'  ? ImpactStyle.Light  :
        style === 'medium' ? ImpactStyle.Medium  :
                             ImpactStyle.Heavy;
      await Haptics.impact({ style: impactStyle });
    }
    return true;
  } catch {
    return false;
  }
}

function webVibrate(ms: number) {
  try { navigator.vibrate?.(ms); } catch { /* unavailable */ }
}

export async function haptic(style: HapticStyle = 'light') {
  const didNative = await nativeHaptic(style);
  if (didNative) return;
  // Web fallback
  const duration =
    style === 'light'   ? 10  :
    style === 'medium'  ? 20  :
    style === 'heavy'   ? 40  :
    style === 'success' ? 15  :
    style === 'warning' ? 30  : 50;
  webVibrate(duration);
}

// Convenience exports for the most common call sites
export const hapticLight   = () => haptic('light');
export const hapticMedium  = () => haptic('medium');
export const hapticHeavy   = () => haptic('heavy');
export const hapticSuccess = () => haptic('success');
export const hapticError   = () => haptic('error');
