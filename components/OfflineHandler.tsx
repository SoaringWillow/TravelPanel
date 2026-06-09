'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { getPendingItems } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';

// ─── Retry pending items staggered 500ms apart ────────────────────────────────

async function retryPendingItems() {
  const pending = await getPendingItems();
  const eligible = pending.filter(item => (item.retryCount ?? 0) < 3);
  for (let i = 0; i < eligible.length; i++) {
    const item = eligible[i];
    setTimeout(() => {
      enrichItem(item.id, item.url);
    }, i * 500);
  }
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export default function OfflineHandler() {
  const [offline, setOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  const handleOnline = useCallback(() => {
    setOffline(false);
    setBackOnline(true);
    retryPendingItems();
    const t = setTimeout(() => setBackOnline(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleOffline = useCallback(() => {
    setOffline(true);
    setBackOnline(false);
  }, []);

  useEffect(() => {
    // Sync initial state
    setOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  if (!offline && !backOnline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[2000] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium
        transition-all duration-300
        ${backOnline
          ? 'bg-emerald-500 text-white'
          : 'bg-gray-800 text-gray-100 dark:bg-gray-700'
        }`}
    >
      {backOnline ? (
        <>
          <CheckCircle2 size={13} />
          Back online — syncing clips…
        </>
      ) : (
        <>
          <WifiOff size={13} />
          You&apos;re offline — clips will enrich when back online
        </>
      )}
    </div>
  );
}
