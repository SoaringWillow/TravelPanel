import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export async function haptic(style: HapticStyle): Promise<void> {
  try {
    if (style === 'success' || style === 'warning' || style === 'error') {
      await Haptics.notification({
        type:
          style === 'success' ? NotificationType.Success :
          style === 'warning' ? NotificationType.Warning :
          NotificationType.Error,
      });
    } else {
      await Haptics.impact({
        style:
          style === 'light'  ? ImpactStyle.Light :
          style === 'medium' ? ImpactStyle.Medium :
          ImpactStyle.Heavy,
      });
    }
  } catch {
    // No-op in browser or when Capacitor plugin is unavailable
  }
}
