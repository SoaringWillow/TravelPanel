'use client';

import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'Light' | 'Medium' | 'Heavy';
type NotificationType = 'Success' | 'Warning' | 'Error';

async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function hapticImpact(style: ImpactStyle = 'Light') {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  try {
    const { ImpactStyle: Style } = await import('@capacitor/haptics');
    await Haptics.impact({ style: Style[style] });
  } catch { /* noop */ }
}

export async function hapticNotification(type: NotificationType = 'Success') {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  try {
    const { NotificationType: Type } = await import('@capacitor/haptics');
    await Haptics.notification({ type: Type[type] });
  } catch { /* noop */ }
}

export async function hapticSelectionChanged() {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  try {
    await Haptics.selectionChanged();
  } catch { /* noop */ }
}
