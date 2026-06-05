'use client';

import { motion } from 'framer-motion';

export function InboxEmptyIllustration() {
  return (
    <motion.svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Mailbox post */}
      <rect x="94" y="110" width="12" height="40" rx="3" fill="#e0e7ff" className="dark:fill-indigo-900" />

      {/* Mailbox base */}
      <rect x="55" y="72" width="90" height="50" rx="10" fill="#c7d2fe" className="dark:fill-indigo-800" />

      {/* Mailbox rounded top */}
      <ellipse cx="100" cy="72" rx="45" ry="14" fill="#a5b4fc" className="dark:fill-indigo-700" />

      {/* Mailbox door/slot */}
      <rect x="72" y="90" width="56" height="6" rx="3" fill="#818cf8" className="dark:fill-indigo-500" />

      {/* Mailbox flag */}
      <rect x="140" y="78" width="4" height="28" rx="2" fill="#6366f1" />
      <rect x="144" y="78" width="18" height="12" rx="2" fill="#4f46e5" />

      {/* Leaf coming out */}
      <motion.g
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '100px 68px' }}
      >
        <ellipse cx="100" cy="60" rx="6" ry="16" fill="#4ade80" className="dark:fill-green-400" transform="rotate(-20 100 60)" />
        <ellipse cx="112" cy="55" rx="5" ry="13" fill="#22c55e" className="dark:fill-green-500" transform="rotate(15 112 55)" />
        <line x1="100" y1="68" x2="100" y2="45" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>

      {/* Small decorative dots */}
      <circle cx="60" cy="55" r="4" fill="#e0e7ff" className="dark:fill-indigo-900" opacity="0.7" />
      <circle cx="145" cy="60" r="3" fill="#c7d2fe" className="dark:fill-indigo-800" opacity="0.6" />
      <circle cx="75" cy="45" r="2.5" fill="#a5b4fc" className="dark:fill-indigo-700" opacity="0.5" />
    </motion.svg>
  );
}

export function BoardsEmptyIllustration() {
  return (
    <motion.svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ rotate: [-3, 3, -3] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '100px 80px' }}
    >
      {/* Map background */}
      <rect x="30" y="30" width="140" height="100" rx="12" fill="#f1f5f9" className="dark:fill-gray-800" />
      <rect x="30" y="30" width="140" height="100" rx="12" stroke="#e0e7ff" className="dark:stroke-indigo-900" strokeWidth="2" />

      {/* Map lines (roads) */}
      <path d="M 60 80 Q 100 60 140 80" stroke="#c7d2fe" className="dark:stroke-indigo-800" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M 50 100 Q 100 120 150 100" stroke="#e0e7ff" className="dark:stroke-indigo-900" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="100" y1="40" x2="100" y2="120" stroke="#e2e8f0" className="dark:stroke-gray-700" strokeWidth="1.5" strokeDasharray="4 4" />

      {/* Compass rose */}
      <circle cx="100" cy="80" r="26" fill="white" className="dark:fill-gray-900" />
      <circle cx="100" cy="80" r="22" fill="white" className="dark:fill-gray-900" stroke="#e0e7ff" className="dark:stroke-indigo-900" strokeWidth="1.5" />

      {/* Compass needle - north (indigo) */}
      <polygon points="100,60 97,80 103,80" fill="#4f46e5" />
      {/* Compass needle - south (gray) */}
      <polygon points="100,100 97,80 103,80" fill="#94a3b8" className="dark:fill-gray-500" />

      {/* Compass N/S labels */}
      <text x="100" y="57" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#4f46e5" fontFamily="system-ui">N</text>
      <text x="100" y="111" textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="system-ui">S</text>
      <text x="74" y="84" textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="system-ui">W</text>
      <text x="126" y="84" textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="system-ui">E</text>

      {/* Center dot */}
      <circle cx="100" cy="80" r="3.5" fill="#6366f1" />

      {/* Decorative corner marks */}
      <circle cx="50" cy="50" r="4" fill="#c7d2fe" className="dark:fill-indigo-800" />
      <circle cx="150" cy="50" r="3" fill="#c7d2fe" className="dark:fill-indigo-800" />
      <circle cx="50" cy="110" r="3" fill="#c7d2fe" className="dark:fill-indigo-800" />
      <circle cx="150" cy="110" r="4" fill="#c7d2fe" className="dark:fill-indigo-800" />
    </motion.svg>
  );
}

export function PinDropIllustration() {
  return (
    <motion.svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Map surface */}
      <ellipse cx="100" cy="135" rx="65" ry="12" fill="#e0e7ff" className="dark:fill-indigo-900" opacity="0.5" />

      {/* Pin shadow */}
      <motion.ellipse
        cx="100"
        cy="130"
        rx="12"
        ry="4"
        fill="#6366f1"
        opacity="0.2"
        animate={{ scaleX: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pin dropping animation */}
      <motion.g
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Pin stem */}
        <line x1="100" y1="100" x2="100" y2="130" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />

        {/* Pin head circle */}
        <circle cx="100" cy="82" r="22" fill="#4f46e5" />
        <circle cx="100" cy="82" r="18" fill="#6366f1" />

        {/* Pin inner icon - location dot */}
        <circle cx="100" cy="82" r="7" fill="white" />
        <circle cx="100" cy="82" r="3.5" fill="#4f46e5" />

        {/* Shine */}
        <ellipse cx="93" cy="75" rx="5" ry="3" fill="white" opacity="0.3" transform="rotate(-30 93 75)" />
      </motion.g>

      {/* Ripple rings emanating from drop point */}
      <motion.circle
        cx="100"
        cy="130"
        r="0"
        stroke="#6366f1"
        strokeWidth="2"
        fill="none"
        animate={{ r: [0, 20, 40], opacity: [0.6, 0.3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
      />
      <motion.circle
        cx="100"
        cy="130"
        r="0"
        stroke="#818cf8"
        strokeWidth="1.5"
        fill="none"
        animate={{ r: [0, 30, 55], opacity: [0.4, 0.2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
      />
    </motion.svg>
  );
}
