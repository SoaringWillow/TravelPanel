'use client';

import { motion } from 'framer-motion';

// ─── Illustrations ────────────────────────────────────────────────────────────

function InboxIllustration() {
  return (
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Phone body */}
      <rect x="38" y="14" width="52" height="84" rx="10" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2"/>
      {/* Screen */}
      <rect x="44" y="24" width="40" height="56" rx="5" fill="#E0E7FF"/>
      {/* Tiny content lines on screen */}
      <rect x="49" y="31" width="24" height="3" rx="1.5" fill="#A5B4FC"/>
      <rect x="49" y="38" width="18" height="2.5" rx="1.25" fill="#C7D2FE"/>
      <rect x="49" y="44" width="21" height="2.5" rx="1.25" fill="#C7D2FE"/>
      {/* Home indicator */}
      <rect x="56" y="90" width="16" height="3" rx="1.5" fill="#A5B4FC"/>

      {/* Floating share card (top right) */}
      <rect x="84" y="8" width="40" height="28" rx="7" fill="white" stroke="#E0E7FF" strokeWidth="1.5" filter="url(#shadow)"/>
      <rect x="89" y="14" width="18" height="3" rx="1.5" fill="#A5B4FC"/>
      <rect x="89" y="20" width="13" height="2.5" rx="1.25" fill="#E0E7FF"/>
      <circle cx="110" cy="20" r="5" fill="#6366F1" opacity="0.15"/>

      {/* Share arrow */}
      <path d="M76 48 Q88 38 86 22" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3"/>
      <path d="M85 19 L88 23 L84 24" fill="#6366F1"/>

      {/* Sparkle 1 */}
      <path d="M110 60 L111.2 64.4 L115.6 65.6 L111.2 66.8 L110 71.2 L108.8 66.8 L104.4 65.6 L108.8 64.4 Z" fill="#6366F1" opacity="0.5"/>
      {/* Sparkle 2 */}
      <path d="M22 40 L22.8 43.2 L26 44 L22.8 44.8 L22 48 L21.2 44.8 L18 44 L21.2 43.2 Z" fill="#A5B4FC"/>
      {/* Sparkle 3 */}
      <path d="M126 38 L126.6 40.4 L129 41 L126.6 41.6 L126 44 L125.4 41.6 L123 41 L125.4 40.4 Z" fill="#C7D2FE"/>

      {/* Platform chips floating */}
      <rect x="16" y="68" width="28" height="12" rx="6" fill="#FF2442" opacity="0.15"/>
      <rect x="16" y="68" width="28" height="12" rx="6" stroke="#FF2442" strokeWidth="1" opacity="0.4"/>
      <rect x="48" y="72" width="22" height="10" rx="5" fill="#FF0000" opacity="0.12"/>
      <rect x="48" y="72" width="22" height="10" rx="5" stroke="#FF0000" strokeWidth="1" opacity="0.35"/>

      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08"/>
        </filter>
      </defs>
    </svg>
  );
}

function BoardsIllustration() {
  return (
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Back card */}
      <rect x="18" y="30" width="72" height="56" rx="10" fill="#E0E7FF" stroke="#A5B4FC" strokeWidth="1.5" transform="rotate(-8 54 58)"/>
      {/* Middle card */}
      <rect x="26" y="26" width="72" height="56" rx="10" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" transform="rotate(3 62 54)"/>
      {/* Front card */}
      <rect x="34" y="24" width="72" height="56" rx="10" fill="white" stroke="#E0E7FF" strokeWidth="1.5"/>
      {/* Card content */}
      <rect x="42" y="34" width="48" height="22" rx="5" fill="#EEF2FF"/>
      {/* Map pin in card */}
      <circle cx="66" cy="43" r="7" fill="#6366F1" opacity="0.15"/>
      <path d="M66 38 C63 38 61 40 61 43 C61 47 66 52 66 52 C66 52 71 47 71 43 C71 40 69 38 66 38 Z" fill="#6366F1" opacity="0.6"/>
      <circle cx="66" cy="43" r="2.5" fill="white"/>
      {/* Title lines */}
      <rect x="42" y="60" width="32" height="4" rx="2" fill="#A5B4FC"/>
      <rect x="42" y="68" width="22" height="3" rx="1.5" fill="#E0E7FF"/>
      {/* Count badge */}
      <rect x="90" y="60" width="16" height="12" rx="6" fill="#6366F1"/>

      {/* Plus icon (new board hint) */}
      <circle cx="112" cy="88" r="12" fill="#6366F1"/>
      <path d="M112 83 L112 93 M107 88 L117 88" stroke="white" strokeWidth="2" strokeLinecap="round"/>

      {/* Sparkles */}
      <path d="M24 18 L25 21.4 L28.4 22.4 L25 23.4 L24 26.8 L23 23.4 L19.6 22.4 L23 21.4 Z" fill="#6366F1" opacity="0.4"/>
      <path d="M118 28 L118.8 30.8 L121.6 31.6 L118.8 32.4 L118 35.2 L117.2 32.4 L114.4 31.6 L117.2 30.8 Z" fill="#A5B4FC"/>
    </svg>
  );
}

function SearchIllustration() {
  return (
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Magnifying glass circle */}
      <circle cx="60" cy="54" r="34" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2.5"/>
      <circle cx="60" cy="54" r="26" fill="white"/>
      {/* Map pin inside */}
      <path d="M60 42 C55.6 42 52 45.6 52 50 C52 55.6 60 64 60 64 C60 64 68 55.6 68 50 C68 45.6 64.4 42 60 42 Z" fill="#6366F1" opacity="0.5"/>
      <circle cx="60" cy="50" r="3.5" fill="white"/>
      {/* Handle */}
      <path d="M82 76 L100 94" stroke="#6366F1" strokeWidth="4" strokeLinecap="round"/>
      {/* Question mark hint */}
      <text x="105" y="72" fontSize="14" fontWeight="700" fill="#E0E7FF" fontFamily="system-ui">?</text>
    </svg>
  );
}

function MapIllustration() {
  return (
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Globe */}
      <circle cx="70" cy="60" r="42" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2"/>
      <ellipse cx="70" cy="60" rx="21" ry="42" fill="none" stroke="#C7D2FE" strokeWidth="1.5"/>
      <path d="M28 60 Q50 50 70 60 Q90 70 112 60" stroke="#C7D2FE" strokeWidth="1.5" fill="none"/>
      <path d="M32 44 Q55 38 70 44 Q85 50 108 44" stroke="#C7D2FE" strokeWidth="1.2" fill="none"/>
      <path d="M32 76 Q55 70 70 76 Q85 82 108 76" stroke="#C7D2FE" strokeWidth="1.2" fill="none"/>
      {/* Pins */}
      <circle cx="52" cy="48" r="6" fill="#6366F1" opacity="0.2"/>
      <path d="M52 42 C49 42 47 44 47 47 C47 50.5 52 55 52 55 C52 55 57 50.5 57 47 C57 44 55 42 52 42 Z" fill="#6366F1" opacity="0.7"/>
      <circle cx="52" cy="47" r="2" fill="white"/>
      <circle cx="88" cy="64" r="6" fill="#22c55e" opacity="0.2"/>
      <path d="M88 58 C85 58 83 60 83 63 C83 66.5 88 71 88 71 C88 71 93 66.5 93 63 C93 60 91 58 88 58 Z" fill="#22c55e" opacity="0.7"/>
      <circle cx="88" cy="63" r="2" fill="white"/>
      {/* Sparkle */}
      <path d="M108 30 L109 33 L112 34 L109 35 L108 38 L107 35 L104 34 L107 33 Z" fill="#A5B4FC"/>
    </svg>
  );
}

// ─── Variant config ────────────────────────────────────────────────────────────

const ILLUSTRATIONS: Record<string, () => JSX.Element> = {
  inbox: InboxIllustration,
  boards: BoardsIllustration,
  search: SearchIllustration,
  map: MapIllustration,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  variant: 'inbox' | 'boards' | 'search' | 'map';
  title: string;
  body: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmptyState({ variant, title, body, action }: EmptyStateProps) {
  const Illustration = ILLUSTRATIONS[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center px-8 py-12 gap-4"
    >
      {/* Illustration */}
      <div className="w-36 h-28">
        {Illustration && <Illustration />}
      </div>

      {/* Text */}
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-base font-bold text-gray-900 leading-snug">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
      </div>

      {/* CTA */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.97] transition-all"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
