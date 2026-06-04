export async function hapticLight(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Not in Capacitor or haptics unavailable — silently no-op
  }
}

export async function hapticSuccess(): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Not in Capacitor or haptics unavailable — silently no-op
  }
}
