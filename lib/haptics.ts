'use client';

// Haptic feedback utility.
// Uses navigator.vibrate() on Android/Web; on native iOS via Capacitor,
// falls back to a no-op (iOS requires @capacitor/haptics — add it in a future sprint).

export function hapticLight() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export function hapticMedium() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(20);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([10, 30, 10]);
  }
}

export function hapticError() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([30, 50, 30]);
  }
}

export function hapticSelect() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(6);
  }
}
