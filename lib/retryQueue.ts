import { getItemsByStatus } from './db';
import { enrichItem } from './enrichItem';

const MAX_RETRIES = 3;

export async function runRetryQueue(): Promise<number> {
  const [pending, failed] = await Promise.all([
    getItemsByStatus('pending'),
    getItemsByStatus('failed'),
  ]);

  const candidates = [
    ...pending,
    ...failed.filter((i) => (i.retryCount ?? 0) < MAX_RETRIES),
  ];

  let retried = 0;
  for (const item of candidates) {
    await enrichItem(item.id, item.url);
    retried++;
  }
  return retried;
}
