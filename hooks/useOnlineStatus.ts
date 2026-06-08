'use client';

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setJustCameOnline(true);
      const t = setTimeout(() => setJustCameOnline(false), 3000);
      return () => clearTimeout(t);
    }
    function handleOffline() {
      setIsOnline(false);
      setJustCameOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, justCameOnline };
}
