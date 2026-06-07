'use client';

import { useState, useEffect } from 'react';
import { X, Plane } from 'lucide-react';
import Link from 'next/link';
import { getUpcomingTrip, shouldShowReminder, daysUntilDeparture, UpcomingTrip } from '@/lib/resurfacing';

const DISMISS_KEY = 'travelPanelReminderDismissedDate';

export function TripReminder() {
  const [trip, setTrip] = useState<UpcomingTrip | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = getUpcomingTrip();
    if (!shouldShowReminder(t)) return;

    // Don't re-show if already dismissed today
    const dismissed = localStorage.getItem(DISMISS_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (dismissed === today) return;

    setTrip(t);
    setVisible(true);
  }, []);

  function handleDismiss() {
    setVisible(false);
    const today = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(DISMISS_KEY, today); } catch { /* no-op */ }
  }

  if (!visible || !trip) return null;

  const days = daysUntilDeparture(trip.departureDate);
  const boardHref = trip.boardId ? `/boards/${trip.boardId}` : '/boards';

  return (
    <div className="mx-4 mt-3 bg-indigo-600 text-white rounded-2xl shadow-lg overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-shrink-0 mt-0.5">
          <Plane size={18} className="text-indigo-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">
            {days === 0
              ? `Your ${trip.destination} trip is today! 🎉`
              : days === 1
              ? `Your ${trip.destination} trip is tomorrow!`
              : `${trip.destination} in ${days} days`}
          </p>
          <Link
            href={boardHref}
            className="text-xs text-indigo-200 hover:text-white underline underline-offset-2 mt-0.5 inline-block"
          >
            Review your saved spots →
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-indigo-300 hover:text-white transition-colors p-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
