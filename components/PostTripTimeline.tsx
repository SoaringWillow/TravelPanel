'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import { TripPlan, VisitRecord } from '@/lib/types';

interface PostTripTimelineProps {
  plan: TripPlan;
  visitLog: VisitRecord[];
  onClose: () => void;
  onAddNote: (dayIndex: number, activityIndex: number, note: string) => void;
}

export function PostTripTimeline({ plan, visitLog, onClose, onAddNote }: PostTripTimelineProps) {
  const [noteTarget, setNoteTarget] = useState<{ day: number; act: number } | null>(null);
  const [noteText, setNoteText]     = useState('');

  // Sort visits chronologically; include plan context for display.
  const visitItems = [...visitLog]
    .sort((a, b) => a.visitedAt - b.visitedAt)
    .map((v) => {
      const activity = plan.days?.[v.dayIndex]?.activities?.[v.activityIndex];
      return { record: v, activity };
    })
    .filter((v) => !!v.activity);

  function submitNote(dayIndex: number, activityIndex: number) {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    onAddNote(dayIndex, activityIndex, trimmed);
    setNoteText('');
    setNoteTarget(null);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[2000] flex flex-col bg-gray-50"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 safe-top flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900">Post-Trip Timeline</h2>
          <p className="text-xs text-gray-400">
            {visitItems.length} of {plan.days?.flatMap((d) => d.activities).length ?? 0} spots visited
          </p>
        </div>
        {visitItems.length > 0 && (
          <div className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {Math.round((visitItems.length / (plan.days?.flatMap((d) => d.activities).length ?? 1)) * 100)}% done
          </div>
        )}
      </div>

      {/* Empty state */}
      {visitItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <CheckCircle2 size={48} className="text-gray-200" strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-gray-700">No visits logged yet</p>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Tap the checkmark on any activity in your plan to mark it as visited while you're on the trip.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {visitItems.map(({ record, activity }, idx) => {
            if (!activity) return null;
            const date = new Date(record.visitedAt);
            const isNoting = noteTarget?.day === record.dayIndex && noteTarget?.act === record.activityIndex;

            return (
              <div key={idx} className="relative pl-8">
                {/* Timeline spine */}
                {idx < visitItems.length - 1 && (
                  <div className="absolute left-3.5 top-6 bottom-0 w-px bg-gray-200" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-2 top-3 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow" />

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Visit meta */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MapPin size={11} className="text-indigo-400 flex-shrink-0" />
                          <p className="text-xs font-semibold text-indigo-600 truncate">
                            {activity.location.name}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-[10px] text-gray-400 font-medium">
                          Day {record.dayIndex + 1}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 justify-end">
                          <Clock size={10} className="text-gray-300" />
                          <span className="text-[10px] text-gray-400">
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                    {record.note && (
                      <div className="mt-2 bg-amber-50 rounded-lg px-2.5 py-2 border border-amber-100">
                        <p className="text-xs text-amber-800 leading-snug italic">"{record.note}"</p>
                      </div>
                    )}
                  </div>

                  {/* Add/edit note */}
                  <div className="border-t border-gray-50 px-4 py-2">
                    <AnimatePresence mode="wait">
                      {isNoting ? (
                        <motion.div
                          key="input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="py-1 flex gap-2">
                            <input
                              autoFocus
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && submitNote(record.dayIndex, record.activityIndex)}
                              placeholder="Add a memory…"
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                              onClick={() => submitNote(record.dayIndex, record.activityIndex)}
                              className="text-xs font-semibold text-indigo-600 px-2 hover:text-indigo-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setNoteTarget(null); setNoteText(''); }}
                              className="text-xs text-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="btn"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => {
                            setNoteText(record.note ?? '');
                            setNoteTarget({ day: record.dayIndex, act: record.activityIndex });
                          }}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors py-1"
                        >
                          <MessageSquarePlus size={12} />
                          {record.note ? 'Edit note' : 'Add memory'}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
