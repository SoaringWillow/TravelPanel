// Thin wrapper around @capacitor/haptics with a no-op fallback for web.
// Only import dynamically so the bundle doesn't fail in non-Capacitor contexts.

async function getHaptics() {
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function hapticSuccess() {
  const h = await getHaptics();
  if (!h) return;
  try {
    const { ImpactStyle } = await import('@capacitor/haptics');
    await h.impact({ style: ImpactStyle.Light });
  } catch { /* non-native env */ }
}

export async function hapticImpact() {
  const h = await getHaptics();
  if (!h) return;
  try {
    const { ImpactStyle } = await import('@capacitor/haptics');
    await h.impact({ style: ImpactStyle.Medium });
  } catch { /* non-native env */ }
}

export async function hapticWarning() {
  const h = await getHaptics();
  if (!h) return;
  try {
    const { NotificationType } = await import('@capacitor/haptics');
    await h.notification({ type: NotificationType.Warning });
  } catch { /* non-native env */ }
}

export async function hapticError() {
  const h = await getHaptics();
  if (!h) return;
  try {
    const { NotificationType } = await import('@capacitor/haptics');
    await h.notification({ type: NotificationType.Error });
  } catch { /* non-native env */ }
}

export async function hapticSelection() {
  const h = await getHaptics();
  if (!h) return;
  try { await h.selectionChanged(); } catch { /* non-native env */ }
}
