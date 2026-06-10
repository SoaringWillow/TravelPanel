'use client';

import { ReactNode } from 'react';

// ─── Inline SVG illustrations ─────────────────────────────────────────────────

function CompassIllustration() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
      <circle cx="60" cy="60" r="44" fill="#eef2ff"/>
      <circle cx="60" cy="60" r="32" stroke="#c7d2fe" strokeWidth="2.5" fill="white"/>
      <circle cx="60" cy="60" r="32" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity=".3"/>
      {/* Compass needle N */}
      <path d="M60 38l-6 22h12L60 38z" fill="#4f46e5"/>
      {/* Compass needle S */}
      <path d="M60 82l6-22H54l6 22z" fill="#a5b4fc"/>
      <circle cx="60" cy="60" r="4" fill="white" stroke="#4f46e5" strokeWidth="2"/>
      {/* Cardinal labels */}
      <text x="57" y="34" fontSize="9" fontWeight="600" fill="#4f46e5">N</text>
      <text x="57" y="90" fontSize="9" fontWeight="600" fill="#a5b4fc">S</text>
      <text x="96" y="63" fontSize="9" fontWeight="600" fill="#a5b4fc">E</text>
      <text x="22" y="63" fontSize="9" fontWeight="600" fill="#a5b4fc">W</text>
    </svg>
  );
}

function InboxIllustration() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
      <circle cx="60" cy="60" r="44" fill="#ede9fe"/>
      <rect x="28" y="38" width="64" height="46" rx="7" fill="white" stroke="#7c3aed" strokeWidth="2.5"/>
      <path d="M28 58h20l8 9 8-9h20" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Lines suggesting email content */}
      <path d="M38 48h44M38 53h30" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/>
      {/* Little plus badge */}
      <circle cx="84" cy="38" r="12" fill="#7c3aed"/>
      <path d="M84 33v10M79 38h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function GridIllustration() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
      <circle cx="60" cy="60" r="44" fill="#ecfdf5"/>
      {/* 2×2 grid of cards */}
      <rect x="28" y="30" width="28" height="26" rx="5" fill="white" stroke="#059669" strokeWidth="2"/>
      <rect x="64" y="30" width="28" height="26" rx="5" fill="white" stroke="#059669" strokeWidth="2"/>
      <rect x="28" y="64" width="28" height="26" rx="5" fill="white" stroke="#059669" strokeWidth="2"/>
      <rect x="64" y="64" width="28" height="26" rx="5" fill="#d1fae5" stroke="#059669" strokeWidth="2" strokeDasharray="3 3"/>
      {/* Image placeholder in first 3 cards */}
      <rect x="31" y="33" width="22" height="12" rx="3" fill="#a7f3d0"/>
      <rect x="67" y="33" width="22" height="12" rx="3" fill="#a7f3d0"/>
      <rect x="31" y="67" width="22" height="12" rx="3" fill="#a7f3d0"/>
      {/* Plus in dashed card */}
      <path d="M78 72v10M73 77h10" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const ILLUSTRATIONS: Record<string, ReactNode> = {
  compass: <CompassIllustration />,
  inbox:   <InboxIllustration />,
  grid:    <GridIllustration />,
};

interface EmptyStateProps {
  illustration: 'compass' | 'inbox' | 'grid';
  headline: string;
  subtext: string;
  cta?: { label: string; onClick: () => void };
}

export function EmptyState({ illustration, headline, subtext, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-12 gap-4">
      <div className="mb-1">{ILLUSTRATIONS[illustration]}</div>
      <div className="space-y-1.5">
        <h3 className="font-bold text-gray-800 text-lg tracking-tight">{headline}</h3>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">{subtext}</p>
      </div>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
