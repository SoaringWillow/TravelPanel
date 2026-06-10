'use client';

// Thin wrappers around @capacitor/haptics — no-op on web or when the plugin
// is unavailable. Import and call freely; they're always safe to call.

async function impact(style: 'Light' | 'Medium' | 'Heavy') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] });
  } catch {
    // Not in a Capacitor context, or haptics unavailable — silently skip
  }
}

async function notify(type: 'Success' | 'Warning' | 'Error') {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType[type] });
  } catch {
    // No-op
  }
}

/** Single light tap — navigation, minor interactions */
export const tapLight = () => impact('Light');

/** Medium tap — board creation, save confirmation */
export const tapMedium = () => impact('Medium');

/** Success notification — clip saved, plan generated */
export const tapSuccess = () => notify('Success');

/** Error notification — failed action, validation error */
export const tapError = () => notify('Error');

/** Warning tap — rate limit hit, retry needed */
export const tapWarning = () => notify('Warning');
