'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MapPin, Clock, Lightbulb, AlertTriangle, Star, MessageSquare, Globe, Brain } from 'lucide-react';
import { getTripsForBoard, getBoardById } from '@/lib/db';
import { Trip, Board, Activity, SubstanceType } from '@/lib/types';

// ─── Substance icon map ───────────────────────────────────────────────────────

const SUBSTANCE_ICON: Record<SubstanceType, React.ReactNode> = {
  tip:            <Lightbulb size={12} className="text-amber-500" />,
  warning:        <AlertTriangle size={12} className="text-red-500" />,
  recommendation: <Star size={12} className="text-indigo-500" />,
  opinion:        <MessageSquare size={12} className="text-purple-500" />,
  wisdom:         <Brain size={12} className="text-teal-500" />,
  context:        <Globe size={12} className="text-blue-500" />,
};

// ─── Activity card on the timeline ───────────────────────────────────────────

function TimelineActivity({ activity, index }: { activity: Activity; index: number }) {
  const isLast = false; // handled by parent

  return (
    <div className="flex gap-3">
      {/* Dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 w-6">
        <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm mt-1 flex-shrink-0" />
        <div className="flex-1 w-px bg-indigo-100 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-5 flex-1 min-w-0">
        {/* Time + duration */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {activity.time}
          </span>
          <span className="text-xs text-gray-400">{activity.duration}</span>
        </div>

        {/* Location + name */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-600 truncate">{activity.location.name}</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{activity.name}</p>
            </div>
          </div>

          {/* Generic tips */}
          {activity.tips.length > 0 && (
            <ul className="space-y-0.5 pl-1">
              {activity.tips.slice(0, 3).map((tip, i) => (
                <li key={i} className="text-xs text-gray-500 leading-snug">· {tip}</li>
              ))}
            </ul>
          )}

          {/* Sourced tips — wisdom from your clips */}
          {activity.sourcedTips && activity.sourcedTips.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {activity.sourcedTips.map((st, i) => (
                <div key={i} className="bg-emerald-50 rounded-xl px-2.5 py-2 border-l-2 border-emerald-300">
                  <p className="text-xs text-emerald-900 leading-snug">💡 {st.content}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5 truncate">
                    from your clip: {st.sourceTitle}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day section ─────────────────────────────────────────────────────────────

function DaySection({ day, dayNumber }: { day: { theme: string; activities: Activity[] }; dayNumber: number }) {
  return (
    <div className="mb-6">
      {/* Day header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
          {dayNumber}
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Day {dayNumber}</p>
          <p className="text-sm font-bold text-gray-900">{day.theme}</p>
        </div>
      </div>

      {/* Activities */}
      <div className="pl-4">
        {day.activities.map((activity, i) => (
          <TimelineActivity key={i} activity={activity} index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripTimelinePage() {
  const params  = useParams();
  const router  = useRouter();
  const boardId = params.boardId as string;

  const [trip, setTrip]   = useState<Trip | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, trips] = await Promise.all([
          getBoardById(boardId),
          getTripsForBoard(boardId),
        ]);
        setBoard(b ?? null);
        // Prefer the most recently completed trip; fall back to most recent
        const completed = trips.filter((t) => t.completedAt).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
        const fallback  = trips.sort((a, b) => b.createdAt - a.createdAt);
        setTrip(completed[0] ?? fallback[0] ?? null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!trip || !trip.plan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4 px-6 text-center">
        <p className="text-4xl">🗺</p>
        <p className="text-lg font-bold text-gray-800">No timeline yet</p>
        <p className="text-sm text-gray-500">
          Generate a trip plan and mark it as traveled to create your timeline.
        </p>
        <Link href={`/plan/${boardId}`} className="text-indigo-600 text-sm font-semibold">
          Open planner →
        </Link>
      </div>
    );
  }

  const { plan } = trip;
  const boardName = board ? `${board.emoji} ${board.name}` : trip.boardName;
  const traveledDate = trip.completedAt
    ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(trip.completedAt))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 flex items-center gap-1 text-sm font-medium"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-gray-900 truncate">{boardName}</p>
            {traveledDate && (
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <Clock size={10} />
                {traveledDate}
              </p>
            )}
          </div>
          <div className="w-14" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Overview */}
        {plan.overview && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{plan.overview}&rdquo;</p>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-indigo-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-indigo-700">{plan.days?.length ?? 0}</p>
            <p className="text-xs text-indigo-500 font-medium">Days</p>
          </div>
          <div className="flex-1 bg-indigo-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-indigo-700">{plan.totalLocations ?? 0}</p>
            <p className="text-xs text-indigo-500 font-medium">Places</p>
          </div>
          <div className="flex-1 bg-indigo-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-indigo-700">
              {plan.days?.reduce((acc, d) => acc + d.activities.length, 0) ?? 0}
            </p>
            <p className="text-xs text-indigo-500 font-medium">Activities</p>
          </div>
        </div>

        {/* Timeline */}
        {plan.days?.map((day) => (
          <DaySection key={day.day} day={day} dayNumber={day.day} />
        ))}

        {/* Trip tips */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Trip Notes</span>
            </div>
            <ul className="space-y-1">
              {plan.tips.map((tip, i) => (
                <li key={i} className="text-xs text-amber-800 leading-snug">· {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Back to plan */}
        <div className="mt-6 pb-6">
          <Link
            href={`/plan/${boardId}`}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Open planner
          </Link>
        </div>
      </div>
    </div>
  );
}
