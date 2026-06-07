'use client';

// Thin wrapper around @capacitor/haptics that silently no-ops in a browser context.
// Import this anywhere; it never throws and never needs a try-catch at call sites.

type ImpactWeight = 'Light' | 'Medium' | 'Heavy';
type NotifType    = 'Success' | 'Warning' | 'Error';

async function getHaptics() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export async function impactLight()  { await impact('Light');  }
export async function impactMedium() { await impact('Medium'); }
export async function impactHeavy()  { await impact('Heavy');  }

async function impact(style: ImpactWeight) {
  const h = await getHaptics();
  if (!h) return;
  const { ImpactStyle } = await import('@capacitor/haptics');
  h.impact({ style: ImpactStyle[style] });
}

export async function notifySuccess() { await notify('Success'); }
export async function notifyWarning() { await notify('Warning'); }
export async function notifyError()   { await notify('Error');   }

async function notify(type: NotifType) {
  const h = await getHaptics();
  if (!h) return;
  const { NotificationType } = await import('@capacitor/haptics');
  h.notification({ type: NotificationType[type] });
}

export async function selectionChanged() {
  const h = await getHaptics();
  if (!h) return;
  h.selectionChanged();
}
