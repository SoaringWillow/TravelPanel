'use client';

import { useMemo } from 'react';
import { Navigation, X, MapPin, Footprints, Lightbulb, CheckCircle2 } from 'lucide-react';
import { TripPlan, SubstanceItem, SavedItem, VisitedActivity } from '@/lib/types';
import { LivePosition } from '@/hooks/useLiveLocation';
import { haversineKm, formatDistance, walkingMinutes } from '@/lib/geo';

interface NearestActivity {
  dayIndex: number;
  activityIndex: number;
  name: string;
  locationName: string;
  distanceKm: number;
  tips: string[];
  sourcedTips?: { content: string; sourceTitle: string }[];
}

interface TripModePanelProps {
  plan: TripPlan;
  items: SavedItem[];
  position: LivePosition | null;
  error: string | null;
  isTracking: boolean;
  visitedActivities: VisitedActivity[];
  onMarkVisited: (activity: Omit<VisitedActivity, 'visitedAt'>) => void;
  onStop: () => void;
}

function findNearest(plan: TripPlan, pos: LivePosition): NearestActivity | null {
  let best: NearestActivity | null = null;
  let bestDist = Infinity;

  for (let di = 0; di < plan.days.length; di++) {
    const day = plan.days[di];
    for (let ai = 0; ai < day.activities.length; ai++) {
      const act = day.activities[ai];
      if (!act.location) continue;
      const d = haversineKm(pos.lat, pos.lng, act.location.lat, act.location.lng);
      if (d < bestDist) {
        bestDist = d;
        best = {
          dayIndex: di,
          activityIndex: ai,
          name: act.name,
          locationName: act.location.name,
          distanceKm: d,
          tips: act.tips ?? [],
          sourcedTips: act.sourcedTips,
        };
      }
    }
  }
  return best;
}

function nearbySubstance(items: SavedItem[], pos: LivePosition, radiusKm = 1): SubstanceItem[] {
  const results: SubstanceItem[] = [];
  for (const item of items) {
    const isNearby = item.locations.some(
      (loc) => haversineKm(pos.lat, pos.lng, loc.lat, loc.lng) <= radiusKm
    );
    if (isNearby && item.substance?.length) {
      results.push(...item.substance.slice(0, 3));
    }
    if (results.length >= 6) break;
  }
  return results;
}

const SUBSTANCE_ICON: Record<string, string> = {
  tip: '💡', warning: '⚠️', opinion: '💬',
  wisdom: '🧠', context: '🌍', recommendation: '⭐',
};

export default function TripModePanel({
  plan, items, position, error, isTracking, visitedActivities, onMarkVisited, onStop,
}: TripModePanelProps) {
  const nearest = useMemo(
    () => (position ? findNearest(plan, position) : null),
    [plan, position]
  );

  const nearby = useMemo(
    () => (position ? nearbySubstance(items, position) : []),
    [items, position]
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[1100] bg-white rounded-t-2xl"
      style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isTracking && !error && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                error ? 'bg-red-400' : isTracking ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          </span>
          <span className="text-sm font-bold text-gray-900">Trip Mode</span>
          {position && (
            <span className="text-xs text-gray-400">
              ±{Math.round(position.accuracy)}m
            </span>
          )}
        </div>
        <button
          onClick={onStop}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Stop trip mode"
        >
          <X size={17} />
        </button>
      </div>

      <div className="px-4 pb-6 space-y-4 max-h-[55vh] overflow-y-auto">

        {/* GPS error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700">
            <Navigation size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Waiting for fix */}
        {!position && !error && (
          <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
            <Navigation size={15} />
            <span>Getting your location…</span>
          </div>
        )}

        {/* Nearest activity */}
        {nearest && (() => {
          const isVisited = visitedActivities.some(
            (v) => v.dayIndex === nearest.dayIndex && v.activityIndex === nearest.activityIndex
          );
          return (
          <div className="bg-indigo-50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-indigo-900 truncate">{nearest.name}</p>
                  <p className="text-xs text-indigo-600 truncate">{nearest.locationName}</p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-indigo-700">{formatDistance(nearest.distanceKm)}</p>
                <div className="flex items-center gap-1 text-xs text-indigo-500">
                  <Footprints size={11} />
                  <span>{walkingMinutes(nearest.distanceKm)} min</span>
                </div>
              </div>
            </div>

            {/* Sourced tips from clips */}
            {nearest.sourcedTips && nearest.sourcedTips.length > 0 && (
              <div className="pt-1 space-y-1.5">
                {nearest.sourcedTips.slice(0, 2).map((st, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-indigo-700">
                    <span>⭐</span>
                    <div>
                      <span>{st.content}</span>
                      <span className="text-indigo-400 italic ml-1">— {st.sourceTitle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generic tips if no sourced tips */}
            {(!nearest.sourcedTips || nearest.sourcedTips.length === 0) &&
              nearest.tips.slice(0, 2).map((tip, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-indigo-600">
                  <span className="flex-shrink-0">💡</span>
                  <span>{tip}</span>
                </div>
              ))}

            {/* Mark visited button */}
            <button
              onClick={() => !isVisited && onMarkVisited({
                dayIndex: nearest.dayIndex,
                activityIndex: nearest.activityIndex,
                activityName: nearest.name,
                locationName: nearest.locationName,
                sourcedTips: nearest.sourcedTips,
              })}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isVisited
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
              }`}
            >
              <CheckCircle2 size={13} />
              {isVisited ? 'Visited ✓' : 'Mark as visited'}
            </button>
          </div>
          );
        })()}

        {/* Nearby substance tips from saved clips */}
        {nearby.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-gray-600">Nearby tips from your clips</span>
            </div>
            <div className="space-y-2">
              {nearby.map((sub, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="flex-shrink-0">{SUBSTANCE_ICON[sub.type] ?? '💡'}</span>
                  <span className="leading-relaxed">{sub.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
