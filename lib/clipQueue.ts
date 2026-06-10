import { openDB } from 'idb';

const QUEUE_DB = 'clip-queue';
const QUEUE_VERSION = 1;

interface QueuedClip {
  id: string;
  url: string;
  title?: string;
  queuedAt: number;
}

function getQueueDB() {
  if (typeof window === 'undefined') throw new Error('SSR');
  return openDB(QUEUE_DB, QUEUE_VERSION, {
    upgrade(db) {
      db.createObjectStore('queue', { keyPath: 'id' });
    },
  });
}

export async function enqueueClip(url: string, title?: string): Promise<void> {
  try {
    const db = await getQueueDB();
    const item: QueuedClip = {
      id: crypto.randomUUID(),
      url,
      title,
      queuedAt: Date.now(),
    };
    await db.put('queue', item);
  } catch {
    // Non-fatal — best effort
  }
}

export async function getQueuedClips(): Promise<QueuedClip[]> {
  try {
    const db = await getQueueDB();
    const all = await db.getAll('queue');
    return all.sort((a, b) => a.queuedAt - b.queuedAt);
  } catch {
    return [];
  }
}

export async function removeQueuedClip(id: string): Promise<void> {
  try {
    const db = await getQueueDB();
    await db.delete('queue', id);
  } catch {}
}

export async function clearQueue(): Promise<void> {
  try {
    const db = await getQueueDB();
    await db.clear('queue');
  } catch {}
}
