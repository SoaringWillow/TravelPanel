'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // Set initial state after mount (window.navigator is only available client-side)
    setOffline(!navigator.onLine);

    function handleOffline() {
      setOffline(true);
      setJustReconnected(false);
    }

    function handleOnline() {
      setOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 2500);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!offline && !justReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[2000] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all duration-300 ${
        offline
          ? 'bg-amber-500 text-white translate-y-0'
          : 'bg-emerald-500 text-white translate-y-0'
      }`}
      role="status"
      aria-live="polite"
    >
      {offline ? (
        <>
          <WifiOff size={13} />
          No internet — your clips are still available
        </>
      ) : (
        <>✓ Back online</>
      )}
    </div>
  );
}
