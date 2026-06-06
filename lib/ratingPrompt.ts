import { incrementStreak } from '@/lib/streaks';

const CLIP_COUNT_KEY = 'clipSaveCount';
const RATED_KEY = 'hasRequestedReview';
const REVIEW_THRESHOLD = 3;

export function recordClipSave(): void {
  try {
    const current = parseInt(localStorage.getItem(CLIP_COUNT_KEY) ?? '0', 10);
    localStorage.setItem(CLIP_COUNT_KEY, String(current + 1));
    incrementStreak();
  } catch {
    // localStorage unavailable (SSR / private mode)
  }
}

export async function maybeRequestReview(): Promise<void> {
  try {
    if (localStorage.getItem(RATED_KEY)) return;
    const count = parseInt(localStorage.getItem(CLIP_COUNT_KEY) ?? '0', 10);
    if (count < REVIEW_THRESHOLD) return;

    localStorage.setItem(RATED_KEY, '1');

    // On Capacitor (native iOS), try @capacitor-community/app-review.
    // The package may not be installed; dynamic import gracefully degrades.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@capacitor-community/app-review' as any);
      await mod.AppReview.requestReview();
    } catch {
      // Not available (web) or package not installed — silent no-op
    }
  } catch {
    // localStorage unavailable — no-op
  }
}

export function getClipSaveCount(): number {
  try {
    return parseInt(localStorage.getItem(CLIP_COUNT_KEY) ?? '0', 10);
  } catch {
    return 0;
  }
}
