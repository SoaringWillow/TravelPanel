'use client';

import { CheckCircle2, Circle, MapPin, Clock, Car } from 'lucide-react';
import { TripPlan } from '@/lib/types';
import { estimateDrivingTime } from '@/lib/haversine';

interface TripTimelineProps {
  plan: TripPlan;
  visitedIds: Set<string>;
  onToggle: (actId: string) => void;
}

export default function TripTimeline({ plan, visitedIds, onToggle }: TripTimelineProps) {
  const totalActivities = plan.days.reduce((sum, d) => sum + d.activities.length, 0);
  const visitedCount = visitedIds.size;
  const pct = totalActivities > 0 ? Math.round((visitedCount / totalActivities) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Trip progress</span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {visitedCount}/{totalActivities}
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
          {pct === 100
            ? '🎉 All activities visited!'
            : pct === 0
            ? 'Tap activities to mark them as visited'
            : `${pct}% visited — keep going!`}
        </p>
      </div>

      {/* Activities by day */}
      {plan.days.map((day, dayIdx) => {
        const drivingTime = estimateDrivingTime(
          (day.locations ?? []).filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng)),
        );
        return (
        <div key={dayIdx}>
          <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Day {day.day}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">— {day.theme}</span>
            {drivingTime && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5 ml-auto">
                <Car size={10} />
                {drivingTime}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {day.activities.map((activity, actIdx) => {
              const actId = `d${dayIdx}-a${actIdx}`;
              const visited = visitedIds.has(actId);

              return (
                <button
                  key={actId}
                  onClick={() => onToggle(actId)}
                  className={`w-full text-left rounded-2xl border shadow-sm overflow-hidden active:scale-[0.99] transition-all ${
                    visited
                      ? 'border-indigo-100 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/20'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Check indicator */}
                    <div className="flex-shrink-0 mt-0.5">
                      {visited ? (
                        <CheckCircle2 size={20} className="text-indigo-500" />
                      ) : (
                        <Circle size={20} className="text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Time + duration */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            visited
                              ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {activity.time}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                          <Clock size={10} />
                          {activity.duration}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 mb-0.5">
                        <MapPin size={11} className={visited ? 'text-indigo-400' : 'text-gray-400'} />
                        <span
                          className={`text-xs font-medium truncate ${
                            visited ? 'text-indigo-600' : 'text-indigo-500'
                          }`}
                        >
                          {activity.location.name}
                        </span>
                      </div>

                      {/* Activity name */}
                      <p
                        className={`text-sm font-medium leading-snug ${
                          visited ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {activity.name}
                      </p>

                      {/* Sourced tips */}
                      {activity.sourcedTips && activity.sourcedTips.length > 0 && !visited && (
                        <p className="text-xs text-indigo-500 mt-1 leading-relaxed">
                          💡 {activity.sourcedTips[0].content}
                          <span className="text-gray-400">
                            {' '}— from &ldquo;{activity.sourcedTips[0].sourceTitle}&rdquo;
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
