'use client';

const PRO_KEY = 'isPro';

export function isPro(): boolean {
  try {
    return localStorage.getItem(PRO_KEY) === '1';
  } catch {
    return false;
  }
}

// For use in the paywall upgrade sheet to simulate activation (no payment yet)
export function activatePro(): void {
  try { localStorage.setItem(PRO_KEY, '1'); } catch { /* */ }
}

export function deactivatePro(): void {
  try { localStorage.removeItem(PRO_KEY); } catch { /* */ }
}

// Plan generation limit for free tier
export const FREE_PLANS_PER_DAY = 3;
export const FREE_ENRICHMENTS_PER_DAY = 20;
