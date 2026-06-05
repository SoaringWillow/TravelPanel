'use client';

// Shimmer skeleton card — matches InboxCard proportions so content pop-in
// is seamless. Use in lists while IndexedDB is loading.

interface SkeletonCardProps {
  variant?: 'inbox' | 'board';
}

export default function SkeletonCard({ variant = 'inbox' }: SkeletonCardProps) {
  if (variant === 'board') {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm overflow-hidden">
        {/* Emoji + name */}
        <div className="skeleton-shimmer w-8 h-8 rounded-xl mb-3" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded-md mb-1.5" />
        <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Thumbnail strip */}
      <div className="skeleton-shimmer h-28 w-full" />

      <div className="p-3 space-y-2">
        {/* Platform badge */}
        <div className="skeleton-shimmer h-4 w-20 rounded-full" />

        {/* Title */}
        <div className="skeleton-shimmer h-4 w-full rounded-md" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />

        {/* Tags row */}
        <div className="flex gap-1.5 pt-1">
          <div className="skeleton-shimmer h-5 w-14 rounded-full" />
          <div className="skeleton-shimmer h-5 w-16 rounded-full" />
          <div className="skeleton-shimmer h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Convenience: render N skeleton cards in a grid
export function SkeletonGrid({ count = 6, variant = 'inbox' }: { count?: number; variant?: 'inbox' | 'board' }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}
