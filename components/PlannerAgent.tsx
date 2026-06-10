'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentStep, AgentStepType } from '@/lib/types';

interface PlannerAgentProps {
  steps: AgentStep[];
  isRunning: boolean;
}

const STEP_CONFIG: Record<AgentStepType, { icon: string; label: string; color: string; bg: string }> = {
  searching:  { icon: '🔍', label: 'Reading clips',        color: 'text-indigo-700', bg: 'bg-indigo-50' },
  found:      { icon: '📍', label: 'Found locations',      color: 'text-emerald-700', bg: 'bg-emerald-50' },
  clustering: { icon: '🗺',  label: 'Grouping by area',    color: 'text-violet-700', bg: 'bg-violet-50' },
  routing:    { icon: '📐', label: 'Building route',       color: 'text-blue-700', bg: 'bg-blue-50' },
  validating: { icon: '✅', label: 'Checking your tips',   color: 'text-teal-700', bg: 'bg-teal-50' },
  done:       { icon: '🎉', label: 'Your plan is ready!',  color: 'text-green-700', bg: 'bg-green-50' },
  error:      { icon: '⚠️', label: 'Something went wrong', color: 'text-red-700', bg: 'bg-red-50' },
};

const STEP_ORDER: AgentStepType[] = ['searching', 'found', 'clustering', 'routing', 'validating', 'done'];

function progressPercent(steps: AgentStep[]): number {
  if (steps.length === 0) return 5;
  const lastStep = steps[steps.length - 1];
  if (lastStep.type === 'done') return 100;
  if (lastStep.type === 'error') return 100;
  const idx = STEP_ORDER.indexOf(lastStep.type);
  return idx < 0 ? 20 : Math.round(((idx + 1) / STEP_ORDER.length) * 95);
}

export default function PlannerAgent({ steps, isRunning }: PlannerAgentProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [steps]);

  const progress = progressPercent(steps);
  const lastStep = steps[steps.length - 1];
  const isDone = lastStep?.type === 'done';

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isRunning && !isDone ? (
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            ) : isDone ? (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            ) : null}
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {isDone ? 'Plan ready' : isRunning ? 'Building your plan…' : 'Planning…'}
            </span>
          </div>
          <span className="text-xs text-gray-400 font-medium">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: '5%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step cards */}
      <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 260 }}>
        {steps.length === 0 ? (
          <div className="flex items-center gap-2 py-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
            </div>
            <span className="text-xs text-gray-400">Starting up…</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {steps.map((step, i) => {
              const cfg = STEP_CONFIG[step.type];
              const isLast = i === steps.length - 1;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${cfg.bg} dark:bg-opacity-10`}
                >
                  <span className="text-base leading-none flex-shrink-0 mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${cfg.color} dark:opacity-90`}>{cfg.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                      {step.message}
                    </p>
                  </div>
                  {isRunning && isLast && step.type !== 'done' && step.type !== 'error' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
