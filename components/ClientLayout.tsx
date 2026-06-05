'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
