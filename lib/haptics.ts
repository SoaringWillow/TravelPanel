import { Capacitor } from '@capacitor/core';

async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function hapticSuccess() {
  const H = await getHaptics();
  if (!H) return;
  const { NotificationType } = await import('@capacitor/haptics');
  await H.notification({ type: NotificationType.Success }).catch(() => {});
}

export async function hapticWarning() {
  const H = await getHaptics();
  if (!H) return;
  const { NotificationType } = await import('@capacitor/haptics');
  await H.notification({ type: NotificationType.Warning }).catch(() => {});
}

export async function hapticMedium() {
  const H = await getHaptics();
  if (!H) return;
  const { ImpactStyle } = await import('@capacitor/haptics');
  await H.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export async function hapticLight() {
  const H = await getHaptics();
  if (!H) return;
  const { ImpactStyle } = await import('@capacitor/haptics');
  await H.impact({ style: ImpactStyle.Light }).catch(() => {});
}
