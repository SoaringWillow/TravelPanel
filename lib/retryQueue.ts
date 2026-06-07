import { getItemsByStatus, updateItemEnrichment } from './db';
import { enrichItem } from './enrichItem';

const MAX_RETRIES = 3;

// Imperatively retries all failed / stuck-processing items.
// Used by pull-to-refresh so it can be called outside the hook lifecycle.
export async function runRetryQueue(onItemUpdated?: (id: string) => void): Promise<void> {
  // Recover items stuck in 'processing' (app crash mid-enrichment)
  const stuck = await getItemsByStatus('processing');
  for (const item of stuck) {
    const safeCount = Math.max(0, (item.retryCount ?? 0) - 1);
    await updateItemEnrichment(item.id, 'failed');
    if (onItemUpdated) onItemUpdated(item.id);
    // Write the decremented retryCount so we don't burn a slot on a crash
    const { saveItem } = await import('./db');
    await saveItem({ ...item, retryCount: safeCount, enrichmentStatus: 'failed' });
  }

  // Retry failed items under the budget
  const failed = await getItemsByStatus('failed');
  const retryable = failed.filter((i) => (i.retryCount ?? 0) < MAX_RETRIES);

  for (const item of retryable) {
    const delay = Math.pow(2, (item.retryCount ?? 0)) * 1000;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    await enrichItem(item.id, item.url);
    if (onItemUpdated) onItemUpdated(item.id);
  }
}
