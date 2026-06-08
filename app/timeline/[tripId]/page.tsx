'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, Calendar, Route, Lightbulb, Share2 } from 'lucide-react';
import { Trip, DayPlan, Activity } from '@/lib/types';
import { getTripsForBoard, getAllBoards } from '@/lib/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: number, dayOffset: number): string {
  const d = new Date(ts + dayOffset * 86400000);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

const DAY_COLORS = [
  { bg: '#6366f1', light: '#eef2ff', text: '#4338ca' },
  { bg: '#10b981', light: '#ecfdf5', text: '#065f46' },
  { bg: '#f59e0b', light: '#fffbeb', text: '#92400e' },
  { bg: '#f43f5e', light: '#fff1f2', text: '#9f1239' },
  { bg: '#8b5cf6', light: '#f5f3ff', text: '#4c1d95' },
  { bg: '#06b6d4', light: '#ecfeff', text: '#164e63' },
];

// ── Timeline activity row ──────────────────────────────────────────────────────

function ActivityRow({
  activity,
  isLast,
  color,
}: {
  activity: Activity;
  isLast: boolean;
  color: (typeof DAY_COLORS)[0];
}) {
  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-6">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: color.bg }}
        />
        {!isLast && (
          <div
            className="flex-1 w-0.5 mt-1"
            style={{ backgroundColor: `${color.bg}40`, minHeight: 24 }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {activity.time && (
                <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                  {activity.time}
                </span>
              )}
              {activity.duration && (
                <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5 flex-shrink-0">
                  {activity.duration}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mt-0.5">{activity.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{activity.location?.name}</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        {activity.tips.length > 0 && (
          <div className="mt-2 space-y-1">
            {activity.tips.slice(0, 2).map((tip, i) => (
              <p key={i} className="text-xs text-gray-500 leading-snug">· {tip}</p>
            ))}
          </div>
        )}

        {/* Sourced tips */}
        {activity.sourcedTips && activity.sourcedTips.length > 0 && (
          <div className="mt-2 space-y-1">
            {activity.sourcedTips.map((st, i) => (
              <div
                key={i}
                className="rounded-lg px-2 py-1.5 border-l-2"
                style={{ backgroundColor: color.light, borderColor: color.bg }}
              >
                <p className="text-xs leading-snug" style={{ color: color.text }}>
                  💡 {st.content}
                </p>
                <p className="text-[10px] mt-0.5 opacity-70" style={{ color: color.text }}>
                  from your clip: {st.sourceTitle}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day section ───────────────────────────────────────────────────────────────

function DaySection({
  day,
  index,
  tripCreatedAt,
}: {
  day: DayPlan;
  index: number;
  tripCreatedAt: number;
}) {
  const color = DAY_COLORS[index % DAY_COLORS.length];

  return (
    <section>
      {/* Day header */}
      <div
        className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
        style={{ backgroundColor: color.light }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: color.bg }}
            >
              Day {day.day}
            </span>
            <span className="text-xs text-gray-500">{formatDate(tripCreatedAt, index)}</span>
          </div>
          <p className="text-sm font-semibold mt-1" style={{ color: color.text }}>
            {day.theme}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400">
            {day.activities.length} stop{day.activities.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Activities */}
      <div className="pl-2">
        {day.activities.map((activity, aIdx) => (
          <ActivityRow
            key={aIdx}
            activity={activity}
            isLast={aIdx === day.activities.length - 1}
            color={color}
          />
        ))}
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params  = useParams();
  const router  = useRouter();
  const tripId  = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const boards = await getAllBoards();
        for (const board of boards) {
          const { getTripsForBoard } = await import('@/lib/db');
          const trips = await getTripsForBoard(board.id);
          const found = trips.find((t) => t.id === tripId);
          if (found) { setTrip(found); break; }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId]);

  const handleShare = async () => {
    if (!trip?.plan) return;
    const text = trip.plan.days
      .map((d) => `Day ${d.day}: ${d.activities.map((a) => a.name).join(' → ')}`)
      .join('\n');
    const shareData = {
      title: `${trip.boardName} Trip`,
      text: `My ${trip.days}-day ${trip.boardName} trip:\n\n${text}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
      alert('Trip summary copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!trip?.plan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4 px-8 text-center">
        <span className="text-4xl">🗺️</span>
        <p className="text-gray-600 text-sm">Trip not found.</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">
          Go back
        </button>
      </div>
    );
  }

  const { plan } = trip;
  const totalActivities = plan.days.reduce((sum, d) => sum + d.activities.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {trip.boardName}
              {trip.name && <span className="text-gray-400 font-normal"> · {trip.name}</span>}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(trip.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            aria-label="Share trip"
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {[
            { icon: Calendar, label: 'Days',      value: plan.days.length },
            { icon: MapPin,   label: 'Stops',     value: totalActivities },
            { icon: Route,    label: 'Est. /day', value: plan.estimatedDailyDistance ?? '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-3 py-4 text-center border-r border-gray-100 last:border-0">
              <Icon size={16} className="mx-auto mb-1 text-indigo-400" />
              <div className="text-base font-bold text-gray-900">{value}</div>
              <div className="text-[10px] text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Overview */}
        {plan.overview && (
          <p className="text-sm text-gray-600 italic leading-relaxed bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
            {plan.overview}
          </p>
        )}

        {/* Days */}
        {plan.days.map((day, idx) => (
          <DaySection
            key={day.day}
            day={day}
            index={idx}
            tripCreatedAt={trip.createdAt}
          />
        ))}

        {/* Trip tips */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={15} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Trip Tips</span>
            </div>
            <ul className="space-y-2">
              {plan.tips.map((tip, i) => (
                <li key={i} className="text-xs text-amber-800 leading-snug">· {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
