// Haptic feedback wrappers — no-op safely on platforms that don't support vibration.
// On native iOS (Capacitor), swap these for @capacitor/haptics calls.
// On web/PWA, falls back to navigator.vibrate patterns.

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

/** Light tap — board selection, chip toggles, nav. */
export function lightImpact() {
  vibrate(10);
}

/** Medium impact — plan generation start, modal open. */
export function mediumImpact() {
  vibrate(30);
}

/** Success — clip saved, export done. */
export function success() {
  vibrate([15, 50, 15]);
}

/** Error — enrichment failure, network error. */
export function hapticError() {
  vibrate([50, 30, 50]);
}
