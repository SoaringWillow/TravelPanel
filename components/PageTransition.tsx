'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const PUSH_PATHS = ['/boards/', '/plan/', '/timeline/', '/settings'];

function isPushPath(path: string): boolean {
  return PUSH_PATHS.some((p) => path.startsWith(p) && path.length > p.length);
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPush = isPushPath(pathname);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={isPush ? { x: '30%', opacity: 0 } : { opacity: 0, y: 4 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        exit={isPush ? { x: '-15%', opacity: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
