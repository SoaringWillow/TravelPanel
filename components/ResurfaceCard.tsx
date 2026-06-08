'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ResurfaceSignal, dismissSignal } from '@/lib/resurfacing';
import { formatDistance } from '@/lib/geo';

interface Props {
  signal: ResurfaceSignal | null;
  onDismiss: () => void;
  onAction: (signal: ResurfaceSignal) => void;
}

function signalKey(s: ResurfaceSignal): string {
  switch (s.type) {
    case 'proximity':  return 'proximity';
    case 'inbox_pile': return 'inbox_pile';
    case 'plan_nudge': return 'plan_nudge';
    case 'rediscover': return 'rediscover';
  }
}

function SignalContent({ signal, onAction }: { signal: ResurfaceSignal; onAction: (s: ResurfaceSignal) => void }) {
  switch (signal.type) {
    case 'proximity':
      return (
        <button type="button" onClick={() => onAction(signal)} className="text-left flex-1">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-0.5">📍 You&apos;re nearby</p>
          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{signal.location.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDistance(signal.distKm)} away · from &quot;{signal.item.title}&quot;
          </p>
        </button>
      );

    case 'inbox_pile':
      return (
        <button type="button" onClick={() => onAction(signal)} className="text-left flex-1">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-0.5">📥 Inbox getting full</p>
          <p className="text-sm font-semibold text-gray-900">
            {signal.count} clips haven&apos;t been added to a board
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Tap to organise your inspiration →</p>
        </button>
      );

    case 'plan_nudge':
      return (
        <button type="button" onClick={() => onAction(signal)} className="text-left flex-1">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-0.5">🗺 Ready to plan?</p>
          <p className="text-sm font-semibold text-gray-900 line-clamp-1">
            {signal.board.emoji} {signal.board.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {signal.itemCount} places ready — tap to generate a trip plan
          </p>
        </button>
      );

    case 'rediscover':
      return (
        <button type="button" onClick={() => onAction(signal)} className="text-left flex-1">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-0.5">✨ Rediscover</p>
          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{signal.item.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">Saved {signal.daysAgo} days ago · tap to revisit</p>
        </button>
      );
  }
}

function cardColor(signal: ResurfaceSignal): string {
  switch (signal.type) {
    case 'proximity':  return 'bg-indigo-50 border-indigo-200';
    case 'inbox_pile': return 'bg-amber-50 border-amber-200';
    case 'plan_nudge': return 'bg-green-50 border-green-200';
    case 'rediscover': return 'bg-purple-50 border-purple-200';
  }
}

export default function ResurfaceCard({ signal, onDismiss, onAction }: Props) {
  if (!signal) return null;

  function handleDismiss() {
    dismissSignal(signalKey(signal!));
    onDismiss();
  }

  return (
    <AnimatePresence>
      <motion.div
        key={signal.type}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className={`mx-4 mt-2 rounded-2xl border px-3 py-3 flex items-start gap-2 shadow-sm ${cardColor(signal)}`}
      >
        <SignalContent signal={signal} onAction={onAction} />
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 mt-0.5"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
