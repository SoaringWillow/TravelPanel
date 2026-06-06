'use client';

import { useEffect, useState } from 'react';
import { getAllTrips } from '@/lib/db';

function isActiveToday(startDate: string, days: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  return today >= start && today <= end;
}

export function TodayDot() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    getAllTrips().then((trips) => {
      const hasActive = trips.some(
        (t) => t.startDate && isActiveToday(t.startDate, t.days)
      );
      setActive(hasActive);
    }).catch(() => {});
  }, []);

  if (!active) return null;
  return <span className="block w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />;
}
