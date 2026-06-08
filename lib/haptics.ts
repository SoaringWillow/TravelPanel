'use client';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light:   10,
  medium:  20,
  heavy:   40,
  success: [10, 50, 10],
  error:   [20, 100, 20],
};

export function vibrate(pattern: HapticPattern = 'light') {
  if (typeof navigator === 'undefined') return;
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(PATTERNS[pattern]);
    }
    // When @capacitor/haptics is added, import it here for native iOS haptics
  } catch {
    // Progressive enhancement — silently ignore if vibration is not supported
  }
}
