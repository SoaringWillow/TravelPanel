'use client';

// Thin wrappers around @capacitor/haptics that no-op gracefully outside
// native iOS/Android contexts or when the package isn't installed yet.
// Add @capacitor/haptics via: npm install @capacitor/haptics && npx cap sync ios

async function runHaptic(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // not in native context or package not yet installed
  }
}

/** Light impact — use on button presses and item selections. */
export async function tap(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  });
}

/** Notification success feedback — use on save/complete actions. */
export async function success(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  });
}

/** Notification warning feedback — use on destructive actions like delete. */
export async function warning(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Warning });
  });
}
