'use client';

// Animated shimmer skeleton in the shape of a fully-enriched InboxCard.
// Used in inbox and boards list while the initial IndexedDB load completes.

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" role="status" aria-label="Loading clip" aria-busy="true">
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 shimmer" />

      <div className="p-4 space-y-3">
        {/* Platform badge */}
        <div className="h-5 w-20 shimmer rounded-full" />

        {/* Title — two lines */}
        <div className="space-y-1.5">
          <div className="h-3.5 shimmer rounded-full w-full" />
          <div className="h-3.5 shimmer rounded-full w-4/5" />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="h-3 shimmer rounded-full w-full" />
          <div className="h-3 shimmer rounded-full w-3/5" />
        </div>

        {/* Meta row: pins / tips */}
        <div className="flex gap-3 pt-1">
          <div className="h-3 w-8 shimmer rounded-full" />
          <div className="h-3 w-12 shimmer rounded-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="h-3 w-12 shimmer rounded-full" />
          <div className="flex gap-2">
            <div className="h-6 w-8 shimmer rounded-lg" />
            <div className="h-6 w-6 shimmer rounded-lg" />
            <div className="h-6 w-6 shimmer rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
