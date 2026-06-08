import type { SeverityLevel } from '@sentry/nextjs';

// No-ops when NEXT_PUBLIC_SENTRY_DSN is absent; never throws.
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  import('@sentry/nextjs').then(({ captureException, setContext }) => {
    if (context) setContext('extra', context);
    captureException(err);
  }).catch(() => {});
}

export function captureMessage(message: string, level: SeverityLevel = 'info'): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  import('@sentry/nextjs').then(({ captureMessage: cm }) => {
    cm(message, level);
  }).catch(() => {});
}
