'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

// Applies the resolved theme class to <html> on mount and on system changes.
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useTheme(); // side-effectful: sets document.documentElement class
  return <>{children}</>;
}
