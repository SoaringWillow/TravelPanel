let _haptics: typeof import('@capacitor/haptics') | null = null;

async function getHaptics() {
  if (_haptics) return _haptics;
  try {
    _haptics = await import('@capacitor/haptics');
    return _haptics;
  } catch {
    return null;
  }
}

export async function impactMedium(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Medium }); } catch {}
}

export async function impactHeavy(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Heavy }); } catch {}
}

export async function notifySuccess(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Success }); } catch {}
}

export async function notifyWarning(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Warning }); } catch {}
}

export async function notifyError(): Promise<void> {
  const h = await getHaptics();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Error }); } catch {}
}
