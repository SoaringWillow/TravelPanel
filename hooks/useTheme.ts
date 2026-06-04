'use client';

import { useState, useEffect, useCallback } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* */ }
  return 'system';
}

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const pref = getPreference();
    const res = resolveTheme(pref);
    setPreferenceState(pref);
    setResolved(res);
    applyTheme(res);

    // Listen for system preference changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onSystemChange() {
      const currentPref = getPreference();
      if (currentPref === 'system') {
        const newRes = resolveTheme('system');
        setResolved(newRes);
        applyTheme(newRes);
      }
    }
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* */ }
    const res = resolveTheme(pref);
    setPreferenceState(pref);
    setResolved(res);
    applyTheme(res);
  }, []);

  return { preference, resolved, setPreference };
}
