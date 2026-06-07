'use client';

import { RefreshCw } from 'lucide-react';
import { PullState } from '@/hooks/usePullToRefresh';

interface Props {
  state: PullState;
}

// Renders the pull-down indicator above the scroll container.
// Shown while pulling (scales in) and while refreshing (spins).
export function PullToRefreshIndicator({ state }: Props) {
  const { pulling, progress, refreshing } = state;
  if (!pulling && !refreshing) return null;

  const rotation = refreshing ? undefined : `rotate(${progress * 360}deg)`;

  return (
    <div
      className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-20"
      style={{ transform: `translateY(${pulling ? Math.min(progress * 48, 48) : 0}px)` }}
    >
      <div
        className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center -mt-10 border border-gray-100 dark:border-gray-700 transition-all"
        style={{ opacity: pulling ? progress : 1 }}
      >
        <RefreshCw
          size={16}
          className={`text-indigo-500 dark:text-indigo-400 ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: rotation, transition: refreshing ? undefined : 'transform 0.05s linear' }}
        />
      </div>
    </div>
  );
}
