'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plane } from 'lucide-react';
import { getAllTrips } from '@/lib/db';
import { Trip } from '@/lib/types';

const DISMISS_KEY = 'dismissedCountdowns';
const DAYS_THRESHOLD = 7;

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function dismiss(tripId: string): void {
  try {
    const d = getDismissed();
    d.add(tripId);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(d)));
  } catch {}
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function CountdownBanner() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<{ trip: Trip; daysLeft: number } | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const trips = await getAllTrips();
        const dismissed = getDismissed();
        let nearest: { trip: Trip; daysLeft: number } | null = null;

        for (const trip of trips) {
          if (!trip.startDate || dismissed.has(trip.id)) continue;
          const d = daysUntil(trip.startDate);
          if (d >= 0 && d <= DAYS_THRESHOLD) {
            if (!nearest || d < nearest.daysLeft) {
              nearest = { trip, daysLeft: d };
            }
          }
        }
        setUpcoming(nearest);
      } catch {}
    }
    check();
  }, []);

  if (!upcoming) return null;

  const { trip, daysLeft } = upcoming;
  const label =
    daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow!' : `in ${daysLeft} days`;

  return (
    <div className="mx-4 mb-3 bg-indigo-600 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md">
      <Plane size={18} className="text-white flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">
          {trip.boardName} starts {label}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/plan/${trip.boardId}`)}
          className="text-indigo-200 text-xs hover:text-white transition-colors"
        >
          Review your plan →
        </button>
      </div>
      <button
        type="button"
        aria-label="Dismiss trip countdown"
        onClick={() => {
          dismiss(trip.id);
          setUpcoming(null);
        }}
        className="p-1 text-indigo-200 hover:text-white transition-colors flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
