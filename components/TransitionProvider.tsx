'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { type ReactNode } from 'react';

export function TransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={pathname} style={{ display: 'contents' }}>
        {children}
      </div>
    </AnimatePresence>
  );
}
