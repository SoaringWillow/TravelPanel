// Thin wrapper around the Web Vibration API.
// No-ops on desktop — vibrate() is a no-op on browsers that don't support it.

export function lightHaptic(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export function mediumHaptic(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(30);
  }
}

export function successHaptic(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([10, 50, 20]);
  }
}
