'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Listens for the custom event dispatched by the TravelPanel browser extension
 * after it writes pending clips to IndexedDB, then triggers a soft navigation
 * refresh so useSavedItems hooks re-read from DB.
 */
export function ExtensionSyncBridge() {
  const router = useRouter();

  useEffect(() => {
    function handleSync(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.newItems > 0) {
        router.refresh();
      }
    }
    window.addEventListener('travelpanel:extension-sync', handleSync);
    return () => window.removeEventListener('travelpanel:extension-sync', handleSync);
  }, [router]);

  return null;
}
