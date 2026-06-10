'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

// Page entry animation — subtle slide-up + fade. Shared across all app-router pages.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
