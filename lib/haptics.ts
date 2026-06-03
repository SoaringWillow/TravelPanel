// Haptic feedback wrapper — calls @capacitor/haptics when running in a native
// Capacitor shell; silently no-ops on web browsers.

type HapticsPlugin = typeof import('@capacitor/haptics').Haptics;

let _haptics: HapticsPlugin | null = null;

async function getHaptics(): Promise<HapticsPlugin | null> {
  if (_haptics !== null) return _haptics;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    _haptics = Haptics;
    return Haptics;
  } catch {
    _haptics = null;
    return null;
  }
}

export async function lightImpact(): Promise<void> {
  try {
    const H = await getHaptics();
    if (!H) return;
    const { ImpactStyle } = await import('@capacitor/haptics');
    await H.impact({ style: ImpactStyle.Light });
  } catch { /* noop */ }
}

export async function mediumImpact(): Promise<void> {
  try {
    const H = await getHaptics();
    if (!H) return;
    const { ImpactStyle } = await import('@capacitor/haptics');
    await H.impact({ style: ImpactStyle.Medium });
  } catch { /* noop */ }
}

export async function successNotification(): Promise<void> {
  try {
    const H = await getHaptics();
    if (!H) return;
    const { NotificationType } = await import('@capacitor/haptics');
    await H.notification({ type: NotificationType.Success });
  } catch { /* noop */ }
}

export async function errorNotification(): Promise<void> {
  try {
    const H = await getHaptics();
    if (!H) return;
    const { NotificationType } = await import('@capacitor/haptics');
    await H.notification({ type: NotificationType.Error });
  } catch { /* noop */ }
}
