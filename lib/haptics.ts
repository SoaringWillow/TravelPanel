'use client';

// Wrapper around @capacitor/haptics. All functions are safe no-ops in browsers
// and when the Capacitor native runtime is unavailable.

type ImpactStyle = 'Heavy' | 'Medium' | 'Light';
type NotificationType = 'Success' | 'Warning' | 'Error';

async function impact(style: ImpactStyle) {
  try {
    const { Haptics, ImpactStyle: IS } = await import('@capacitor/haptics');
    await Haptics.impact({ style: IS[style] });
  } catch {
    // Not in native context — no-op
  }
}

async function notification(type: NotificationType) {
  try {
    const { Haptics, NotificationType: NT } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NT[type] });
  } catch {
    // Not in native context — no-op
  }
}

/** Light tap — use on any button press */
export const tap     = () => impact('Light');

/** Medium impact — use on destructive or confirm actions */
export const medium  = () => impact('Medium');

/** Heavy thud — use on significant UI events (delete, error) */
export const heavy   = () => impact('Heavy');

/** Success notification pattern — use after clip saved, plan generated */
export const success = () => notification('Success');

/** Error notification pattern — use on enrichment failure, rate-limit hit */
export const error   = () => notification('Error');

/** Warning notification pattern — use on recoverable issues */
export const warning = () => notification('Warning');
