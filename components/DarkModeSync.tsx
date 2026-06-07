'use client';

import { useEffect } from 'react';

// Listens for system dark-mode changes after initial render and keeps the
// <html class="dark"> in sync. The initial class is set by the inline script
// in layout.tsx before React hydrates, preventing any flash of unstyled content.
export function DarkModeSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e: MediaQueryListEvent | MediaQueryList) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return null;
}
