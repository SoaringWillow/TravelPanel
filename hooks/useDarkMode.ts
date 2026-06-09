'use client';

import { useEffect, useState } from 'react';

type ColorScheme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'tp-color-scheme';

function getSystemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export function useDarkMode() {
  const [scheme, setSchemeState] = useState<ColorScheme>('auto');

  // On mount: read saved preference and apply
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ColorScheme | null) ?? 'auto';
    setSchemeState(saved);
    applyDark(saved === 'dark' || (saved === 'auto' && getSystemDark()));

    // Listen for system preference changes while in 'auto' mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if ((localStorage.getItem(STORAGE_KEY) ?? 'auto') === 'auto') {
        applyDark(e.matches);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function setScheme(s: ColorScheme) {
    setSchemeState(s);
    localStorage.setItem(STORAGE_KEY, s);
    applyDark(s === 'dark' || (s === 'auto' && getSystemDark()));
  }

  return { scheme, setScheme };
}
