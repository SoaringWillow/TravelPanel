'use client';

import { useCallback, useEffect } from 'react';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { emitItemUpdated } from '@/lib/appEvents';
import { seedDemoIfFirstLaunch } from '@/lib/seed';

// Mounted once in the root layout so app-wide background services run on
// EVERY route — most importantly `/`, the default landing page and the
// Share-Sheet return target, which previously had no retry queue or seeding.
export default function AppServices() {
  const onItemUpdated = useCallback((id: string) => emitItemUpdated(id), []);
  useEnrichmentRetry(onItemUpdated);

  useEffect(() => {
    seedDemoIfFirstLaunch().then((seeded) => {
      // Reload so all data hooks pick up freshly-seeded boards. The seeded
      // flag is already set, so this cannot loop.
      if (seeded) window.location.reload();
    });
  }, []);

  return null;
}
