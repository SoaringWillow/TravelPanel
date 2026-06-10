// Capacitor Haptics wrapper — no-ops gracefully on web / in tests.
// Dynamic import avoids module resolution errors when the Capacitor plugin
// is not present (e.g. during Next.js SSR or in the browser).

async function h() {
  try {
    return await import('@capacitor/haptics');
  } catch {
    return null;
  }
}

export async function hapticLight(): Promise<void> {
  try {
    const mod = await h();
    if (!mod) return;
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  } catch {}
}

export async function hapticMedium(): Promise<void> {
  try {
    const mod = await h();
    if (!mod) return;
    await mod.Haptics.impact({ style: mod.ImpactStyle.Medium });
  } catch {}
}

export async function hapticSuccess(): Promise<void> {
  try {
    const mod = await h();
    if (!mod) return;
    await mod.Haptics.notification({ type: mod.NotificationType.Success });
  } catch {}
}
