'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, Sparkles, Clock, MapPin } from 'lucide-react';
import { SavedItem, Board } from '@/lib/types';
import {
  getDailyPick,
  getPlanReadyBoards,
  getDormantClips,
  isDailyDismissed,
  dismissDaily,
  isPlanDismissed,
  dismissPlan,
  PlanReadyBoard,
} from '@/lib/resurface';
import { PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Daily pick card ──────────────────────────────────────────────────────────

function DailyPickCard({
  item,
  onDismiss,
  onOpen,
}: {
  item: SavedItem;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const color = PLATFORM_COLORS[item.platform] ?? '#6366f1';
  const tip   = item.substance?.find((s) => s.type === 'tip' || s.type === 'wisdom');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl overflow-hidden shadow-sm"
    >
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={onDismiss}
          className="p-1 rounded-full bg-white/70 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>

      {item.thumbnail && (
        <img src={item.thumbnail} alt="" className="w-full h-28 object-cover opacity-60" />
      )}

      <div className="px-3.5 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles size={13} className="text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600">Today&rsquo;s pick</span>
        </div>

        <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{item.title}</p>

        {tip && (
          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-2 bg-white/60 rounded-lg px-2 py-1.5">
            💡 {tip.content}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2.5">
          {item.locations.length > 0 && (
            <span className="text-xs text-indigo-500 font-medium">
              📍 {item.locations[0].name}
            </span>
          )}
          <button
            onClick={onOpen}
            className="ml-auto bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Explore →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Plan-ready banner ────────────────────────────────────────────────────────

function PlanReadyBanner({
  group,
  onDismiss,
  onPlan,
}: {
  group: PlanReadyBoard;
  onDismiss: () => void;
  onPlan: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative bg-white border border-gray-100 rounded-2xl px-3.5 py-3 shadow-sm flex items-center gap-3"
    >
      <span className="text-2xl flex-shrink-0">{group.board.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {group.board.name} is ready to plan!
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {group.items.length} places with locations · Generate your itinerary
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onPlan}
          className="bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1"
        >
          <Rocket size={11} />
          Plan
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Dormant clips banner ─────────────────────────────────────────────────────

function DormantBanner({
  items,
  onDismiss,
  onOpen,
}: {
  items: SavedItem[];
  onDismiss: () => void;
  onOpen: (item: SavedItem) => void;
}) {
  const first = items[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative bg-amber-50 border border-amber-100 rounded-2xl px-3.5 py-3 shadow-sm"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full text-gray-300 hover:text-gray-500"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>

      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock size={12} className="text-amber-600" />
        <span className="text-xs font-semibold text-amber-700">Revisit your saves</span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mb-2">
        You have <strong>{items.length} clip{items.length !== 1 ? 's' : ''}</strong> saved
        over 2 weeks ago with travel wisdom you might have forgotten.
      </p>

      <button
        onClick={() => onOpen(first)}
        className="text-xs font-semibold text-amber-700 bg-white border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 active:scale-95 transition-all"
      >
        📍 {first.title.slice(0, 40)}{first.title.length > 40 ? '…' : ''}
      </button>
    </motion.div>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────────

interface Props {
  items: SavedItem[];
  boards: Board[];
  onItemOpen: (item: SavedItem) => void;
}

export default function ResurfaceSection({ items, boards, onItemOpen }: Props) {
  const router = useRouter();

  const [dailyPick,     setDailyPick]     = useState<SavedItem | null>(null);
  const [planReady,     setPlanReady]     = useState<PlanReadyBoard[]>([]);
  const [dormant,       setDormant]       = useState<SavedItem[]>([]);
  const [dismissed,     setDismissed]     = useState<Set<string>>(new Set());

  useEffect(() => {
    if (items.length === 0) return;

    if (!isDailyDismissed()) {
      setDailyPick(getDailyPick(items));
    }

    const ready = getPlanReadyBoards(boards, items).filter(
      ({ board }) => !isPlanDismissed(board.id)
    );
    setPlanReady(ready);

    setDormant(getDormantClips(items));
  }, [items, boards]);

  const handleDismissDaily = useCallback(() => {
    dismissDaily();
    setDailyPick(null);
  }, []);

  const handleDismissPlan = useCallback((boardId: string) => {
    dismissPlan(boardId);
    setPlanReady((prev) => prev.filter((g) => g.board.id !== boardId));
  }, []);

  const handleDismissDormant = useCallback(() => {
    setDormant([]);
  }, []);

  const hasAny = dailyPick || planReady.length > 0 || dormant.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-2 mb-2">
      <AnimatePresence>
        {dailyPick && (
          <DailyPickCard
            key="daily"
            item={dailyPick}
            onDismiss={handleDismissDaily}
            onOpen={() => {
              handleDismissDaily();
              onItemOpen(dailyPick);
            }}
          />
        )}

        {planReady.map((group) => (
          <PlanReadyBanner
            key={`plan-${group.board.id}`}
            group={group}
            onDismiss={() => handleDismissPlan(group.board.id)}
            onPlan={() => {
              handleDismissPlan(group.board.id);
              router.push(`/plan/${group.board.id}`);
            }}
          />
        ))}

        {dormant.length > 0 && (
          <DormantBanner
            key="dormant"
            items={dormant}
            onDismiss={handleDismissDormant}
            onOpen={(item) => {
              setDormant([]);
              onItemOpen(item);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
