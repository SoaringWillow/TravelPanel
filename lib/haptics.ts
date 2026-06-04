'use client';

// Dynamic import so SSR and browsers without the Capacitor bridge never throw.
// All exported functions are fire-and-forget (void return, silent catch).

type HapticsModule = typeof import('@capacitor/haptics');

let _mod: HapticsModule | null = null;
async function mod(): Promise<HapticsModule | null> {
  if (_mod) return _mod;
  try {
    _mod = await import('@capacitor/haptics');
    return _mod;
  } catch {
    return null;
  }
}

export async function impactLight(): Promise<void> {
  const h = await mod();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Light }); } catch {}
}

export async function impactMedium(): Promise<void> {
  const h = await mod();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Medium }); } catch {}
}

export async function impactHeavy(): Promise<void> {
  const h = await mod();
  if (!h) return;
  try { await h.Haptics.impact({ style: h.ImpactStyle.Heavy }); } catch {}
}

export async function notificationSuccess(): Promise<void> {
  const h = await mod();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Success }); } catch {}
}

export async function notificationError(): Promise<void> {
  const h = await mod();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Error }); } catch {}
}

export async function notificationWarning(): Promise<void> {
  const h = await mod();
  if (!h) return;
  try { await h.Haptics.notification({ type: h.NotificationType.Warning }); } catch {}
}
