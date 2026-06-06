'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MILESTONES = [10, 25, 50, 100, 250, 500];
const MILESTONE_KEY = 'shownMilestones';

function getShownMilestones(): Set<number> {
  try {
    const raw = localStorage.getItem(MILESTONE_KEY);
    return new Set(JSON.parse(raw ?? '[]') as number[]);
  } catch {
    return new Set();
  }
}

function markMilestoneShown(n: number): void {
  try {
    const shown = getShownMilestones();
    shown.add(n);
    localStorage.setItem(MILESTONE_KEY, JSON.stringify(Array.from(shown)));
  } catch {
    // ignore
  }
}

export function checkAndGetMilestone(clipCount: number): number | null {
  const shown = getShownMilestones();
  for (const m of MILESTONES) {
    if (clipCount >= m && !shown.has(m)) return m;
  }
  return null;
}

interface MilestoneCelebrationProps {
  milestone: number;
  onDone: () => void;
}

function Confetti() {
  const COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#f43f5e'];
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.4,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: p.rotation }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotation + 360 }}
          transition={{ duration: 1.8, delay: p.delay, ease: 'easeIn' }}
          className="absolute top-0 rounded-sm"
          style={{ width: p.size, height: p.size, backgroundColor: p.color, left: `${p.x}%` }}
        />
      ))}
    </div>
  );
}

export function MilestoneCelebration({ milestone, onDone }: MilestoneCelebrationProps) {
  useEffect(() => {
    markMilestoneShown(milestone);
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [milestone, onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onDone}
    >
      <div className="relative bg-white rounded-3xl p-8 text-center shadow-2xl max-w-xs w-full overflow-hidden">
        <Confetti />
        <div className="relative z-10">
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {milestone} places saved!
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            You&apos;re building an amazing travel collection. Keep exploring!
          </p>
          <button
            type="button"
            onClick={onDone}
            className="mt-5 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Keep clipping ✨
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function MilestoneProvider() {
  const [milestone, setMilestone] = useState<number | null>(null);

  const checkMilestone = useCallback(() => {
    try {
      const count = parseInt(localStorage.getItem('clipSaveCount') ?? '0', 10);
      const m = checkAndGetMilestone(count);
      if (m) setMilestone(m);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Listen for storage changes (clip saves from share page)
    const handler = (e: StorageEvent) => {
      if (e.key === 'clipSaveCount') checkMilestone();
    };
    window.addEventListener('storage', handler);
    checkMilestone();
    return () => window.removeEventListener('storage', handler);
  }, [checkMilestone]);

  return (
    <AnimatePresence>
      {milestone && (
        <MilestoneCelebration
          milestone={milestone}
          onDone={() => setMilestone(null)}
        />
      )}
    </AnimatePresence>
  );
}
