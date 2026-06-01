'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentStep, AgentStepType } from '@/lib/types';
import { Check } from 'lucide-react';

interface PlannerAgentProps {
  steps: AgentStep[];
  isRunning: boolean;
}

const ICON_MAP: Record<AgentStepType, string> = {
  searching: '🔍',
  found: '📍',
  clustering: '🗺',
  routing: '📐',
  validating: '✅',
  done: '🎉',
  error: '❌',
};

function stepColor(type: AgentStepType): string {
  if (type === 'done') return 'text-green-400';
  if (type === 'error') return 'text-red-400';
  return 'text-slate-300';
}

export default function PlannerAgent({ steps, isRunning }: PlannerAgentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  const isDone = steps.some((s) => s.type === 'done' || s.type === 'error');

  return (
    <div className="space-y-3">
      {/* Estimated time hint */}
      {isRunning && steps.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-400 text-center"
        >
          Usually takes 15–30 seconds…
        </motion.p>
      )}

      {/* Agent log terminal */}
      <div
        ref={scrollRef}
        className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-xs overflow-y-auto"
        style={{ minHeight: 160, maxHeight: 300 }}
      >
        {steps.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-500">
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-indigo-500 inline-block"
            />
            <span>Starting planning agent…</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const isCurrentStep = isRunning && isLast && !isDone;
              const isCompleted = !isLast || isDone;

              return (
                <motion.div
                  key={i}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-start gap-2.5 mb-2 leading-relaxed ${stepColor(step.type)}`}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
                    {isCompleted && !isCurrentStep ? (
                      <Check size={12} className={step.type === 'done' ? 'text-green-400' : step.type === 'error' ? 'text-red-400' : 'text-slate-500'} />
                    ) : isCurrentStep ? (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-indigo-400 block"
                      />
                    ) : (
                      <span className="text-xs">{ICON_MAP[step.type]}</span>
                    )}
                  </div>

                  <span className="break-all">{step.message}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
