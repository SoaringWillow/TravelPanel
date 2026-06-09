'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ emoji, title, subtitle, action, secondaryAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center px-8 py-16"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-950 dark:to-violet-900 flex items-center justify-center shadow-inner">
          <span className="text-5xl" role="img" aria-hidden="true">
            {emoji}
          </span>
        </div>
        {/* Decorative dots */}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-700 opacity-60" />
        <span className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-violet-200 dark:bg-violet-700 opacity-50" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mb-6">
        {subtitle}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all text-sm"
        >
          {action.label}
        </button>
      )}

      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="mt-3 text-sm text-gray-400 dark:text-gray-500 hover:text-indigo-500 transition-colors"
        >
          {secondaryAction.label}
        </button>
      )}
    </motion.div>
  );
}
