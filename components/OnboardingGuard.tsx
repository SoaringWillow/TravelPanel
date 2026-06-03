'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isOnboardingDone } from '@/app/onboarding/page';

export function OnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/onboarding') return;
    if (!isOnboardingDone()) {
      router.replace('/onboarding');
    }
  }, [router, pathname]);

  return null;
}
