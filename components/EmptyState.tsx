'use client';

// Reusable illustrated empty states.
// Each variant has a unique SVG, headline, body, and optional CTA.

interface EmptyStateProps {
  variant: 'inbox' | 'boards' | 'plan';
  onCta?: () => void;
}

export default function EmptyState({ variant, onCta }: EmptyStateProps) {
  const config = CONFIGS[variant];
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-10 select-none">
      <div className="mb-6">{config.illustration}</div>
      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1.5 leading-snug">
        {config.headline}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px]">
        {config.body}
      </p>
      {config.ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-none"
        >
          {config.ctaLabel}
        </button>
      )}
    </div>
  );
}

// ─── Illustrations ─────────────────────────────────────────────────────────────

function InboxIllustration() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Phone outline */}
      <rect x="30" y="8" width="80" height="104" rx="12" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="2"/>
      {/* Screen area */}
      <rect x="38" y="20" width="64" height="72" rx="6" fill="white"/>
      {/* Content lines (posts) */}
      <rect x="46" y="28" width="48" height="6" rx="3" fill="#E0E7FF"/>
      <rect x="46" y="38" width="36" height="4" rx="2" fill="#C7D2FE"/>
      {/* Share arrow coming from phone */}
      <path d="M98 56 L118 46" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M118 46 L113 41 M118 46 L113 51" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Destination inbox box */}
      <rect x="102" y="68" width="28" height="20" rx="5" fill="#6366F1"/>
      <path d="M102 76 L116 83 L130 76" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Pin on map area inside phone */}
      <circle cx="70" cy="58" r="8" fill="#EEF2FF" stroke="#A5B4FC" strokeWidth="1.5"/>
      <circle cx="70" cy="56" r="3" fill="#6366F1"/>
      <path d="M70 59 L70 65" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Plus badge */}
      <circle cx="110" cy="28" r="10" fill="#6366F1"/>
      <path d="M106 28 H114 M110 24 V32" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function BoardsIllustration() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Back card */}
      <rect x="48" y="24" width="70" height="56" rx="10" fill="#C7D2FE" stroke="#A5B4FC" strokeWidth="1.5"/>
      {/* Middle card */}
      <rect x="36" y="34" width="70" height="56" rx="10" fill="#E0E7FF" stroke="#C7D2FE" strokeWidth="1.5"/>
      {/* Front card */}
      <rect x="24" y="44" width="70" height="56" rx="10" fill="white" stroke="#DDD6FE" strokeWidth="1.5"/>
      {/* Card contents */}
      <rect x="34" y="56" width="40" height="5" rx="2.5" fill="#E0E7FF"/>
      <rect x="34" y="65" width="28" height="4" rx="2" fill="#C7D2FE"/>
      <rect x="34" y="73" width="34" height="4" rx="2" fill="#C7D2FE"/>
      {/* Emoji on card */}
      <text x="76" y="62" fontSize="16" textAnchor="middle">🗺</text>
      {/* Plus button */}
      <circle cx="112" cy="28" r="12" fill="#6366F1"/>
      <path d="M107 28 H117 M112 23 V33" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function PlanIllustration() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Map background */}
      <rect x="14" y="14" width="112" height="80" rx="12" fill="#EEF2FF"/>
      {/* Road lines */}
      <path d="M30 70 Q50 40 80 50 Q100 57 110 42" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Pin A */}
      <circle cx="30" cy="70" r="8" fill="#6366F1"/>
      <circle cx="30" cy="68" r="3" fill="white"/>
      <path d="M30 71 L30 77" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Pin B */}
      <circle cx="80" cy="50" r="8" fill="#8B5CF6"/>
      <circle cx="80" cy="48" r="3" fill="white"/>
      <path d="M80 51 L80 57" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Pin C */}
      <circle cx="110" cy="42" r="8" fill="#06B6D4"/>
      <circle cx="110" cy="40" r="3" fill="white"/>
      <path d="M110 43 L110 49" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Day labels */}
      <rect x="20" y="82" width="28" height="8" rx="4" fill="#6366F1"/>
      <text x="34" y="89" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold">Day 1</text>
      <rect x="54" y="82" width="28" height="8" rx="4" fill="#8B5CF6"/>
      <text x="68" y="89" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold">Day 2</text>
      <rect x="88" y="82" width="28" height="8" rx="4" fill="#06B6D4"/>
      <text x="102" y="89" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold">Day 3</text>
      {/* Sparkle / AI glow */}
      <path d="M68 10 L70 4 L72 10 L78 12 L72 14 L70 20 L68 14 L62 12 Z" fill="#6366F1" opacity="0.7"/>
    </svg>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIGS = {
  inbox: {
    illustration: <InboxIllustration />,
    headline: 'Your inspiration is empty',
    body: 'Share links from Instagram, Xiaohongshu, or YouTube using the Share Sheet.',
    ctaLabel: 'Add your first clip',
  },
  boards: {
    illustration: <BoardsIllustration />,
    headline: 'No collections yet',
    body: 'Create a board to organise your saved places — one per destination or trip idea.',
    ctaLabel: 'Create a board',
  },
  plan: {
    illustration: <PlanIllustration />,
    headline: 'Plan your trip with AI',
    body: 'Claude will build a day-by-day itinerary from your saved places, with tips from your clips.',
    ctaLabel: undefined,
  },
} as const;
