'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function OnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect from the onboarding page itself
    if (pathname === '/onboarding') return;

    try {
      const done = localStorage.getItem('hasCompletedOnboarding');
      if (!done) {
        router.replace('/onboarding');
      }
    } catch {
      // localStorage unavailable — skip onboarding silently
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
