'use client';

import React from 'react';

// ─── Illustrations ────────────────────────────────────────────────────────────

function MapIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Map background */}
      <rect x="10" y="25" width="100" height="75" rx="8" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
      {/* Map grid lines */}
      <line x1="10" y1="50" x2="110" y2="50" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="10" y1="70" x2="110" y2="70" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="40" y1="25" x2="40" y2="100" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="70" y1="25" x2="70" y2="100" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 3" />
      {/* Map paths (rivers/roads) */}
      <path d="M10 60 Q35 55 55 65 Q75 75 110 68" stroke="#A5B4FC" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Pin */}
      <ellipse cx="62" cy="97" rx="8" ry="2.5" fill="#A5B4FC" opacity="0.4" />
      <path d="M62 78 C56 78 51 83 51 89 C51 96 62 105 62 105 C62 105 73 96 73 89 C73 83 68 78 62 78Z" fill="#6366F1" />
      <circle cx="62" cy="89" r="4" fill="white" />
      {/* Dotted trail to pin */}
      <circle cx="30" cy="60" r="3" fill="#818CF8" opacity="0.7" />
      <circle cx="46" cy="64" r="3" fill="#818CF8" opacity="0.7" />
    </svg>
  );
}

function InboxIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone */}
      <rect x="35" y="15" width="50" height="80" rx="8" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
      <rect x="45" y="25" width="30" height="40" rx="4" fill="#C7D2FE" />
      {/* Play triangle (video) */}
      <polygon points="56,40 56,50 66,45" fill="#6366F1" />
      {/* Share arrow */}
      <path d="M55 72 L60 67 L65 72" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="60" y1="67" x2="60" y2="80" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
      {/* TravelPanel box (receiving) */}
      <rect x="12" y="75" width="36" height="26" rx="5" fill="#6366F1" />
      <path d="M20 88 L30 84 L40 88" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="30" cy="84" r="3" fill="white" />
      {/* Arrow from phone to box */}
      <path d="M48 82 L28 88" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" />
    </svg>
  );
}

function BoardsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Board cards stacked */}
      {/* Back card */}
      <rect x="25" y="30" width="55" height="68" rx="8" fill="#E0E7FF" stroke="#C7D2FE" strokeWidth="1.5" />
      {/* Front card */}
      <rect x="38" y="22" width="55" height="68" rx="8" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
      {/* Image placeholder on front */}
      <rect x="46" y="30" width="39" height="25" rx="4" fill="#C7D2FE" />
      {/* Mountain in image */}
      <polygon points="52,50 61,35 70,50" fill="#6366F1" opacity="0.7" />
      <polygon points="62,50 70,40 78,50" fill="#6366F1" opacity="0.5" />
      {/* Text lines */}
      <rect x="46" y="60" width="30" height="4" rx="2" fill="#C7D2FE" />
      <rect x="46" y="68" width="20" height="3" rx="1.5" fill="#E0E7FF" />
      {/* Plus badge */}
      <circle cx="85" cy="22" r="10" fill="#6366F1" />
      <path d="M85 17 L85 27 M80 22 L90 22" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIllustration() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="42" cy="42" r="26" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="2" />
      <circle cx="42" cy="42" r="16" fill="#C7D2FE" />
      <path d="M60 60 L76 76" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
      <path d="M42 34 Q48 38 44 44" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── Illustration registry ────────────────────────────────────────────────────

const ILLUSTRATIONS = {
  map:    MapIllustration,
  inbox:  InboxIllustration,
  boards: BoardsIllustration,
  search: SearchIllustration,
} as const;

type IllustrationType = keyof typeof ILLUSTRATIONS;

// ─── Component ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  illustration: IllustrationType;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  subtitle,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  const Illustration = ILLUSTRATIONS[illustration];

  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-10 ${className}`}>
      <div className="mb-5 opacity-90">
        <Illustration />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2 leading-snug">{title}</h3>
      {subtitle && (
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">{subtitle}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200 mb-3"
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="text-indigo-600 text-sm font-medium hover:text-indigo-700 transition-colors"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
