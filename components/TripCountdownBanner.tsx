'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { getAllTrips, getAllItems } from '@/lib/db';
import { Trip } from '@/lib/types';

interface CountdownInfo {
  trip: Trip;
  daysUntil: number;
  clipCount: number;
}

function daysUntilDate(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export default function TripCountdownBanner() {
  const router = useRouter();
  const [info, setInfo] = useState<CountdownInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function load() {
      const [trips, allItems] = await Promise.all([getAllTrips(), getAllItems()]);

      // Find the soonest upcoming trip with a departure date
      const upcoming = trips
        .filter((t) => t.departureDate)
        .map((t) => ({ t, d: daysUntilDate(t.departureDate!) }))
        .filter(({ d }) => d >= 0)
        .sort((a, b) => a.d - b.d);

      if (!upcoming[0]) return;
      const { t: trip, d: daysUntil } = upcoming[0];
      const clipCount = allItems.filter(
        (i) => i.boardId === trip.boardId && !i.isDemo
      ).length;

      setInfo({ trip, daysUntil, clipCount });
    }
    load();
  }, []);

  if (!info || dismissed) return null;

  const { trip, daysUntil, clipCount } = info;
  const label =
    daysUntil === 0
      ? "Today's the day! 🎉"
      : daysUntil === 1
      ? `${trip.boardName} — tomorrow! ✈️`
      : `${trip.boardName} in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} ✈️`;

  return (
    <button
      type="button"
      onClick={() => router.push(`/plan/${trip.boardId}`)}
      className="w-full flex items-center gap-3 bg-indigo-600 text-white px-4 py-3 text-left hover:bg-indigo-700 active:scale-[0.99] transition-all"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">{label}</p>
        <p className="text-xs text-indigo-200 mt-0.5">
          {clipCount} clip{clipCount !== 1 ? 's' : ''} ready
          {clipCount > 0 ? ' · tap to open plan' : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        className="flex-shrink-0 p-1 hover:bg-indigo-500 rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </button>
  );
}
