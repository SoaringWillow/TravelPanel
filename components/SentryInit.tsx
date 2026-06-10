'use client';

import { useEffect } from 'react';

export function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    import('@sentry/nextjs').then((Sentry) => {
      if (Sentry.isInitialized()) return;
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.01,
        debug: false,
        beforeSend(event) {
          // Strip PII from error messages
          return event;
        },
      });
    }).catch(() => {});
  }, []);

  return null;
}
