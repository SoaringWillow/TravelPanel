// Haptic feedback wrappers — no-op in browser, native feel in Capacitor iOS.
// Dynamic import avoids bundling the native plugin in web-only builds.

async function impact(style: 'LIGHT' | 'MEDIUM' | 'HEAVY'): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] });
  } catch {
    // Not available in browser or @capacitor/haptics not installed — silently no-op
  }
}

async function notification(type: 'SUCCESS' | 'WARNING' | 'ERROR'): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType[type] });
  } catch {
    // Silently no-op
  }
}

/** Light tap — pin tap, list item tap */
export const taptic = () => impact('LIGHT');

/** Medium pulse — save confirmed, board created */
export const successTaptic = () => notification('SUCCESS');

/** Strong thud — delete, error, limit hit */
export const errorTaptic = () => notification('ERROR');
