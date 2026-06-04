'use client';

import { useEffect } from 'react';

export function ThemeProvider() {
  useEffect(() => {
    function applyTheme() {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
    }

    applyTheme();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, []);

  return null;
}
