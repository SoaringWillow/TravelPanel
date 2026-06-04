'use client';

import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY';
type NotificationType = 'SUCCESS' | 'WARNING' | 'ERROR';

async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function hapticImpact(style: ImpactStyle = 'LIGHT') {
  const Haptics = await getHaptics();
  if (!Haptics) return;
  try {
    const { ImpactStyle: Style } = await import('@capacitor/haptics');
    await Haptics.impact({ style: Style[style] });
  } catch { /* noop */ }
}

export async function hapticNotification(type: NotificationType = 'SUCCESS') {
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
