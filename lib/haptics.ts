// Haptic feedback wrapper — fires on native iOS (Capacitor), no-ops on web.
// Consumers import this and call it unconditionally; the guard is here.

type ImpactStyle = 'light' | 'medium' | 'heavy';

async function getHaptics() {
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function impact(style: ImpactStyle = 'medium'): Promise<void> {
  const H = await getHaptics();
  if (!H) return;
  const styleMap = { light: 'Light', medium: 'Medium', heavy: 'Heavy' } as const;
  await H.impact({ style: styleMap[style] as any }).catch(() => {});
}

export async function hapticSuccess(): Promise<void> {
  const H = await getHaptics();
  if (!H) return;
  await H.notification({ type: 'Success' as any }).catch(() => {});
}

export async function hapticWarning(): Promise<void> {
  const H = await getHaptics();
  if (!H) return;
  await H.notification({ type: 'Warning' as any }).catch(() => {});
}

export async function hapticError(): Promise<void> {
  const H = await getHaptics();
  if (!H) return;
  await H.notification({ type: 'Error' as any }).catch(() => {});
}
