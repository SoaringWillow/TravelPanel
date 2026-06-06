'use client';

// Thin wrapper around @capacitor/haptics — no-ops in non-native (browser) contexts.
// Install: npx cap add @capacitor/haptics (already in @capacitor org)

type HapticImpactStyle = 'Light' | 'Medium' | 'Heavy';
type HapticNotificationType = 'Success' | 'Warning' | 'Error';

async function impact(style: HapticImpactStyle) {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] });
  } catch {
    // Not available in browser or haptics not installed — silent no-op
  }
}

async function notification(type: HapticNotificationType) {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType[type] });
  } catch {
    // Silent no-op
  }
}

export const haptics = {
  /** Short tap — button presses, gesture threshold crossings */
  light: () => impact('Light'),
  /** Medium tap — saves, confirmations */
  medium: () => impact('Medium'),
  /** Strong tap — destructive actions like delete confirm */
  heavy: () => impact('Heavy'),
  /** Three-tap success pattern — clip saved, plan generated */
  success: () => notification('Success'),
  /** Single-tap warning — rate limit, failed enrichment */
  warning: () => notification('Warning'),
  /** Error pattern — network failure, invalid input */
  error: () => notification('Error'),
};
