'use client';

// Haptic feedback helpers — wrap @capacitor/haptics with no-op fallbacks for web.
// All functions silently no-op outside a Capacitor native context.

export async function hapticSave() {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* web or unsupported device */ }
}

export async function hapticLight() {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* web or unsupported device */ }
}

export async function hapticSuccess() {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* web or unsupported device */ }
}

export async function hapticError() {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch { /* web or unsupported device */ }
}
