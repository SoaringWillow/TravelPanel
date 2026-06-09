'use client';

import { useRouter } from 'next/navigation';
import OnboardingSlides from '@/components/OnboardingSlides';

export default function OnboardingPage() {
  const router = useRouter();

  function handleComplete() {
    try {
      localStorage.setItem('hasCompletedOnboarding', 'true');
    } catch {
      // localStorage blocked (private browsing) — still proceed
    }
    router.replace('/boards');
  }

  return (
    <div
      className="fixed inset-0 bg-white dark:bg-gray-950 z-50 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <OnboardingSlides onComplete={handleComplete} />
    </div>
  );
}
