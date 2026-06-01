'use client';

import { motion } from 'framer-motion';

// ── Inbox empty illustration ──────────────────────────────────────────────────

function InboxEmptySvg() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone outline */}
      <rect x="30" y="10" width="60" height="80" rx="10" stroke="#6366f1" strokeWidth="2.5" fill="#eef2ff"/>
      {/* Screen */}
      <rect x="38" y="22" width="44" height="52" rx="5" fill="white" stroke="#c7d2fe" strokeWidth="1.5"/>
      {/* Share arrow */}
      <circle cx="60" cy="48" r="12" fill="#6366f1" fillOpacity="0.15" stroke="#6366f1" strokeWidth="2"/>
      <path d="M55 48 L60 43 L65 48" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="60" y1="43" x2="60" y2="55" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
      {/* Signal lines */}
      <path d="M40 66 L48 66" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M40 70 L55 70" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Home indicator */}
      <rect x="52" y="84" width="16" height="3" rx="1.5" fill="#a5b4fc"/>
    </svg>
  );
}

// ── Boards empty illustration ─────────────────────────────────────────────────

function BoardsEmptySvg() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back card */}
      <rect x="25" y="30" width="70" height="52" rx="10" fill="#e0e7ff" stroke="#a5b4fc" strokeWidth="1.5"/>
      {/* Middle card */}
      <rect x="18" y="22" width="70" height="52" rx="10" fill="#c7d2fe" stroke="#818cf8" strokeWidth="1.5"/>
      {/* Front card */}
      <rect x="12" y="14" width="70" height="52" rx="10" fill="white" stroke="#6366f1" strokeWidth="2"/>
      {/* Globe icon inside front card */}
      <circle cx="47" cy="40" r="16" stroke="#6366f1" strokeWidth="2" fill="#eef2ff"/>
      <ellipse cx="47" cy="40" rx="8" ry="16" stroke="#6366f1" strokeWidth="1.5" fill="none"/>
      <line x1="31" y1="40" x2="63" y2="40" stroke="#6366f1" strokeWidth="1.5"/>
      {/* Plus badge */}
      <circle cx="82" cy="14" r="14" fill="#6366f1"/>
      <line x1="82" y1="8" x2="82" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="76" y1="14" x2="88" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Plan no-locations illustration ────────────────────────────────────────────

function PlanEmptySvg() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Map background */}
      <rect x="10" y="15" width="100" height="70" rx="12" fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1.5"/>
      {/* Route dotted line */}
      <path d="M30 70 Q50 30 90 50" stroke="#6366f1" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" fill="none"/>
      {/* Pin A */}
      <circle cx="30" cy="70" r="6" fill="#6366f1"/>
      <circle cx="30" cy="70" r="3" fill="white"/>
      {/* Pin B (ghost) */}
      <circle cx="90" cy="50" r="6" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 2"/>
      <circle cx="90" cy="50" r="2.5" fill="#c7d2fe"/>
      {/* Label A */}
      <rect x="18" y="80" width="24" height="10" rx="5" fill="#6366f1"/>
      <text x="30" y="88" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">A</text>
      {/* Question mark at B */}
      <text x="90" y="40" textAnchor="middle" fill="#818cf8" fontSize="12" fontWeight="bold">?</text>
    </svg>
  );
}

// ── Search empty illustration ─────────────────────────────────────────────────

function SearchEmptySvg() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="52" cy="46" r="28" stroke="#6366f1" strokeWidth="2.5" fill="#eef2ff"/>
      <line x1="72" y1="66" x2="96" y2="90" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"/>
      <text x="44" y="52" textAnchor="middle" fill="#818cf8" fontSize="20">?</text>
    </svg>
  );
}

// ── Shared animation wrapper ──────────────────────────────────────────────────

interface EmptyStateProps {
  type: 'inbox' | 'boards' | 'plan' | 'search';
  headline: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ type, headline, description, action }: EmptyStateProps) {
  const Svg = {
    inbox:  InboxEmptySvg,
    boards: BoardsEmptySvg,
    plan:   PlanEmptySvg,
    search: SearchEmptySvg,
  }[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Svg />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="mt-5 space-y-2 max-w-xs"
      >
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">
          {headline}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </motion.div>

      {action && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25 }}
          whileTap={{ scale: 0.96 }}
          onClick={action.onClick}
          className="mt-5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {action.label}
        </motion.button>
      )}
    </div>
  );
}
