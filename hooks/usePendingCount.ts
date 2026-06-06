'use client';

import { useState, useEffect } from 'react';

export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { getItemsByStatus } = await import('@/lib/db');
        const [pending, processing] = await Promise.all([
          getItemsByStatus('pending'),
          getItemsByStatus('processing'),
        ]);
        if (!cancelled) setCount(pending.length + processing.length);
      } catch {
        // db unavailable (SSR guard)
      }
    }

    check();
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}
