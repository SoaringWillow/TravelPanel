'use client';

import { useEffect } from 'react';

// Silently applies the saved dark-mode class on mount so every page benefits.
// Settings page uses useDarkMode directly for the toggle.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem('tp_dark_mode') ?? 'system';
    const dark =
      stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  return <>{children}</>;
}
