'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, Lightbulb } from 'lucide-react';
import { Trip, VisitedActivity } from '@/lib/types';
import { getTripsForBoard, getAllBoards } from '@/lib/db';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

const SOURCED_TIP_COLORS = ['bg-emerald-50 border-emerald-300', 'bg-blue-50 border-blue-300', 'bg-purple-50 border-purple-300'];

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const boards = await getAllBoards();
        for (const board of boards) {
          const trips = await getTripsForBoard(board.id);
          const found = trips.find((t) => t.id === tripId);
          if (found) {
            setTrip(found);
            break;
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4 p-6">
        <p className="text-gray-500 text-sm text-center">Trip not found.</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">Go back</button>
      </div>
    );
  }

  const visited = (trip.visitedActivities ?? []).sort((a, b) => a.visitedAt - b.visitedAt);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-safe-top">
        <div className="max-w-lg mx-auto py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {trip.name ?? 'Trip'} — Timeline
            </h1>
            <p className="text-xs text-gray-400">{trip.boardName}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
            {visited.length} visited
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {visited.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🗺</div>
            <p className="text-sm font-medium text-gray-700">No visited activities yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Start Trip Mode during your trip and mark activities as visited — they appear here as your journey unfolds.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div
              className="absolute left-5 top-3 bottom-3 w-0.5 bg-gray-200"
              aria-hidden
            />

            <div className="space-y-4">
              {visited.map((activity, i) => (
                <TimelineEntry
                  key={`${activity.dayIndex}-${activity.activityIndex}-${i}`}
                  activity={activity}
                  isFirst={i === 0}
                  isLast={i === visited.length - 1}
                  colorIndex={i % SOURCED_TIP_COLORS.length}
                />
              ))}
            </div>

            {/* End marker */}
            <div className="flex items-center gap-3 mt-4 ml-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">🏁</span>
              </div>
              <span className="text-xs text-gray-400 font-medium">End of trip</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineEntry({
  activity,
  isFirst,
  colorIndex,
}: {
  activity: VisitedActivity;
  isFirst: boolean;
  isLast: boolean;
  colorIndex: number;
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline node */}
      <div className="relative flex-shrink-0 mt-1">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isFirst ? 'bg-indigo-600' : 'bg-white border-2 border-indigo-300'
          }`}
        >
          {isFirst ? (
            <span className="text-white text-xs font-bold">1</span>
          ) : (
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
          )}
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm space-y-2 mb-1">
        {/* Time + location */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{activity.activityName}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin size={11} />
              <span className="truncate">{activity.locationName}</span>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              <span>{formatTime(activity.visitedAt)}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(activity.visitedAt)}</p>
          </div>
        </div>

        {/* Sourced tips cited at this activity */}
        {activity.sourcedTips && activity.sourcedTips.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={12} className="text-amber-500" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Tips from your clips
              </span>
            </div>
            {activity.sourcedTips.slice(0, 3).map((st, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg px-2 py-1.5 border-l-2 ${SOURCED_TIP_COLORS[colorIndex]}`}
              >
                <div>
                  <p className="text-xs text-gray-800 leading-snug">{st.content}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 italic">from: {st.sourceTitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
