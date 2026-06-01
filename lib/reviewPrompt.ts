'use client';

const REVIEW_KEY    = 'reviewPromptedAt';
const REVIEW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getClipCount(): number {
  try {
    // PostHog stores plan count; we track clip count in localStorage as a proxy
    return parseInt(localStorage.getItem('totalClipsSaved') ?? '0', 10);
  } catch { return 0; }
}

function getPlanCount(): number {
  try {
    return parseInt(localStorage.getItem('totalPlansGenerated') ?? '0', 10);
  } catch { return 0; }
}

export function incrementClipCount() {
  try {
    const current = getClipCount();
    localStorage.setItem('totalClipsSaved', String(current + 1));
  } catch { /* ignore */ }
}

export function incrementPlanCount() {
  try {
    const current = getPlanCount();
    localStorage.setItem('totalPlansGenerated', String(current + 1));
  } catch { /* ignore */ }
}

export async function maybeRequestReview(): Promise<void> {
  try {
    const clips = getClipCount();
    const plans = getPlanCount();

    // Must have saved 5+ clips and generated at least 1 plan
    if (clips < 5 || plans < 1) return;

    // Check cooldown
    const lastPromptedStr = localStorage.getItem(REVIEW_KEY);
    if (lastPromptedStr) {
      const lastPrompted = parseInt(lastPromptedStr, 10);
      if (Date.now() - lastPrompted < REVIEW_COOLDOWN_MS) return;
    }

    // Record the prompt attempt before calling so repeated failures don't re-prompt
    localStorage.setItem(REVIEW_KEY, String(Date.now()));

    // Try Capacitor native review API (iOS App Store)
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    // @capacitor-community/rate-app is optional; fall back gracefully
    try {
      const { RateApp } = await import('@capacitor-community/rate-app');
      await RateApp.requestReview();
    } catch {
      // Plugin not installed or not available — no-op on web
    }
  } catch {
    // Any error is non-fatal
  }
}
