'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronLeft, MapPin, Clock, CheckCircle2, Circle } from 'lucide-react';
import { getTripsForBoard, getBoardById } from '@/lib/db';
import { Trip, DayPlan, Activity, Board } from '@/lib/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── inner component ──────────────────────────────────────────────────────────

function TripJournalInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const boardId = searchParams.get('boardId') ?? '';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [checkIns, setCheckIns] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [trips, b] = await Promise.all([
          getTripsForBoard(boardId),
          getBoardById(boardId),
        ]);
        const found = trips.find((t) => t.id === tripId);
        setTrip(found ?? null);
        setBoard(b ?? null);

        // Load check-in timestamps from localStorage
        try {
          const stored = localStorage.getItem(`trip-checkins-${tripId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              // legacy format: convert to record with approximate timestamps
              const rec: Record<string, number> = {};
              parsed.forEach((k: string) => { rec[k] = Date.now(); });
              setCheckIns(rec);
            } else {
              setCheckIns(parsed as Record<string, number>);
            }
          }
        } catch { /* no check-in data */ }
      } finally {
        setLoading(false);
      }
    }
    if (boardId) load();
    else setLoading(false);
  }, [tripId, boardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!trip || !trip.plan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gray-50">
        <p className="text-gray-500 text-sm">Trip not found.</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">Go back</button>
      </div>
    );
  }

  const { plan } = trip;
  const checkedCount = Object.keys(checkIns).length;
  const totalActivities = plan.days.reduce((sum, d) => sum + d.activities.length, 0);
  const allDone = checkedCount >= totalActivities;

  // Build a flat chronological list of all activities with their check-in status
  const allActivities: Array<{
    dayIdx: number;
    actIdx: number;
    day: DayPlan;
    activity: Activity;
    checkedAt: number | null;
  }> = [];
  plan.days.forEach((day, dIdx) => {
    day.activities.forEach((act, aIdx) => {
      const key = `${dIdx}-${aIdx}`;
      allActivities.push({
        dayIdx: dIdx,
        actIdx: aIdx,
        day,
        activity: act,
        checkedAt: checkIns[key] ?? null,
      });
    });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {board?.emoji ?? '🗺'} {board?.name ?? 'Trip'} Journal
            </h1>
            <p className="text-xs text-gray-400">
              {trip.name ? `${trip.name} · ` : ''}{plan.days.length} days · {totalActivities} stops
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto pb-24 space-y-5">

        {/* Progress card */}
        <div className={`rounded-2xl p-4 ${allDone ? 'bg-green-50 border border-green-100' : 'bg-indigo-50 border border-indigo-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-semibold ${allDone ? 'text-green-700' : 'text-indigo-700'}`}>
              {allDone ? '🎉 Trip complete!' : `${checkedCount} of ${totalActivities} stops visited`}
            </p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-600'}`}>
              {Math.round((checkedCount / Math.max(totalActivities, 1)) * 100)}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${(checkedCount / Math.max(totalActivities, 1)) * 100}%` }}
            />
          </div>
          {plan.overview && (
            <p className="text-xs text-gray-600 mt-2 italic">{plan.overview}</p>
          )}
        </div>

        {/* Day-by-day timeline */}
        {plan.days.map((day, dIdx) => {
          const dayActivities = allActivities.filter((a) => a.dayIdx === dIdx);
          const dayChecked = dayActivities.filter((a) => a.checkedAt !== null).length;
          const dayDone = dayChecked === dayActivities.length;

          return (
            <div key={dIdx} className="space-y-2">
              {/* Day header */}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  dayDone ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {dIdx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Day {dIdx + 1} — {day.theme}</p>
                  <p className="text-xs text-gray-400">{dayChecked}/{dayActivities.length} stops visited</p>
                </div>
                {dayDone && <span className="text-xs text-green-600 font-semibold">✓ Complete</span>}
              </div>

              {/* Activity timeline */}
              <div className="ml-3 border-l-2 border-gray-100 pl-4 space-y-3">
                {dayActivities.map(({ actIdx, activity, checkedAt }) => {
                  const isChecked = checkedAt !== null;
                  return (
                    <div
                      key={actIdx}
                      className={`bg-white rounded-xl p-3 border transition-all ${
                        isChecked ? 'border-green-100' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {isChecked
                            ? <CheckCircle2 size={16} className="text-green-500" />
                            : <Circle size={16} className="text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400 font-medium">{activity.time}</span>
                            {isChecked && checkedAt && (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                                <Clock size={10} />
                                Checked in {formatTime(checkedAt)}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm font-medium mt-0.5 flex items-center gap-1 ${isChecked ? 'text-gray-500' : 'text-gray-900'}`}>
                            <MapPin size={11} className={isChecked ? 'text-green-400' : 'text-indigo-400'} />
                            {activity.location.name}
                          </p>
                          <p className={`text-sm ${isChecked ? 'text-gray-400' : 'text-gray-700'}`}>{activity.name}</p>

                          {/* Tips (shown even for checked stops in journal view) */}
                          {activity.tips.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {activity.tips.slice(0, 2).map((tip, tIdx) => (
                                <li key={tIdx} className="text-xs text-gray-400 leading-snug">· {tip}</li>
                              ))}
                            </ul>
                          )}

                          {/* Sourced tips */}
                          {activity.sourcedTips && activity.sourcedTips.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {activity.sourcedTips.map((st, sIdx) => (
                                <div key={sIdx} className="bg-emerald-50 rounded-lg px-2 py-1 border-l-2 border-emerald-200">
                                  <p className="text-xs text-emerald-800">💡 {st.content}</p>
                                  <p className="text-[10px] text-emerald-500 mt-0.5 truncate">from: {st.sourceTitle}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Trip tips summary */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-2">💡 Trip Tips</p>
            <ul className="space-y-1">
              {plan.tips.map((tip, i) => (
                <li key={i} className="text-xs text-amber-800">· {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Back to plan */}
        <button
          onClick={() => router.back()}
          className="w-full py-3 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Back to Plan
        </button>
      </div>
    </div>
  );
}

// ─── export ───────────────────────────────────────────────────────────────────

export default function TripJournalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <TripJournalInner />
    </Suspense>
  );
}
