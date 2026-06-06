'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const EXCLUDED = ['/onboarding', '/share', '/api'];

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (EXCLUDED.some((prefix) => pathname.startsWith(prefix))) return;
    if (!localStorage.getItem('hasSeenOnboarding2')) {
      router.replace('/onboarding');
    }
  // Only run once on mount — pathname is needed for guard but shouldn't re-trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
