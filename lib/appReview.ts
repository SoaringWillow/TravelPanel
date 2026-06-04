'use client';

const REVIEW_FLAG_KEY  = 'tp_review_prompted';
const PLAN_COUNT_KEY   = 'tp_plan_count';

/** Called every time a plan is generated. Triggers a review prompt on the second generation. */
export async function maybeRequestReview(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Count how many plans have been generated (capped to avoid overflow)
  const prev = parseInt(localStorage.getItem(PLAN_COUNT_KEY) ?? '0', 10);
  const count = Math.min(prev + 1, 100);
  localStorage.setItem(PLAN_COUNT_KEY, String(count));

  // Only prompt once, and only after the second successful plan generation
  const alreadyPrompted = localStorage.getItem(REVIEW_FLAG_KEY) === 'true';
  if (alreadyPrompted || count < 2) return;

  localStorage.setItem(REVIEW_FLAG_KEY, 'true');

  try {
    // @capacitor-community/app-review — must be added to package.json to activate
    const { AppReview } = await import('@capacitor-community/app-review');
    await AppReview.requestReview();
  } catch {
    // Plugin not installed or not on native — silently ignore
  }
}
