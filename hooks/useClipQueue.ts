'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getQueuedClips, removeQueuedClip } from '@/lib/clipQueue';

export function useClipQueue(onDrainClip: (url: string) => Promise<void>) {
  const [queueCount, setQueueCount] = useState(0);
  const [draining, setDraining] = useState(false);
  const drainingRef = useRef(false);

  async function refreshCount() {
    const clips = await getQueuedClips();
    setQueueCount(clips.length);
  }

  useEffect(() => {
    refreshCount();
  }, []);

  // Drain the queue when back online
  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    const clips = await getQueuedClips();
    if (clips.length === 0) return;

    drainingRef.current = true;
    setDraining(true);

    for (const clip of clips) {
      try {
        await onDrainClip(clip.url);
        await removeQueuedClip(clip.id);
      } catch {
        // Leave in queue on failure — will retry next online event
      }
    }

    drainingRef.current = false;
    setDraining(false);
    await refreshCount();
  }, [onDrainClip]);

  useEffect(() => {
    const onOnline = () => drainQueue();
    window.addEventListener('online', onOnline);
    // If already online when component mounts, drain immediately
    if (navigator.onLine) drainQueue();
    return () => window.removeEventListener('online', onOnline);
  }, [drainQueue]);

  return { queueCount, draining, refreshCount };
}
