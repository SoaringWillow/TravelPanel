'use client';

import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function OfflineBanner() {
  const online = useNetworkStatus();
  if (online) return null;

  return (
    <div className="w-full bg-amber-500 text-white text-xs font-medium px-4 py-2 flex items-center gap-2 z-[999]">
      <WifiOff size={13} className="flex-shrink-0" />
      <span>You&apos;re offline — saved clips will enrich when you reconnect.</span>
    </div>
  );
}
