'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Clock } from 'lucide-react';
import { DayPlan } from '@/lib/types';

// ─── Activity icon derived from activity name / time ─────────────────────────

function activityIcon(name: string, time: string): string {
  const n = name.toLowerCase();
  const t = time.toLowerCase();
  if (n.includes('breakfast') || n.includes('café') || n.includes('coffee') || t.includes('morning') && n.includes('eat')) return '☕';
  if (n.includes('lunch') || n.includes('dinner') || n.includes('restaurant') || n.includes('food') || n.includes('eat')) return '🍜';
  if (n.includes('museum') || n.includes('gallery') || n.includes('temple') || n.includes('shrine') || n.includes('palace')) return '🏛';
  if (n.includes('hike') || n.includes('park') || n.includes('garden') || n.includes('nature') || n.includes('forest')) return '🌿';
  if (n.includes('beach') || n.includes('sea') || n.includes('ocean') || n.includes('island')) return '🏖';
  if (n.includes('shop') || n.includes('market') || n.includes('mall') || n.includes('store')) return '🛍';
  if (n.includes('bar') || n.includes('night') || n.includes('club') || n.includes('drink')) return '🌃';
  if (n.includes('photo') || n.includes('viewpoint') || n.includes('sunset') || n.includes('sunrise')) return '📸';
  if (n.includes('hotel') || n.includes('check') || n.includes('accommodation')) return '🏨';
  if (n.includes('transport') || n.includes('bus') || n.includes('train') || n.includes('flight') || n.includes('airport')) return '🚆';
  if (t.includes('morning')) return '🌅';
  if (t.includes('afternoon')) return '☀️';
  if (t.includes('evening') || t.includes('night')) return '🌙';
  return '📍';
}

function timeOfDayLabel(time: string): { label: string; cls: string } {
  const t = time.toLowerCase();
  if (t.match(/^(0?[6-9]|10|11):/)) return { label: 'Morning', cls: 'bg-amber-50 text-amber-700' };
  if (t.match(/^(1[2-4]):/)) return { label: 'Afternoon', cls: 'bg-sky-50 text-sky-700' };
  if (t.match(/^(1[5-9]|2[0-3]):/)) return { label: 'Evening', cls: 'bg-violet-50 text-violet-700' };
  // Fallback: check words
  if (t.includes('morning')) return { label: 'Morning', cls: 'bg-amber-50 text-amber-700' };
  if (t.includes('afternoon')) return { label: 'Afternoon', cls: 'bg-sky-50 text-sky-700' };
  if (t.includes('evening') || t.includes('night')) return { label: 'Evening', cls: 'bg-violet-50 text-violet-700' };
  return { label: time, cls: 'bg-gray-100 text-gray-600' };
}

interface DayAccordionCardProps {
  day: DayPlan;
  defaultOpen?: boolean;
}

export default function DayAccordionCard({ day, defaultOpen = false }: DayAccordionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ── Sticky header ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sticky top-0 z-10 w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100"
      >
        {/* Day badge */}
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-semibold leading-none uppercase tracking-wide">Day</span>
          <span className="text-white text-sm font-bold leading-none">{day.day}</span>
        </div>

        {/* Theme + count */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{day.theme}</p>
          <p className="text-xs text-gray-400">{day.activities.length} activit{day.activities.length !== 1 ? 'ies' : 'y'}</p>
        </div>

        {/* Chevron */}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-gray-400" />
        </motion.div>
      </button>

      {/* ── Expandable body ────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 py-3 space-y-3">
              {day.activities.map((activity, idx) => {
                const icon = activityIcon(activity.name, activity.time);
                const tod = timeOfDayLabel(activity.time);
                return (
                  <div key={idx} className="flex gap-3">
                    {/* Icon column */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base">
                        {icon}
                      </div>
                      {idx < day.activities.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 min-h-[12px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-2">
                      {/* Activity header row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tod.cls}`}>
                          {tod.label}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <Clock size={9} />
                          {activity.duration}
                        </span>
                      </div>

                      {/* Location name */}
                      <div className="flex items-center gap-1 mb-0.5">
                        <MapPin size={11} className="text-indigo-500 flex-shrink-0" />
                        <p className="text-xs font-semibold text-indigo-600 truncate">{activity.location.name}</p>
                      </div>

                      {/* Activity description */}
                      <p className="text-sm text-gray-800 leading-snug">{activity.name}</p>

                      {/* Sourced tips — the moat */}
                      {activity.sourcedTips && activity.sourcedTips.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {activity.sourcedTips.map((st, sIdx) => (
                            <div key={sIdx} className="bg-emerald-50 rounded-xl px-2.5 py-1.5 border-l-2 border-emerald-400">
                              <p className="text-xs text-emerald-900 leading-snug">💡 {st.content}</p>
                              <span className="inline-block mt-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-full">
                                📎 {st.sourceTitle}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* General tips */}
                      {activity.tips.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {activity.tips.slice(0, 2).map((tip, tIdx) => (
                            <li key={tIdx} className="text-xs text-gray-500 leading-snug">· {tip}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
