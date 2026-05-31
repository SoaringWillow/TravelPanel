'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentStep, AgentStepType } from '@/lib/types';

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
  thinking: '💭',
  done: '🎉',
  error: '❌',
};

function stepColor(type: AgentStepType): string {
  if (type === 'done')     return 'text-green-400';
  if (type === 'error')    return 'text-red-400';
  if (type === 'thinking') return 'text-slate-500 italic';
  return 'text-slate-300';
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
      style={{ minHeight: 160, maxHeight: 300 }}
    >
      {steps.length === 0 ? (
        <span className="text-slate-600">Waiting for agent…</span>
      ) : (
        <AnimatePresence initial={false}>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0 }}
              className={`flex items-start gap-2 mb-1 leading-relaxed ${stepColor(step.type)} ${step.type === 'thinking' ? 'pl-4 text-[10px]' : ''}`}
            >
              <span className="flex-shrink-0">{ICON_MAP[step.type]}</span>
              <span className="break-all">{step.message}</span>
              {isRunning && i === steps.length - 1 && step.type !== 'thinking' && (
                <span className="flex-shrink-0 ml-1 mt-0.5 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
