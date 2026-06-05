'use client';

import { useEffect } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function apply(e: MediaQueryList | MediaQueryListEvent) {
      document.documentElement.classList.toggle('dark', e.matches);
    }
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return <>{children}</>;
}
