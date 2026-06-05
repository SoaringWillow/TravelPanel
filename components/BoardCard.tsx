'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  substanceCount?: number;
  enrichmentProgress?: { enriched: number; total: number };
  onClick: () => void;
  onDelete?: () => void;
}

function EnrichmentRing({ enriched, total }: { enriched: number; total: number }) {
  const [showCheck, setShowCheck] = useState(false);
  const allDone = total > 0 && enriched === total;
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const dash = (enriched / total) * circumference;

  useEffect(() => {
    if (allDone) {
      setShowCheck(true);
      const t = setTimeout(() => setShowCheck(false), 2000);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  if (total === 0) return null;
  if (!allDone && enriched === total) return null; // already showed check

  const color = allDone ? '#22c55e' : '#818cf8'; // green-500 or indigo-400

  return (
    <svg width={24} height={24} viewBox="0 0 24 24" aria-label={`${enriched} of ${total} enriched`}>
      {/* Track */}
      <circle cx={12} cy={12} r={r} fill="none" stroke="#e5e7eb" strokeWidth={2.5} />
      {/* Progress arc */}
      <circle
        cx={12} cy={12} r={r}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      {showCheck && (
        <text x={12} y={16} textAnchor="middle" fontSize={10} fill="#22c55e">✓</text>
      )}
    </svg>
  );
}

export default function BoardCard({ board, itemCount, substanceCount = 0, enrichmentProgress, onClick, onDelete }: BoardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer min-h-[160px] flex flex-col hover:border-l-[3px] hover:border-l-indigo-500 transition-all duration-150"
      style={{ borderLeftWidth: undefined }}
    >
      {/* Cover thumbnail background */}
      {board.coverThumbnail && (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/80" />
        </>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji top-left */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Name */}
        <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-1 mb-1">
          {board.name}
        </h3>

        {/* Item count + wisdom count */}
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-400">
            {itemCount} place{itemCount !== 1 ? 's' : ''}
          </p>
          {substanceCount > 0 && (
            <span className="text-xs text-amber-500 font-medium">
              💡 {substanceCount}
            </span>
          )}
        </div>

        {/* Bottom-right: progress ring (if enriching) or delete button */}
        <div className="absolute bottom-3 right-3">
          {enrichmentProgress && enrichmentProgress.total > 0 && enrichmentProgress.enriched < enrichmentProgress.total ? (
            <EnrichmentRing enriched={enrichmentProgress.enriched} total={enrichmentProgress.total} />
          ) : onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete board"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
