'use client';

import { useEffect } from 'react';

export function DarkModeSync() {
  useEffect(() => {
    function sync(e?: MediaQueryListEvent) {
      const prefersDark = e ? e.matches : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return null;
}
