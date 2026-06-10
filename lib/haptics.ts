// Haptic feedback wrapper
// On native iOS (Capacitor), uses the Haptics plugin for precise motor feedback.
// On web/PWA, falls back to the Vibration API (Android + some browsers).

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

const vibDurations: Record<ImpactStyle, number> = {
  light: 10,
  medium: 20,
  heavy: 35,
};

const vibPatterns: Record<NotificationType, number[]> = {
  success: [10, 50, 10],
  warning: [20, 40, 20],
  error:   [30, 50, 30, 50, 30],
};

async function nativeHaptics() {
  try {
    const { Haptics } = await import('@capacitor/haptics' as never) as {
      Haptics: {
        impact: (options: { style: string }) => Promise<void>;
        notification: (options: { type: string }) => Promise<void>;
        selectionStart: () => Promise<void>;
        selectionChanged: () => Promise<void>;
        selectionEnd: () => Promise<void>;
      };
    };
    return Haptics;
  } catch {
    return null;
  }
}

/** Light tap for chip selection, filter toggle, card tap */
export async function impact(style: ImpactStyle = 'light') {
  const haptics = await nativeHaptics();
  if (haptics) {
    await haptics.impact({ style: style.charAt(0).toUpperCase() + style.slice(1) });
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(vibDurations[style]);
  }
}

/** System-style notification feedback for success/error/warning */
export async function notification(type: NotificationType) {
  const haptics = await nativeHaptics();
  if (haptics) {
    await haptics.notification({ type: type.charAt(0).toUpperCase() + type.slice(1) });
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(vibPatterns[type]);
  }
}

/** Subtle tick for drag threshold crossings and selection changes */
export async function selection() {
  const haptics = await nativeHaptics();
  if (haptics) {
    await haptics.selectionChanged();
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(6);
  }
}
