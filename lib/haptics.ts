async function getHaptics() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    return { Haptics, ImpactStyle, NotificationType };
  } catch {
    return null;
  }
}

export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
  const h = await getHaptics();
  if (!h) return;
  const styleMap = { light: h.ImpactStyle.Light, medium: h.ImpactStyle.Medium, heavy: h.ImpactStyle.Heavy };
  await h.Haptics.impact({ style: styleMap[style] });
}

export async function hapticSuccess() {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.notification({ type: h.NotificationType.Success });
}

export async function hapticError() {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.notification({ type: h.NotificationType.Error });
}

export async function hapticSelection() {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.selectionStart();
}
