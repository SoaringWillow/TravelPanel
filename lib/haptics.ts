'use client';

// Thin wrapper around @capacitor/haptics with a graceful no-op fallback for web.
// All public functions are safe to call in any context (web browser, iOS simulator,
// physical device) — they never throw.

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

async function getHaptics() {
  try {
    const { Haptics, ImpactStyle: IS, NotificationType: NT } = await import('@capacitor/haptics');
    return { Haptics, IS, NT };
  } catch {
    return null;
  }
}

export async function hapticImpact(style: ImpactStyle = 'light') {
  const h = await getHaptics();
  if (!h) {
    navigator.vibrate?.(style === 'heavy' ? 30 : style === 'medium' ? 20 : 10);
    return;
  }
  const styleMap = { light: h.IS.Light, medium: h.IS.Medium, heavy: h.IS.Heavy };
  await h.Haptics.impact({ style: styleMap[style] }).catch(() => {});
}

export async function hapticNotification(type: NotificationType = 'success') {
  const h = await getHaptics();
  if (!h) {
    navigator.vibrate?.(type === 'error' ? [20, 10, 20] : type === 'warning' ? [10, 5, 10] : [15]);
    return;
  }
  const typeMap = { success: h.NT.Success, warning: h.NT.Warning, error: h.NT.Error };
  await h.Haptics.notification({ type: typeMap[type] }).catch(() => {});
}

export async function hapticSelectionStart() {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.selectionStart().catch(() => {});
}

export async function hapticSelectionChanged() {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.selectionChanged().catch(() => {});
}

export async function hapticSelectionEnd() {
  const h = await getHaptics();
  if (!h) return;
  await h.Haptics.selectionEnd().catch(() => {});
}
