'use client';

import { useEffect, useState } from 'react';
import { getStreakInfo } from '@/lib/streaks';

export function StreakBadge() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(getStreakInfo().current);
  }, []);

  if (streak < 2) return null;

  return (
    <span className="flex items-center gap-0.5 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
      🔥 {streak}
    </span>
  );
}
