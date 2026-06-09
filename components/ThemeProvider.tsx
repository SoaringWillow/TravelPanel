'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: 'system', setMode: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(mode: ThemeMode) {
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    const resolved: ThemeMode = stored ?? 'system';
    setModeState(resolved);
    applyTheme(resolved);

    // Listen for system preference changes when in 'system' mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onSystemChange() {
      if ((localStorage.getItem('theme') ?? 'system') === 'system') {
        applyTheme('system');
      }
    }
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    localStorage.setItem('theme', m);
    applyTheme(m);
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
