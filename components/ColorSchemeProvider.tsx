'use client';

import { useEffect } from 'react';

export type ColorScheme = 'system' | 'light' | 'dark';

export function applyColorScheme(scheme: ColorScheme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = scheme === 'dark' || (scheme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('colorScheme', scheme);
}

export function ColorSchemeProvider() {
  useEffect(() => {
    const stored = (localStorage.getItem('colorScheme') as ColorScheme | null) ?? 'system';
    applyColorScheme(stored);

    if (stored === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  return null;
}
