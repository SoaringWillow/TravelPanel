'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, MapPin, Clock, Calendar, Route, Share2, Clipboard } from 'lucide-react';
import { Trip, DayPlan, Activity } from '@/lib/types';
import { getTripsForBoard, getAllBoards } from '@/lib/db';
import { Board } from '@/lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function activityKey(dayIdx: number, actIdx: number) {
  return `${dayIdx}-${actIdx}`;
}

function loadChecked(tripId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`trip-checked-${tripId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function formatTripDate(ts: number): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(ts);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripSummaryPage() {
  const params  = useParams();
  const router  = useRouter();
  const tripId  = params.tripId as string;

  const [trip, setTrip]       = useState<Trip | null>(null);
  const [board, setBoard]     = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const boards = await getAllBoards();
        for (const b of boards) {
          const trips = await getTripsForBoard(b.id);
          const found = trips.find((t) => t.id === tripId);
          if (found) {
            setTrip(found);
            setBoard(b);
            setChecked(loadChecked(found.id));
            break;
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tripId]);

  // ── Derived stats ─────────────────────────────────────────────────────────

  const days: DayPlan[] = trip?.plan?.days ?? [];
  const allActivities: Array<{ day: number; activity: Activity; key: string }> = days.flatMap(
    (day, di) => day.activities.map((act, ai) => ({ day: day.day, activity: act, key: activityKey(di, ai) }))
  );
  const visitedActivities = allActivities.filter((a) => checked.has(a.key));
  const skippedActivities = allActivities.filter((a) => !checked.has(a.key));
  const visitedPercent = allActivities.length > 0
    ? Math.round((visitedActivities.length / allActivities.length) * 100)
    : 0;

  const allLocations = visitedActivities.map((a) => a.activity.location.name);
  const uniqueLocations = [...new Set(allLocations)];

  // ── Share / copy summary ──────────────────────────────────────────────────

  function buildTextSummary(): string {
    if (!trip || !board) return '';
    const lines: string[] = [
      `🗺 ${board.emoji} ${board.name} — Trip Summary`,
      `📅 ${formatTripDate(trip.createdAt)} · ${trip.days} day${trip.days !== 1 ? 's' : ''}`,
      `✅ ${visitedActivities.length}/${allActivities.length} activities visited`,
      '',
    ];
    days.forEach((day, di) => {
      lines.push(`Day ${day.day}: ${day.theme}`);
      day.activities.forEach((act, ai) => {
        const k = activityKey(di, ai);
        const mark = checked.has(k) ? '✅' : '⬜';
        lines.push(`  ${mark} ${act.time} — ${act.name} (${act.location.name})`);
      });
      lines.push('');
    });
    if (trip.plan?.tips?.length) {
      lines.push('💡 Trip tips:');
      trip.plan.tips.forEach((t) => lines.push(`  • ${t}`));
    }
    return lines.join('\n');
  }

  async function handleShare() {
    const text = buildTextSummary();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${board?.name ?? 'Trip'} Summary`, text });
        return;
      } catch { /* cancelled */ }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard denied */ }
  }

  // ── Loading / empty ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400 animate-pulse">Loading summary…</div>
      </div>
    );
  }

  if (!trip || !trip.plan) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center gap-4">
        <Calendar size={48} className="text-gray-300" />
        <h2 className="text-lg font-bold text-gray-800">Trip not found</h2>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">Post-Trip Summary</p>
            <h1 className="text-base font-bold text-gray-900 truncate">
              {board?.emoji} {board?.name ?? 'Trip'}
            </h1>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            {copied ? <><Clipboard size={13} /> Copied!</> : <><Share2 size={13} /> Share</>}
          </button>
        </div>

        {/* Trip meta */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
            <Calendar size={11} />
            {formatTripDate(trip.createdAt)}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
            <Clock size={11} />
            {trip.days} day{trip.days !== 1 ? 's' : ''}
          </div>
          {trip.plan.estimatedDailyDistance && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
              <Route size={11} />
              ~{trip.plan.estimatedDailyDistance}/day
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* ── Stats card ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Trip recap</h2>

            {/* Progress ring (simplified as a bar) */}
            <div className="mb-4">
              <div className="flex justify-between text-sm font-semibold mb-1">
                <span className="text-gray-800">Activities visited</span>
                <span className={visitedPercent >= 75 ? 'text-green-600' : visitedPercent >= 40 ? 'text-yellow-600' : 'text-gray-500'}>
                  {visitedActivities.length}/{allActivities.length} ({visitedPercent}%)
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${visitedPercent}%`,
                    background: visitedPercent >= 75 ? '#22c55e' : visitedPercent >= 40 ? '#eab308' : '#6366f1',
                  }}
                />
              </div>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{visitedActivities.length}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Visited</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{skippedActivities.length}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Skipped</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{uniqueLocations.length}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Locations</p>
              </div>
            </div>
          </div>

          {/* Unique locations strip */}
          {uniqueLocations.length > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-1.5">
              {uniqueLocations.slice(0, 8).map((loc) => (
                <span key={loc} className="flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  <MapPin size={9} />
                  {loc}
                </span>
              ))}
              {uniqueLocations.length > 8 && (
                <span className="text-[11px] text-gray-400 self-center">+{uniqueLocations.length - 8} more</span>
              )}
            </div>
          )}
        </section>

        {/* ── Day-by-day timeline ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Timeline</h2>
          <div className="space-y-4">
            {days.map((day, di) => {
              const dayActivities = day.activities.map((act, ai) => ({
                act,
                key: activityKey(di, ai),
                visited: checked.has(activityKey(di, ai)),
              }));
              const dayVisited  = dayActivities.filter((a) => a.visited).length;
              const dayTotal    = dayActivities.length;

              return (
                <div key={day.day} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Day header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Day {day.day}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{day.theme}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      dayVisited === dayTotal && dayTotal > 0
                        ? 'bg-green-100 text-green-700'
                        : dayVisited > 0
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {dayVisited}/{dayTotal}
                    </span>
                  </div>

                  {/* Activity timeline */}
                  <div className="relative px-4 py-3">
                    {/* Vertical line */}
                    {dayActivities.length > 1 && (
                      <div className="absolute left-[28px] top-6 bottom-6 w-[2px] bg-gray-100" />
                    )}

                    <div className="space-y-3">
                      {dayActivities.map(({ act, key, visited }) => (
                        <div key={key} className="flex items-start gap-3">
                          {/* Status dot */}
                          <div className="flex-shrink-0 relative z-10">
                            {visited ? (
                              <CheckCircle2 size={20} className="text-green-500 bg-white rounded-full" />
                            ) : (
                              <Circle size={20} className="text-gray-300 bg-white rounded-full" />
                            )}
                          </div>

                          {/* Activity info */}
                          <div className="flex-1 min-w-0 pb-0.5">
                            <p className={`text-sm font-semibold leading-tight ${visited ? 'text-gray-800' : 'text-gray-400'}`}>
                              {act.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400">{act.time}</span>
                              {act.duration && (
                                <span className="text-xs text-gray-400">· {act.duration}</span>
                              )}
                              <span className="text-xs text-gray-400 truncate">· {act.location.name}</span>
                            </div>
                            {visited && act.sourcedTips && act.sourcedTips.length > 0 && (
                              <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">
                                "{act.sourcedTips[0].content}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Trip tips ─────────────────────────────────────────────────── */}
        {trip.plan.tips && trip.plan.tips.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
            <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Trip tips saved</h2>
            <ul className="space-y-1.5">
              {trip.plan.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-xs text-amber-900 leading-relaxed">
                  <span className="text-amber-500 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Return to plan ─────────────────────────────────────────────── */}
        <button
          onClick={() => router.push(`/plan/${board?.id ?? ''}`)}
          className="w-full py-3 rounded-2xl border-2 border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors"
        >
          Back to Plan →
        </button>
      </div>
    </div>
  );
}
