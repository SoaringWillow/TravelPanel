// Haptic feedback wrapper — uses Capacitor Haptics on native iOS,
// falls back to navigator.vibrate on web (Android). No-ops silently elsewhere.

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

async function getHapticsPlugin() {
  if (typeof window === 'undefined') return null;
  try {
    // Capacitor global is injected by the native bridge
    const cap = (window as unknown as { Capacitor?: { isPluginAvailable?: (name: string) => boolean } }).Capacitor;
    if (!cap?.isPluginAvailable?.('Haptics')) return null;
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

async function impact(style: ImpactStyle = 'medium'): Promise<void> {
  const haptics = await getHapticsPlugin();
  if (haptics) {
    const { ImpactStyle: IS } = await import('@capacitor/haptics');
    const styleMap = { light: IS.Light, medium: IS.Medium, heavy: IS.Heavy };
    await haptics.impact({ style: styleMap[style] });
  } else {
    const ms = style === 'light' ? 10 : style === 'medium' ? 20 : 40;
    navigator.vibrate?.(ms);
  }
}

async function notification(type: NotificationType = 'success'): Promise<void> {
  const haptics = await getHapticsPlugin();
  if (haptics) {
    const { NotificationType: NT } = await import('@capacitor/haptics');
    const typeMap = { success: NT.Success, warning: NT.Warning, error: NT.Error };
    await haptics.notification({ type: typeMap[type] });
  } else {
    const pattern = type === 'success' ? [20, 50, 20] : type === 'warning' ? [40, 30, 40] : [60, 30, 60, 30, 60];
    navigator.vibrate?.(pattern);
  }
}

async function selection(): Promise<void> {
  const haptics = await getHapticsPlugin();
  if (haptics) {
    await haptics.selectionStart();
    await haptics.selectionChanged();
    await haptics.selectionEnd();
  } else {
    navigator.vibrate?.(5);
  }
}

export const haptics = { impact, notification, selection };
