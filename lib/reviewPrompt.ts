'use client';

const CLIP_COUNT_KEY = 'tp_clip_count';
const REVIEW_REQUESTED_KEY = 'tp_review_requested';
const REVIEW_THRESHOLD = 5;

export function incrementClipCount(): number {
  try {
    const current = parseInt(localStorage.getItem(CLIP_COUNT_KEY) ?? '0', 10);
    const next = current + 1;
    localStorage.setItem(CLIP_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function hasRequestedReview(): boolean {
  try {
    return localStorage.getItem(REVIEW_REQUESTED_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markReviewRequested(): void {
  try {
    localStorage.setItem(REVIEW_REQUESTED_KEY, 'true');
  } catch {}
}

export function shouldPromptReview(): boolean {
  if (hasRequestedReview()) return false;
  try {
    const count = parseInt(localStorage.getItem(CLIP_COUNT_KEY) ?? '0', 10);
    return count >= REVIEW_THRESHOLD;
  } catch {
    return false;
  }
}

export async function requestReview(): Promise<void> {
  markReviewRequested();
  try {
    const { RateApp } = await import('capacitor-rate-app');
    await RateApp.requestReview();
  } catch {
    // Not in Capacitor context or plugin unavailable — no-op
  }
}
