'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface EmptyMapStateProps {
  onClip: () => void;
  onTryDemo: () => void;
}

export default function EmptyMapState({ onClip, onTryDemo }: EmptyMapStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="absolute inset-0 z-[500] flex items-center justify-center px-6"
      style={{ pointerEvents: 'none' }}
    >
      {/* Blurred background card */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.4 }}
        className="bg-white/92 backdrop-blur-xl rounded-3xl shadow-2xl px-7 py-8 max-w-sm w-full text-center"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Animated globe illustration */}
        <div className="relative w-20 h-20 mx-auto mb-5">
          {/* Pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-indigo-200"
          />
          <div className="absolute inset-2 rounded-full bg-indigo-100 flex items-center justify-center text-4xl">
            🗺
          </div>
          {/* Floating location pins */}
          {[
            { emoji: '📍', top: -6, right: 0, delay: 0 },
            { emoji: '🍜', bottom: 0, left: -4, delay: 0.6 },
            { emoji: '✈️', top: 8, left: -10, delay: 1.2 },
          ].map(({ emoji, delay, ...pos }) => (
            <motion.div
              key={emoji}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay, ease: 'easeInOut' }}
              className="absolute text-base"
              style={pos}
            >
              {emoji}
            </motion.div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1.5 tracking-tight">
          Your travel map starts here
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Save travel posts from Instagram, YouTube, or any browser — and watch your map come alive.
        </p>

        {/* CTAs */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onClip}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Clip your first post
          </button>

          <button
            type="button"
            onClick={onTryDemo}
            className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-medium text-sm hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Try with demo boards
          </button>
        </div>

        {/* iOS hint */}
        <p className="text-xs text-gray-400 mt-4 leading-snug">
          On iOS: tap Share → TravelPanel to clip from any app
        </p>
      </motion.div>
    </motion.div>
  );
}
