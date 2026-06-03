'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentStep, AgentStepType } from '@/lib/types';

interface PlannerAgentProps {
  steps: AgentStep[];
  isRunning: boolean;
}

const ICON_MAP: Record<AgentStepType, string> = {
  searching:  '🔍',
  found:      '📍',
  clustering: '🗺',
  routing:    '📐',
  validating: '✅',
  done:       '🎉',
  error:      '❌',
};

function stepColor(type: AgentStepType, isLast: boolean, isRunning: boolean): string {
  if (type === 'done') return 'text-green-400';
  if (type === 'error') return 'text-red-400';
  if (isLast && isRunning) return 'text-white';
  return 'text-slate-400';
}

export default function PlannerAgent({ steps, isRunning }: PlannerAgentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  return (
    <div
      ref={scrollRef}
      className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-xs overflow-y-auto"
      style={{ minHeight: 160, maxHeight: 280 }}
    >
      {steps.length === 0 ? (
        <div className="flex items-center gap-3 h-20 justify-center">
          {/* Three-dot bouncing loader */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block w-2 h-2 rounded-full bg-indigo-400"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
              />
            ))}
          </div>
          <span className="text-slate-500">Calling the AI planner…</span>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <motion.div
                key={i}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.18 }}
                className={`flex items-start gap-2 mb-1.5 leading-relaxed ${stepColor(step.type, isLast, isRunning)}`}
              >
                <span className="flex-shrink-0 mt-px">{ICON_MAP[step.type]}</span>
                <span className="break-words flex-1">{step.message}</span>
                {/* Bouncing dot for the active last step */}
                {isRunning && isLast && (
                  <motion.span
                    className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
