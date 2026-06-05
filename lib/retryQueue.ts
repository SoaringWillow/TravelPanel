'use client';

import { getItemsByStatus } from './db';
import { enrichItem } from './enrichItem';

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [2000, 4000, 8000];

// Re-enriches items that failed extraction, with exponential backoff.
// Called on pull-to-refresh and on app focus.
export async function runRetryQueue(): Promise<number> {
  let retried = 0;
  try {
    const failed = await getItemsByStatus('failed');
    const eligible = failed.filter((item) => (item.retryCount ?? 0) < MAX_RETRIES);

    for (const item of eligible) {
      const delay = RETRY_BACKOFF_MS[Math.min(item.retryCount ?? 0, RETRY_BACKOFF_MS.length - 1)];
      await new Promise((r) => setTimeout(r, delay));
      await enrichItem(item.id, item.url);
      retried++;
    }
  } catch {
    // Silently ignore — retries are best-effort
  }
  return retried;
}
