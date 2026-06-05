'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'tp_dark_mode';
export type ThemeMode = 'light' | 'dark' | 'system';

function getSystemDark(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export function useDarkMode() {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(false);

  // Initialise from localStorage on mount
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) ?? 'system') as ThemeMode;
    const dark = stored === 'dark' || (stored === 'system' && getSystemDark());
    setModeState(stored);
    setIsDark(dark);
    applyDark(dark);
  }, []);

  // Listen to OS changes when mode is 'system'
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      applyDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  function setMode(next: ThemeMode) {
    const dark = next === 'dark' || (next === 'system' && getSystemDark());
    setModeState(next);
    setIsDark(dark);
    applyDark(dark);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return { isDark, mode, setMode };
}
