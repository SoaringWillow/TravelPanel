// Haptic feedback wrappers — no-op gracefully in browser/web contexts

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotifyType = 'success' | 'warning' | 'error';

let _haptics: Awaited<ReturnType<typeof import('@capacitor/haptics')['Haptics']['impact']>> | undefined;

async function getHaptics() {
  try {
    const mod = await import('@capacitor/haptics');
    return mod;
  } catch {
    return null;
  }
}

export async function impact(style: ImpactStyle = 'medium'): Promise<void> {
  const mod = await getHaptics();
  if (!mod) return;
  const styleMap = {
    light: mod.ImpactStyle.Light,
    medium: mod.ImpactStyle.Medium,
    heavy: mod.ImpactStyle.Heavy,
  };
  await mod.Haptics.impact({ style: styleMap[style] }).catch(() => {});
}

export async function notify(type: NotifyType = 'success'): Promise<void> {
  const mod = await getHaptics();
  if (!mod) return;
  const typeMap = {
    success: mod.NotificationType.Success,
    warning: mod.NotificationType.Warning,
    error: mod.NotificationType.Error,
  };
  await mod.Haptics.notification({ type: typeMap[type] }).catch(() => {});
}
