type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

async function getHaptics() {
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function impact(style: ImpactStyle = 'medium') {
  const H = await getHaptics();
  if (!H) return;
  try {
    const { ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await H.impact({ style: styleMap[style] });
  } catch {
    // no-op in browser
  }
}

export async function notification(type: NotificationType = 'success') {
  const H = await getHaptics();
  if (!H) return;
  try {
    const { NotificationType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    await H.notification({ type: typeMap[type] });
  } catch {
    // no-op in browser
  }
}
