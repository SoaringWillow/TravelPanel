'use client';

// Thin wrapper around @capacitor/haptics — no-ops gracefully on web/desktop.
// Import and call directly from any component; it won't throw in a browser.

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

export async function impactHaptic(style: ImpactStyle = 'medium'): Promise<void> {
  try {
    const { Haptics, ImpactStyle: Style } = await import('@capacitor/haptics');
    const styleMap = {
      light:  Style.Light,
      medium: Style.Medium,
      heavy:  Style.Heavy,
    };
    await Haptics.impact({ style: styleMap[style] });
  } catch {
    // Not in Capacitor native context or permission not available — silent no-op
  }
}

export async function notificationHaptic(type: NotificationType = 'success'): Promise<void> {
  try {
    const { Haptics, NotificationType: NType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NType.Success,
      warning: NType.Warning,
      error:   NType.Error,
    };
    await Haptics.notification({ type: typeMap[type] });
  } catch {
    // Not in Capacitor native context — silent no-op
  }
}

export async function selectionHaptic(): Promise<void> {
  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionStart();
    await Haptics.selectionEnd();
  } catch {
    // Not in Capacitor native context — silent no-op
  }
}
