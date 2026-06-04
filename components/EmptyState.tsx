'use client';

interface EmptyStateProps {
  illustration: 'inbox' | 'map' | 'boards' | 'search' | 'plan';
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

const ILLUSTRATIONS: Record<EmptyStateProps['illustration'], React.ReactNode> = {
  inbox: (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <circle cx="48" cy="48" r="44" fill="#EEF2FF" />
      {/* Phone with share arrow */}
      <rect x="30" y="22" width="36" height="52" rx="6" fill="white" stroke="#C7D2FE" strokeWidth="2"/>
      <rect x="34" y="28" width="28" height="4" rx="2" fill="#E0E7FF"/>
      <rect x="34" y="36" width="20" height="3" rx="1.5" fill="#E0E7FF"/>
      <rect x="34" y="43" width="24" height="3" rx="1.5" fill="#E0E7FF"/>
      {/* Share arrow */}
      <circle cx="64" cy="66" r="14" fill="#6366f1"/>
      <path d="M60 66h8M64 62l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  map: (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <circle cx="48" cy="48" r="44" fill="#EEF2FF" />
      {/* Map outline */}
      <path d="M20 30L35 24L55 32L76 26V66L55 72L35 64L20 70V30Z" fill="white" stroke="#C7D2FE" strokeWidth="1.5"/>
      {/* Map lines */}
      <path d="M35 24V64M55 32V72" stroke="#E0E7FF" strokeWidth="1.5"/>
      {/* Pin */}
      <circle cx="48" cy="46" r="10" fill="#6366f1"/>
      <path d="M48 36c-5.52 0-10 4.48-10 10 0 7.5 10 18 10 18s10-10.5 10-18c0-5.52-4.48-10-10-10zm0 13.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="#6366f1"/>
    </svg>
  ),

  boards: (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <circle cx="48" cy="48" r="44" fill="#EEF2FF" />
      {/* Stack of boards */}
      <rect x="26" y="42" width="44" height="28" rx="6" fill="white" stroke="#C7D2FE" strokeWidth="1.5"/>
      <rect x="30" y="34" width="40" height="28" rx="6" fill="#F5F3FF" stroke="#C7D2FE" strokeWidth="1.5"/>
      <rect x="34" y="26" width="36" height="28" rx="6" fill="white" stroke="#C7D2FE" strokeWidth="1.5"/>
      {/* Plus */}
      <circle cx="66" cy="66" r="12" fill="#6366f1"/>
      <path d="M66 61v10M61 66h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  search: (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <circle cx="48" cy="48" r="44" fill="#EEF2FF" />
      {/* Magnifying glass */}
      <circle cx="44" cy="44" r="18" fill="white" stroke="#C7D2FE" strokeWidth="2.5"/>
      <line x1="57" y1="57" x2="70" y2="70" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Question mark inside glass */}
      <path d="M41 38.5c0-1.65 1.35-3 3-3s3 1.35 3 3c0 2-3 2.5-3 5" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="44" cy="47" r="1.2" fill="#C7D2FE"/>
    </svg>
  ),

  plan: (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <circle cx="48" cy="48" r="44" fill="#EEF2FF" />
      {/* Route line */}
      <path d="M24 68 Q36 52 48 56 Q60 60 72 44" stroke="#C7D2FE" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3"/>
      {/* Pin A */}
      <circle cx="24" cy="68" r="7" fill="white" stroke="#6366f1" strokeWidth="2"/>
      <circle cx="24" cy="68" r="3" fill="#6366f1"/>
      {/* Pin B */}
      <circle cx="72" cy="44" r="7" fill="#6366f1"/>
      <text x="72" y="48" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">B</text>
      {/* Calendar icon */}
      <rect x="38" y="26" width="20" height="18" rx="3" fill="white" stroke="#C7D2FE" strokeWidth="1.5"/>
      <line x1="38" y1="31" x2="58" y2="31" stroke="#C7D2FE" strokeWidth="1.5"/>
      <rect x="42" y="34" width="4" height="4" rx="1" fill="#6366f1"/>
      <rect x="50" y="34" width="4" height="4" rx="1" fill="#E0E7FF"/>
    </svg>
  ),
};

export function EmptyState({ illustration, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="mb-5 drop-shadow-sm">
        {ILLUSTRATIONS[illustration]}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">{subtitle}</p>
      {action}
    </div>
  );
}
