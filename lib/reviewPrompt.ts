'use client';

const KEY_CLIP_COUNT  = 'tp_clip_count';
const KEY_PROMPTED    = 'tp_review_prompted_at';
const TRIGGER_COUNT   = 5;
const MIN_DAYS_AGAIN  = 14;

export function incrementClipCount(): number {
  try {
    const prev = parseInt(localStorage.getItem(KEY_CLIP_COUNT) ?? '0', 10);
    const next = prev + 1;
    localStorage.setItem(KEY_CLIP_COUNT, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function shouldShowReviewPrompt(): boolean {
  try {
    const count = parseInt(localStorage.getItem(KEY_CLIP_COUNT) ?? '0', 10);
    if (count < TRIGGER_COUNT) return false;

    const lastShown = parseInt(localStorage.getItem(KEY_PROMPTED) ?? '0', 10);
    if (!lastShown) return true; // Never prompted

    const daysSince = (Date.now() - lastShown) / (1000 * 60 * 60 * 24);
    return daysSince >= MIN_DAYS_AGAIN;
  } catch {
    return false;
  }
}

export function recordReviewPrompted(): void {
  try {
    localStorage.setItem(KEY_PROMPTED, String(Date.now()));
  } catch {}
}

// Placeholder — replace with real App Store ID after submission
export const APP_STORE_URL = 'https://apps.apple.com/app/id000000000';
