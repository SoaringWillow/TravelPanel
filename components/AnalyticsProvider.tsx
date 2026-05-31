'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

// Warms the PostHog client on mount. No-ops entirely without a key.
export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}
