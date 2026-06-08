'use client';

type Theme = 'light' | 'dark' | 'system';

export function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
  try { localStorage.setItem('theme', theme); } catch {}
}

export function getTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme | null) ?? 'system';
  } catch {
    return 'system';
  }
}

// Called from a blocking <script> in layout to prevent flash
export function initThemeBlocking(): void {
  const stored = getTheme();
  applyTheme(stored);
}
