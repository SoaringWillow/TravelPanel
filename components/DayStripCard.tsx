'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, ChevronDown } from 'lucide-react';
import { DayPlan } from '@/lib/types';

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  onViewOnMap?: () => void;
}

export default function DayStripCard({ day, index, onViewOnMap }: DayStripCardProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Day theme header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            Day {index + 1}
          </span>
          <h2 className="text-sm font-bold text-gray-800 truncate">{day.theme}</h2>
        </div>
        {onViewOnMap && (
          <button
            type="button"
            onClick={onViewOnMap}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-xl hover:bg-indigo-100 active:scale-95 transition-all"
          >
            <MapPin size={11} />
            Map
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative pl-7">
        {/* Vertical connecting line */}
        {day.activities.length > 1 && (
          <div className="absolute left-2.5 top-3 bottom-3 w-px bg-indigo-200" />
        )}

        <div className="space-y-3">
          {day.activities.map((activity, aIdx) => {
            const isExpanded = expandedIdx === aIdx;
            const hasTips =
              (activity.tips?.length ?? 0) > 0 ||
              (activity.sourcedTips?.length ?? 0) > 0;

            return (
              <div key={aIdx} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-4.5 top-3.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm ring-2 ring-indigo-100" style={{ left: '-1.2rem' }} />

                {/* Activity card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => hasTips && setExpandedIdx(isExpanded ? null : aIdx)}
                    className={`w-full text-left px-3 py-2.5 ${hasTips ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Time pill */}
                      <span className="flex-shrink-0 bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 tabular-nums">
                        {activity.time}
                      </span>

                      {/* Name + location */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold text-gray-900 leading-snug truncate"
                          title={activity.name}
                        >
                          {activity.name}
                        </p>
                        <p className="text-xs text-indigo-600 truncate mt-0.5" title={activity.location.name}>
                          {activity.location.name}
                        </p>
                      </div>

                      {/* Duration + chevron */}
                      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                        <span className="bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          {activity.duration}
                        </span>
                        {hasTips && (
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-center"
                          >
                            <ChevronDown size={14} className="text-gray-400" />
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Accordion: expanded tips */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="tips"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 border-t border-gray-50 space-y-2">
                          {/* General tips */}
                          {activity.tips && activity.tips.length > 0 && (
                            <ul className="space-y-1">
                              {activity.tips.map((tip, tIdx) => (
                                <li
                                  key={tIdx}
                                  className="flex gap-1.5 text-xs text-gray-600 leading-snug"
                                >
                                  <span className="text-gray-400 flex-shrink-0 mt-px">·</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Sourced tips — cited from user's clips */}
                          {activity.sourcedTips && activity.sourcedTips.length > 0 && (
                            <div className="space-y-1.5">
                              {activity.sourcedTips.map((st, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="bg-indigo-50 rounded-xl px-2.5 py-2 border-l-[3px] border-indigo-400"
                                >
                                  <p className="text-xs text-indigo-900 leading-snug">
                                    💡 {st.content}
                                  </p>
                                  <p className="text-[10px] text-indigo-500 mt-0.5 truncate">
                                    from your clip: {st.sourceTitle}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
