'use client';

// ─── Primitive ────────────────────────────────────────────────────────────────

interface SkeletonBoxProps {
  className?: string;
}

export function SkeletonBox({ className = '' }: SkeletonBoxProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// ─── Card shimmer matching InboxCard shape ────────────────────────────────────

export function SkeletonCard() {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      aria-hidden="true"
    >
      {/* Thumbnail area */}
      <div className="w-full h-32 animate-pulse bg-gray-200" />
      <div className="p-4 space-y-3">
        {/* Platform badge */}
        <div className="animate-pulse bg-gray-200 rounded-full h-5 w-20" />
        {/* Title lines */}
        <div className="animate-pulse bg-gray-200 rounded-full h-3.5 w-4/5" />
        <div className="animate-pulse bg-gray-200 rounded-full h-3 w-3/5" />
        {/* Meta row */}
        <div className="flex items-center gap-3 pt-1">
          <div className="animate-pulse bg-gray-200 rounded-full h-3 w-16" />
          <div className="animate-pulse bg-gray-200 rounded-full h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// ─── List of N skeleton cards ─────────────────────────────────────────────────

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 6 }: SkeletonListProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ─── Board card shimmer ───────────────────────────────────────────────────────

export function SkeletonBoardCard() {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-40"
      aria-hidden="true"
    >
      <div className="w-full h-24 animate-pulse bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="animate-pulse bg-gray-200 rounded w-6 h-6" />
          <div className="animate-pulse bg-gray-200 rounded-full h-3.5 w-28" />
        </div>
        <div className="animate-pulse bg-gray-200 rounded-full h-3 w-16" />
      </div>
    </div>
  );
}

export function SkeletonBoardList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBoardCard key={i} />
      ))}
    </div>
  );
}
