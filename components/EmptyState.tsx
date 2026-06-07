'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: string;
  title: string;
  body: string;
  /** Optional second line of body text */
  body2?: string;
  cta?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  cta2?: {
    label: string;
    onClick: () => void;
  };
  /** Gradient to apply behind the icon blob */
  gradient?: 'indigo' | 'violet' | 'rose' | 'amber' | 'emerald';
  className?: string;
}

const GRADIENTS: Record<string, string> = {
  indigo:  'from-indigo-400 to-indigo-600',
  violet:  'from-violet-400 to-purple-600',
  rose:    'from-rose-400 to-pink-600',
  amber:   'from-amber-400 to-orange-500',
  emerald: 'from-emerald-400 to-teal-600',
};

export default function EmptyState({
  icon,
  title,
  body,
  body2,
  cta,
  cta2,
  gradient = 'indigo',
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center text-center px-8 py-12 ${className}`}
    >
      {/* Icon blob */}
      <div
        className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${GRADIENTS[gradient]} flex items-center justify-center mb-5 shadow-lg shadow-indigo-200/60`}
      >
        <span className="text-4xl">{icon}</span>
      </div>

      {/* Text */}
      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{body}</p>
      {body2 && (
        <p className="text-sm text-gray-400 leading-relaxed max-w-xs mt-1">{body2}</p>
      )}

      {/* CTAs */}
      {(cta || cta2) && (
        <div className="flex flex-col gap-2 mt-6 w-full max-w-xs">
          {cta && (
            <button
              type="button"
              onClick={cta.onClick}
              className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                (cta.variant ?? 'primary') === 'primary'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {cta.label}
            </button>
          )}
          {cta2 && (
            <button
              type="button"
              onClick={cta2.onClick}
              className="w-full py-2.5 rounded-2xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {cta2.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
