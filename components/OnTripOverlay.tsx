'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, MapPin, AlertCircle, X, ChevronDown, ChevronUp, Lightbulb, Star } from 'lucide-react';
import { TripPlan, DayPlan } from '@/lib/types';
import { useGpsTracking, formatDistance, formatWalkTime } from '@/lib/gpsTracking';

interface OnTripOverlayProps {
  plan: TripPlan;
  activeDayIndex: number;
  onClose: () => void;
  onFlyToLocation: (lat: number, lng: number) => void;
}

export default function OnTripOverlay({ plan, activeDayIndex, onClose, onFlyToLocation }: OnTripOverlayProps) {
  const [expanded, setExpanded] = useState(true);

  const { position, error, nextActivity, arrivedAt } = useGpsTracking({
    enabled: true,
    days: plan.days,
    activeDayIndex,
  });

  const activeDay: DayPlan | undefined = plan.days[activeDayIndex];

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-[1100] safe-bottom"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
    >
      {/* Arrived banner */}
      <AnimatePresence>
        {arrivedAt && (
          <motion.div
            key="arrived"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-4 mb-2 bg-green-600 text-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-lg"
          >
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-bold">You&apos;ve arrived!</p>
              <p className="text-xs font-medium opacity-90">{arrivedAt.activity.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <div className="bg-white rounded-t-3xl shadow-2xl">
        {/* Drag handle + header */}
        <button
          className="w-full flex flex-col items-center pt-3 pb-2 px-5"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mb-3" />
          <div className="w-full flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full animate-pulse ${position ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {position ? 'Live GPS' : error ? 'GPS error' : 'Acquiring GPS…'}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
                aria-label="Exit trip mode"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-6 space-y-4">
                {/* GPS error */}
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5">
                    <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                {/* Next activity */}
                {nextActivity && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Next stop</p>
                    <button
                      onClick={() => onFlyToLocation(
                        nextActivity.activity.location.lat,
                        nextActivity.activity.location.lng
                      )}
                      className="w-full bg-indigo-600 text-white rounded-2xl px-4 py-3 text-left flex items-start gap-3 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                    >
                      <Navigation size={18} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{nextActivity.activity.name}</p>
                        <p className="text-xs font-medium opacity-80">
                          {nextActivity.activity.location.name}
                        </p>
                        {position && (
                          <p className="text-xs opacity-70 mt-0.5">
                            {formatDistance(nextActivity.distanceMeters)} · {formatWalkTime(nextActivity.distanceMeters)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs bg-white/20 rounded-lg px-2 py-1 flex-shrink-0">
                        {nextActivity.activity.time}
                      </span>
                    </button>

                    {/* Tips for this activity */}
                    {nextActivity.activity.sourcedTips && nextActivity.activity.sourcedTips.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {nextActivity.activity.sourcedTips.slice(0, 2).map((tip, i) => (
                          <div key={i} className="bg-amber-50 rounded-xl px-3 py-2 flex items-start gap-2">
                            <Star size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-amber-800">{tip.content}</p>
                              <p className="text-[10px] text-amber-500 mt-0.5">from: {tip.sourceTitle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {nextActivity.activity.tips && nextActivity.activity.tips.length > 0 && !nextActivity.activity.sourcedTips?.length && (
                      <div className="mt-2 bg-indigo-50 rounded-xl px-3 py-2 flex items-start gap-2">
                        <Lightbulb size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-indigo-700">{nextActivity.activity.tips[0]}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Today's stops list */}
                {activeDay && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Day {activeDayIndex + 1} · {activeDay.theme}
                    </p>
                    <div className="space-y-1.5">
                      {activeDay.activities.map((act, i) => {
                        const isNext = nextActivity?.activityIndex === i;
                        return (
                          <button
                            key={i}
                            onClick={() => onFlyToLocation(act.location.lat, act.location.lng)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                              isNext
                                ? 'bg-indigo-50 border border-indigo-200'
                                : 'bg-gray-50 border border-transparent hover:border-gray-200'
                            }`}
                          >
                            <MapPin
                              size={13}
                              className={isNext ? 'text-indigo-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${isNext ? 'text-indigo-700' : 'text-gray-700'}`}>
                                {act.name}
                              </p>
                              <p className="text-[10px] text-gray-400">{act.time} · {act.location.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
