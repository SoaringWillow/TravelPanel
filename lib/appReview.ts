'use client';

import { Capacitor } from '@capacitor/core';

const REVIEW_PROMPTED_KEY = 'appReviewPrompted';
const CLIP_COUNT_KEY = 'nonDemoClipCount';
const REVIEW_THRESHOLD = 10;

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

export function shouldPromptReview(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    if (localStorage.getItem(REVIEW_PROMPTED_KEY)) return false;
    const count = parseInt(localStorage.getItem(CLIP_COUNT_KEY) ?? '0', 10);
    return count >= REVIEW_THRESHOLD;
  } catch {
    return false;
  }
}

export function markReviewPrompted(): void {
  try { localStorage.setItem(REVIEW_PROMPTED_KEY, '1'); } catch { /* noop */ }
}

export async function requestAppReview(): Promise<void> {
  markReviewPrompted();
  try {
    // Dynamically load optional native plugin — gracefully no-ops if not installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await new Function('spec', 'return import(spec)')('@capacitor-community/app-review');
    await mod?.AppReview?.requestReview?.();
  } catch {
    // Plugin not available — no-op on web
  }
}
