'use client';

// Running tally of AI token spend, recorded client-side from the usage data
// the API routes report. Foundation for the cost dashboard / Pro-tier limits —
// makes per-user AI cost observable instead of invisible.

import { TokenUsage } from './types';

const KEY = 'travelpanel_ai_usage_v1';

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  since: number; // epoch ms of first recorded call
}

export function getUsageTotals(): UsageTotals {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as UsageTotals;
  } catch {
    // fall through to fresh totals
  }
  return { inputTokens: 0, outputTokens: 0, calls: 0, since: Date.now() };
}

export function recordUsage(usage: TokenUsage | undefined): void {
  if (!usage || typeof window === 'undefined') return;
  const totals = getUsageTotals();
  totals.inputTokens += usage.inputTokens ?? 0;
  totals.outputTokens += usage.outputTokens ?? 0;
  totals.calls += 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(totals));
  } catch {
    // storage full — drop silently
  }
}
