'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, MapPin, ChevronRight, Route } from 'lucide-react';
import { Trip } from '@/lib/types';
import { getAllTrips } from '@/lib/db';
import NavBar from '@/components/NavBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
  return formatDate(ts);
}

function tripLocationCount(trip: Trip): number {
  return trip.plan?.days?.reduce((sum, d) => sum + (d.locations?.length ?? 0), 0) ?? 0;
}

function tripKeyLocations(trip: Trip, max = 3): string[] {
  const names: string[] = [];
  for (const day of (trip.plan?.days ?? [])) {
    for (const loc of (day.locations ?? [])) {
      if (loc.name && !names.includes(loc.name)) names.push(loc.name);
      if (names.length >= max) return names;
    }
  }
  return names;
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ trip }: { trip: Trip }) {
  const [expanded, setExpanded] = useState(false);
  const locationCount = tripLocationCount(trip);
  const keyLocs = tripKeyLocations(trip, 4);
  const days = trip.plan?.days ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-start gap-3 px-4 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-gray-900 truncate">
              {trip.boardName || 'Trip Plan'}
            </span>
            {trip.name && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                {trip.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {trip.days} day{trip.days !== 1 ? 's' : ''}
            </span>
            {locationCount > 0 && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {locationCount} stop{locationCount !== 1 ? 's' : ''}
              </span>
            )}
            <span>{formatRelativeDate(trip.createdAt)}</span>
          </div>
          {/* Key locations preview */}
          {keyLocs.length > 0 && !expanded && (
            <p className="text-xs text-gray-500 mt-1.5 truncate">
              {keyLocs.join(' · ')}
            </p>
          )}
        </div>
        <ChevronRight
          size={16}
          className={`flex-shrink-0 text-gray-300 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded day-by-day preview */}
      {expanded && days.length > 0 && (
        <div className="border-t border-gray-50">
          {days.map((day, idx) => {
            const locs = (day.locations ?? []).filter((l) => l.name);
            const activities = (day.activities ?? []).slice(0, 3);
            return (
              <div key={idx} className="px-4 py-3 border-b border-gray-50 last:border-b-0">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  Day {day.day} — {day.theme}
                </p>
                {activities.map((act, aIdx) => (
                  <div key={aIdx} className="flex items-start gap-2 mb-1">
                    <span className="text-xs text-gray-400 w-10 flex-shrink-0 pt-0.5">{act.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 truncate">{act.location.name}</p>
                      <p className="text-xs text-gray-500 truncate">{act.name}</p>
                    </div>
                  </div>
                ))}
                {(day.activities ?? []).length > 3 && (
                  <p className="text-xs text-gray-400 pl-12">+{(day.activities ?? []).length - 3} more</p>
                )}
              </div>
            );
          })}
          {/* Open full plan link */}
          <Link
            href={`/plan/${trip.boardId}`}
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Route size={13} />
            View full plan
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Page ────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTrips()
      .then(setTrips)
      .finally(() => setLoading(false));
  }, []);

  // Group trips by month for the timeline headers
  const grouped = trips.reduce<Map<string, Trip[]>>((map, trip) => {
    const key = new Date(trip.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(trip);
    return map;
  }, new Map());

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-indigo-500" />
          <h1 className="text-xl font-bold text-gray-900">Journal</h1>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Your AI-generated trip plans</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
              <BookOpen size={26} className="text-indigo-300" />
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">No trip plans yet</p>
            <p className="text-gray-400 text-xs max-w-xs">
              Generate a trip plan from a Collection to see it here.
            </p>
            <Link
              href="/boards"
              className="mt-5 text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
            >
              Go to Collections →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([month, monthTrips]) => (
              <div key={month}>
                {/* Month header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{month}</p>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {/* Trip cards */}
                <div className="space-y-3 pl-5 border-l-2 border-gray-100 ml-1">
                  {monthTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NavBar active="timeline" />
    </div>
  );
}
