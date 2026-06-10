// Eligibility: ≥5 clips AND ≥1 plan generated AND not prompted in last 60 days.
// Only fires inside the iOS Capacitor app.

const LAST_PROMPTED_KEY = 'reviewPromptedAt';
const PLAN_COUNT_KEY    = 'reviewPlanCount';
const SIXTY_DAYS_MS     = 60 * 24 * 60 * 60 * 1000;

export function recordPlanGenerated(): void {
  try {
    const prev = parseInt(localStorage.getItem(PLAN_COUNT_KEY) ?? '0', 10);
    localStorage.setItem(PLAN_COUNT_KEY, String(prev + 1));
  } catch {}
}

export async function maybePromptReview(clipCount: number): Promise<void> {
  try {
    // Only run inside the native Capacitor shell
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const planCount    = parseInt(localStorage.getItem(PLAN_COUNT_KEY)    ?? '0', 10);
    const lastPrompted = parseInt(localStorage.getItem(LAST_PROMPTED_KEY) ?? '0', 10);
    const now          = Date.now();

    if (clipCount < 5)                       return;
    if (planCount < 1)                       return;
    if (now - lastPrompted < SIXTY_DAYS_MS)  return;

    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();

    localStorage.setItem(LAST_PROMPTED_KEY, String(now));
  } catch {}
}
