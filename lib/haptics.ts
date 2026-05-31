// Haptic feedback wrappers — no-op in browsers, use @capacitor/haptics on native.

async function impact(style: 'LIGHT' | 'MEDIUM' | 'HEAVY') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] });
  } catch {
    // browser or plugin unavailable — no-op
  }
}

async function notification(type: 'SUCCESS' | 'WARNING' | 'ERROR') {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType[type] });
  } catch {
    // no-op
  }
}

export const tapLight   = () => impact('LIGHT');
export const tapMedium  = () => impact('MEDIUM');
export const tapSuccess = () => notification('SUCCESS');
