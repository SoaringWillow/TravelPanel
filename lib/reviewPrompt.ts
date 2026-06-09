'use client';

const PLANS_KEY = 'plansGenerated';
const REVIEW_REQUESTED_KEY = 'reviewRequested';

async function getNativeRateApp() {
  if (typeof window === 'undefined') return null;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { RateApp } = await import('capacitor-rate-app');
    return RateApp;
  } catch {
    return null;
  }
}

export function incrementPlansGenerated(): void {
  try {
    const current = parseInt(localStorage.getItem(PLANS_KEY) ?? '0', 10);
    localStorage.setItem(PLANS_KEY, String(current + 1));
  } catch {
    // localStorage unavailable — no-op
  }
}

export async function maybeRequestReview(): Promise<void> {
  try {
    const plans = parseInt(localStorage.getItem(PLANS_KEY) ?? '0', 10);
    const alreadyRequested = localStorage.getItem(REVIEW_REQUESTED_KEY) === 'true';
    if (plans < 2 || alreadyRequested) return;

    const plugin = await getNativeRateApp();
    if (!plugin) return;

    await plugin.requestReview();
    localStorage.setItem(REVIEW_REQUESTED_KEY, 'true');
  } catch {
    // Non-critical — silently fail
  }
}
